from __future__ import annotations

import json
import re
from typing import Any

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

from app.core.dependencies import get_current_user
from app.models.user import User


router = APIRouter(prefix="/resume", tags=["Resume AI"])

OLLAMA_URL = "http://127.0.0.1:11434/api/chat"
OLLAMA_MODEL = "qwen3:4b"
MAX_PDF_BYTES = 12 * 1024 * 1024
MAX_TEXT_CHARS = 60000


class ResumeProfileExtraction(BaseModel):
    phone: str | None = None
    degree: str | None = None
    department: str | None = None
    graduation_year: int | None = Field(default=None, ge=2000, le=2100)
    cgpa: float | None = Field(default=None, ge=0, le=10)
    skills: str | None = None
    projects: str | None = None
    experience: str | None = None
    certifications: str | None = None
    linkedin: str | None = None
    github: str | None = None
    preferred_roles: str | None = None
    preferred_locations: str | None = None
    career_objective: str | None = None


# ------------------------------
# PDF extraction
# ------------------------------

def _extract_with_pymupdf(raw: bytes) -> str:
    import fitz  # PyMuPDF

    document = fitz.open(stream=raw, filetype="pdf")
    pages: list[str] = []
    try:
        for page in document:
            text = page.get_text("text", sort=True) or ""
            pages.append(text.strip())
    finally:
        document.close()
    return "\n\n".join(page for page in pages if page).strip()


def _extract_with_pdfplumber(raw: bytes) -> str:
    import io
    import pdfplumber

    pages: list[str] = []
    with pdfplumber.open(io.BytesIO(raw)) as pdf:
        for page in pdf.pages:
            text = page.extract_text(x_tolerance=2, y_tolerance=3, layout=True) or ""
            pages.append(text.strip())
    return "\n\n".join(page for page in pages if page).strip()


def _extract_with_pypdf(raw: bytes) -> str:
    import io
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(raw))
    pages = [(page.extract_text() or "").strip() for page in reader.pages]
    return "\n\n".join(page for page in pages if page).strip()


def _clean_text(text: str) -> str:
    text = text.replace("\x00", " ")
    text = text.replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()[:MAX_TEXT_CHARS]


def extract_pdf_text(raw: bytes) -> tuple[str, str, list[str]]:
    candidates: list[tuple[str, str]] = []
    warnings: list[str] = []

    for method, fn in (
        ("PyMuPDF", _extract_with_pymupdf),
        ("pdfplumber", _extract_with_pdfplumber),
        ("pypdf", _extract_with_pypdf),
    ):
        try:
            value = _clean_text(fn(raw))
            if value:
                candidates.append((method, value))
        except Exception as exc:
            warnings.append(f"{method} extractor unavailable: {exc}")

    if not candidates:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "CampusLink could not extract readable text from this PDF. "
                "Make sure it is a text-based PDF, not a blank/scanned-only document."
            ),
        )

    # Score candidates for real resume-like text. Prefer more useful text,
    # but penalize almost-empty/garbled output.
    def score(item: tuple[str, str]) -> tuple[int, int]:
        _, value = item
        alpha = len(re.findall(r"[A-Za-z]{2,}", value))
        lines = len([line for line in value.splitlines() if line.strip()])
        return (alpha, lines)

    method, text = max(candidates, key=score)

    if len(text) < 120:
        # Try combining methods when the best single extractor is suspiciously small.
        merged = []
        seen = set()
        for candidate_method, candidate_text in candidates:
            key = re.sub(r"\W+", " ", candidate_text.lower()).strip()
            if key and key not in seen:
                merged.append(candidate_text)
                seen.add(key)
        combined = _clean_text("\n\n".join(merged))
        if len(combined) > len(text):
            method = " + ".join(candidate_method for candidate_method, _ in candidates)
            text = combined

    if len(text) < 80:
        warnings.append(
            "Only a small amount of text was extracted. This may be a scanned/image-only PDF."
        )

    return text, method, warnings


# ------------------------------
# Deterministic extraction helpers
# ------------------------------

SECTION_ALIASES = {
    "education": {"education", "academic background", "academic qualifications", "qualifications"},
    "skills": {"skills", "technical skills", "core skills", "technologies", "technical expertise"},
    "projects": {"projects", "academic projects", "personal projects", "key projects"},
    "experience": {"experience", "work experience", "professional experience", "internship", "internships"},
    "certifications": {"certifications", "certificates", "licenses & certifications"},
    "summary": {"summary", "profile", "career objective", "objective", "professional summary"},
}


