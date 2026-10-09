from typing import Iterable

from app.ai.embeddings import calculate_semantic_similarity
from app.ai.text_processor import calculate_skill_overlap


# ============================================================
# DEFAULT WEIGHTS
# ============================================================

SKILL_WEIGHT = 0.50
SEMANTIC_WEIGHT = 0.40
CGPA_WEIGHT = 0.10


def calculate_cgpa_score(
    candidate_cgpa: float,
    minimum_cgpa: float | None,
) -> float:
    """
    Convert CGPA eligibility into a score.

    Rules:
    - If the job has no minimum CGPA, give full CGPA score.
    - If candidate does not satisfy minimum CGPA, return 0.
    - Otherwise return a normalized score up to 100.
    """

    if minimum_cgpa is None:
        return 100.0

    if candidate_cgpa < minimum_cgpa:
        return 0.0

    if candidate_cgpa <= 10.0:
        return 100.0

    return 100.0


def calculate_match_score(
    candidate_text: str,
    job_description: str,
    candidate_skills: Iterable[str],
    required_skills: Iterable[str],
    candidate_cgpa: float,
    minimum_cgpa: float | None,
) -> dict:
    """
    Calculate the complete candidate-to-job match.

    Components:
        1. Skill matching
        2. Semantic similarity
        3. CGPA eligibility

    Returns a transparent result dictionary.
    """

    skill_result = calculate_skill_overlap(
        candidate_skills=candidate_skills,
        required_skills=required_skills,
    )

    skill_score = skill_result[
        "match_percentage"
    ]

    semantic_score = calculate_semantic_similarity(
        candidate_text=candidate_text,
        job_description=job_description,
    )

    cgpa_score = calculate_cgpa_score(
        candidate_cgpa=candidate_cgpa,
        minimum_cgpa=minimum_cgpa,
    )

    is_eligible = (
        minimum_cgpa is None
        or candidate_cgpa >= minimum_cgpa
    )

    overall_score = (
        (skill_score * SKILL_WEIGHT)
        + (semantic_score * SEMANTIC_WEIGHT)
        + (cgpa_score * CGPA_WEIGHT)
    )

    # A candidate who fails the hard CGPA requirement
    # cannot be recommended regardless of semantic similarity.
    if not is_eligible:
        overall_score = 0.0

    return {
        "overall_score": round(
            max(
                0.0,
                min(100.0, overall_score),
            ),
            2,
        ),
        "skill_score": round(
            skill_score,
            2,
        ),
        "semantic_score": round(
            semantic_score,
            2,
        ),
        "cgpa_score": round(
            cgpa_score,
            2,
        ),
        "matched_skills": skill_result[
            "matched_skills"
        ],
        "missing_skills": skill_result[
            "missing_skills"
        ],
        "is_eligible": is_eligible,
    }