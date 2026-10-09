import re
from typing import Iterable


def normalize_text(text: str | None) -> str:
    """
    Normalize text for NLP processing.

    - Handles None safely
    - Converts to lowercase
    - Removes excessive whitespace
    - Keeps useful punctuation inside technical terms
    """

    if not text:
        return ""

    text = text.lower()

    # Normalize common separators.
    text = text.replace("\n", " ")
    text = text.replace("\r", " ")
    text = text.replace("\t", " ")

    # Keep letters, numbers, common programming symbols,
    # #, +, ., -, / and spaces.
    text = re.sub(
        r"[^a-z0-9+#./\-\s]",
        " ",
        text,
    )

    # Collapse repeated whitespace.
    text = re.sub(
        r"\s+",
        " ",
        text,
    )

    return text.strip()


def tokenize(text: str | None) -> list[str]:
    """
    Convert normalized text into simple tokens.
    """

    normalized = normalize_text(text)

    if not normalized:
        return []

    return normalized.split()


def extract_skills(
    text: str | None,
    skill_dictionary: Iterable[str],
) -> list[str]:
    """
    Find known skills inside a text document.

    Matching is case-insensitive and returns unique
    skills in sorted order.
    """

    normalized = normalize_text(text)

    if not normalized:
        return []

    found_skills: set[str] = set()

    for skill in skill_dictionary:
        normalized_skill = normalize_text(skill)

        if not normalized_skill:
            continue

        # Escape the skill so symbols like + and # are safe.
        pattern = re.escape(normalized_skill)

        if re.search(
            rf"(?<!\w){pattern}(?!\w)",
            normalized,
        ):
            found_skills.add(normalized_skill)

    return sorted(found_skills)


def calculate_skill_overlap(
    candidate_skills: Iterable[str],
    required_skills: Iterable[str],
) -> dict:
    """
    Calculate skill overlap between a candidate and a job.

    Returns:
        matched_skills
        missing_skills
        match_percentage
    """

    candidate = {
        normalize_text(skill)
        for skill in candidate_skills
        if normalize_text(skill)
    }

    required = {
        normalize_text(skill)
        for skill in required_skills
        if normalize_text(skill)
    }

    if not required:
        return {
            "matched_skills": [],
            "missing_skills": [],
            "match_percentage": 0.0,
        }

    matched = sorted(
        candidate.intersection(required)
    )

    missing = sorted(
        required.difference(candidate)
    )

    percentage = (
        len(matched) / len(required)
    ) * 100

    return {
        "matched_skills": matched,
        "missing_skills": missing,
        "match_percentage": round(
            percentage,
            2,
        ),
    }