def _normal_heading(value: str) -> str:
    value = re.sub(r"[^a-zA-Z& ]+", " ", value).strip().lower()
    value = re.sub(r"\s+", " ", value)
    return value


def split_sections(text: str) -> dict[str, str]:
    lines = [line.strip() for line in text.splitlines()]
    sections: dict[str, list[str]] = {key: [] for key in SECTION_ALIASES}
    current: str | None = None

    for raw in lines:
        if not raw:
            continue
        normalized = _normal_heading(raw)
        heading = next(
            (key for key, aliases in SECTION_ALIASES.items() if normalized in aliases),
            None,
        )
        if heading:
            current = heading
            continue

        if current:
            sections[current].append(raw)

    return {key: "\n".join(value).strip() for key, value in sections.items()}


def first_match(patterns: list[str], text: str, flags: int = re.I) -> str | None:
    for pattern in patterns:
        match = re.search(pattern, text, flags)
        if match:
            return match.group(1).strip()
    return None


def deterministic_extract(text: str) -> dict[str, Any]:
    sections = split_sections(text)
    education = sections.get("education", "")

    phone = first_match(
        [
            r"(?:phone|mobile|contact|tel|telephone)\s*[:|\-]?\s*(\+?\d[\d\s().-]{8,}\d)",
            r"(?<!\d)(\+?91[\s-]?[6-9]\d{9}|[6-9]\d{9})(?!\d)",
        ],
        text,
    )
    if phone:
        phone = re.sub(r"[^+\d]", "", phone)

    linkedin = first_match([r"(https?://(?:www\.)?linkedin\.com/[^\s|,)]+)"], text)
    github = first_match([r"(https?://(?:www\.)?github\.com/[^\s|,)]+)"], text)

    cgpa_raw = first_match(
        [
            r"(?:cgpa|cpi|gpa)\s*[:\-]?\s*(\d(?:\.\d{1,2})?)",
            r"(\d(?:\.\d{1,2})?)\s*/\s*10\s*(?:cgpa|gpa|cpi)",
        ],
        text,
    )
    cgpa = float(cgpa_raw) if cgpa_raw else None
    if cgpa is not None and not 0 <= cgpa <= 10:
        cgpa = None

    year_raw = first_match(
        [
            r"(?:graduat(?:e|ion)|passing|pass(?:ed)?\s*out|batch|class\s*of)\D{0,18}(20\d{2})",
            r"\b(20\d{2})\b",
        ],
        text,
    )
    graduation_year = int(year_raw) if year_raw else None
    if graduation_year is not None and not 2000 <= graduation_year <= 2100:
        graduation_year = None

    degree = None
    department = None
    if education:
        degree = first_match(
            [
                r"\b(B\.?Tech(?:nology)?|B\.?E\.?|M\.?Tech(?:nology)?|M\.?E\.?|BCA|MCA|B\.?Sc|M\.?Sc|MBA|BBA|Ph\.?D)\b[^\n|]{0,120}",
                r"\b((?:Bachelor|Master|Doctor)\s+of\s+[^\n|]{3,100})",
            ],
            education,
        )
        department = first_match(
            [
                r"(?:department|branch|speciali[sz]ation|major)\s*[:\-]?\s*([^\n|]{2,120})",
            ],
            education,
        )

    skills = sections.get("skills", "")
    projects = sections.get("projects", "")
    experience = sections.get("experience", "")
    certifications = sections.get("certifications", "")
    summary = sections.get("summary", "")

    return {
        "phone": phone,
        "degree": degree,
        "department": department,
        "graduation_year": graduation_year,
        "cgpa": cgpa,
        "skills": skills or None,
        "projects": projects or None,
        "experience": experience or None,
        "certifications": certifications or None,
        "linkedin": linkedin,
        "github": github,
        "preferred_roles": None,
        "preferred_locations": None,
        "career_objective": summary or None,
    }


# ------------------------------
# Qwen structured extraction
# ------------------------------

