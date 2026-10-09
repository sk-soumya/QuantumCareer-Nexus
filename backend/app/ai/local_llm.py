"""Free local LLM helper for CampusLink Member 4 AI modules.

Uses Ollama locally (default: qwen3:4b), so no paid API key is required.
"""
from __future__ import annotations

import json
import os
import re
from typing import Any, Type, TypeVar

import httpx
from dotenv import load_dotenv
from pydantic import BaseModel, ValidationError

load_dotenv()

T = TypeVar("T", bound=BaseModel)

OLLAMA_BASE_URL = os.getenv(
    "OLLAMA_BASE_URL",
    "http://127.0.0.1:11434",
).rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3:4b")
OLLAMA_TIMEOUT = float(os.getenv("OLLAMA_TIMEOUT", "180"))


def _extract_json_object(text: str) -> Any:
    """Extract the first valid JSON object from model output."""
    cleaned = (text or "").strip()

    # Remove fenced code blocks first.
    cleaned = re.sub(
        r"^```(?:json)?\s*|\s*```$",
        "",
        cleaned,
        flags=re.IGNORECASE,
    ).strip()

    decoder = json.JSONDecoder()

    # Fast path: model returned pure JSON.
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Robust path: find the first valid JSON object.
    for match in re.finditer(r"\{", cleaned):
        try:
            value, _ = decoder.raw_decode(cleaned[match.start():])
            return value
        except json.JSONDecodeError:
            continue

    raise ValueError("Local Qwen response did not contain valid JSON.")


def ollama_chat(
    messages: list[dict[str, str]],
    *,
    temperature: float = 0.2,
    response_format: dict[str, Any] | str | None = None,
) -> str:
    """Call Ollama's /api/chat endpoint and return message content."""
    payload: dict[str, Any] = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": {"temperature": temperature},
    }
    if response_format is not None:
        payload["format"] = response_format

    try:
        response = httpx.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json=payload,
            timeout=OLLAMA_TIMEOUT,
        )
        response.raise_for_status()
    except httpx.ConnectError as exc:
        raise RuntimeError(
            f"Cannot reach Ollama at {OLLAMA_BASE_URL}. "
            f"Start Ollama and make sure model '{OLLAMA_MODEL}' is installed."
        ) from exc
    except httpx.HTTPError as exc:
        detail = getattr(exc.response, "text", "") if exc.response else ""
        raise RuntimeError(
            f"Ollama request failed: {detail or str(exc)}"
        ) from exc

    data = response.json()
    content = (
        data.get("message", {}).get("content")
        if isinstance(data, dict)
        else None
    )

    if not content:
        raise RuntimeError("Ollama returned an empty model response.")

    return str(content)


def invoke_structured(
    model: Type[T],
    prompt: str,
    *,
    temperature: float = 0.2,
) -> T:
    """Ask the local model for JSON matching a Pydantic schema."""
    schema = model.model_json_schema()

    try:
        raw = ollama_chat(
            [
                {
                    "role": "system",
                    "content": (
                        "Return only valid JSON matching the provided schema. "
                        "Do not add markdown, explanations, or extra keys."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=temperature,
            response_format=schema,
        )
        payload = _extract_json_object(raw)
        return model.model_validate(payload)
    except (ValueError, ValidationError, RuntimeError) as first_error:
        # One recovery attempt without schema formatting. Qwen can occasionally
        # wrap JSON in prose even when a schema was supplied.
        recovery_prompt = (
            f"{prompt}\n\n"
            "IMPORTANT: Respond with ONLY one JSON object. "
            f"The required JSON schema is:\n{json.dumps(schema, indent=2)}"
        )
        raw = ollama_chat(
            [{"role": "user", "content": recovery_prompt}],
            temperature=temperature,
        )
        try:
            payload = _extract_json_object(raw)
            return model.model_validate(payload)
        except Exception as second_error:
            raise RuntimeError(
                "Local Qwen could not produce valid structured output: "
                f"{second_error}"
            ) from first_error


def invoke_text(
    prompt: str,
    *,
    temperature: float = 0.2,
) -> str:
    """Plain text local-Qwen generation helper."""
    return ollama_chat(
        [{"role": "user", "content": prompt}],
        temperature=temperature,
    )