QWEN_SCHEMA = {
    "type": "object",
    "properties": {
        "phone": {"type": ["string", "null"]},
        "degree": {"type": ["string", "null"]},
        "department": {"type": ["string", "null"]},
        "graduation_year": {"type": ["integer", "null"]},
        "cgpa": {"type": ["number", "null"]},
        "skills": {"type": ["string", "null"]},
        "projects": {"type": ["string", "null"]},
        "experience": {"type": ["string", "null"]},
        "certifications": {"type": ["string", "null"]},
        "linkedin": {"type": ["string", "null"]},
        "github": {"type": ["string", "null"]},
        "preferred_roles": {"type": ["string", "null"]},
        "preferred_locations": {"type": ["string", "null"]},
        "career_objective": {"type": ["string", "null"]},
    },
    "required": [
        "phone", "degree", "department", "graduation_year", "cgpa",
        "skills", "projects", "experience", "certifications", "linkedin",
        "github", "preferred_roles", "preferred_locations", "career_objective",
    ],
    "additionalProperties": False,
}


def _clean_model_value(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, str):
        value = re.sub(r"\s+", " ", value).strip()
        return value or None
    return value


async def qwen_extract(text: str) -> tuple[dict[str, Any] | None, str | None]:
    prompt = f"""
You are extracting a college student's resume into a profile database.
Use ONLY facts explicitly present in the resume text below.
Do not infer missing information.
Do not invent skills, projects, jobs, CGPA, dates, roles, or locations.
For a missing field, return null.
Keep project and experience details faithful to the source. Preserve multiple items.
For skills, keep the actual skill names from the resume, separated by commas.
For preferred_roles and preferred_locations, only fill them when the resume explicitly states a target/preferred role or location.
For career_objective, use the explicit objective/summary/profile statement; do not write a new one.

RESUME TEXT:
{text}
""".strip()

    payload = {
        "model": OLLAMA_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
        "think": False,
        "format": QWEN_SCHEMA,
        "options": {"temperature": 0},
    }

    try:
        async with httpx.AsyncClient(timeout=75) as client:
            response = await client.post(OLLAMA_URL, json=payload)
        response.raise_for_status()
        body = response.json()
        content = body.get("message", {}).get("content")
        if not content:
            return None, "Qwen returned an empty structured response."
        data = json.loads(content)
        validated = ResumeProfileExtraction.model_validate(data)
        return validated.model_dump(), None
    except Exception as exc:
        return None, f"Qwen extraction unavailable: {exc}"


@router.post("/extract-profile")
async def extract_profile(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    del current_user  # authentication/authorization is intentionally required

    filename = file.filename or "resume.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF resume.")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="The uploaded resume is empty.")
    if len(raw) > MAX_PDF_BYTES:
        raise HTTPException(status_code=413, detail="Resume must be smaller than 12 MB.")
    if not raw.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="The uploaded file is not a valid PDF.")

    text, extraction_method, warnings = extract_pdf_text(raw)
    deterministic = deterministic_extract(text)
    model_data, model_warning = await qwen_extract(text)
    if model_warning:
        warnings.append(model_warning)

    # Model values fill semantic sections; explicit regex extraction wins for
    # contact/link/CGPA/year fields because those are safer to preserve verbatim.
    result = {**deterministic}
    if model_data:
        for field in result:
            if model_data.get(field) not in (None, ""):
                result[field] = model_data[field]

        for field in ("phone", "linkedin", "github", "cgpa", "graduation_year"):
            if deterministic.get(field) not in (None, ""):
                result[field] = deterministic[field]

    if result.get("skills"):
        result["skills"] = re.sub(r"\s*\n\s*", ", ", str(result["skills"]))

    if result.get("preferred_roles") and result["preferred_roles"] == result.get("degree"):
        result["preferred_roles"] = None

    if result.get("preferred_locations") and len(str(result["preferred_locations"])) > 250:
        result["preferred_locations"] = None

    confidence = "high" if len(text) >= 1200 else "medium" if len(text) >= 300 else "low"

    return {
        **result,
        "resume_text": text,
        "extracted_text": text,  # backwards compatibility with the old frontend
        "filename": filename,
        "characters_extracted": len(text),
        "pages_text_quality": confidence,
        "extraction_method": extraction_method,
        "ai_used": bool(model_data),
        "warnings": warnings,
        "message": (
            f"Read {len(text):,} characters from {filename} using {extraction_method}. "
            + ("Qwen mapped the resume into profile fields." if model_data else "Rule-based extraction filled the safely detectable fields.")
        ),
    }
