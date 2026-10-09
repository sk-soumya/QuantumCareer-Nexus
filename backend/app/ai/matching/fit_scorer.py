from typing import Dict, Optional

from app.ai.matching.eligibility import EligibilityCheck


def calculate_fit_score(
    eligibility_result: Dict,
    skill_result: Dict,
    project_analysis: Optional[Dict] = None,
) -> Dict:
    """
    Calculate student-job suitability.

    Suitability is based on:
    - Required skills: 50%
    - Preferred skills: 20%
    - Project/GitHub quality: 30%

    Eligibility is reported separately and does not
    reduce the suitability score.

    A candidate who fails an academic requirement can
    still have high technical suitability.
    """

    # -----------------------------------------
    # Convert EligibilityCheck to dictionary
    # -----------------------------------------

    if isinstance(
        eligibility_result,
        EligibilityCheck
    ):
        eligibility_result = (
            eligibility_result.model_dump()
        )

    # -----------------------------------------
    # Eligibility
    # -----------------------------------------

    mandatory_requirements_satisfied = (
        eligibility_result.get(
            "mandatory_requirements_satisfied",
            eligibility_result.get(
                "eligible",
                False
            )
        )
    )

    failed_requirements = (
        eligibility_result.get(
            "failed_requirements",
            []
        )
    )

    eligibility_score = (
        100.0
        if mandatory_requirements_satisfied
        else 0.0
    )

    # -----------------------------------------
    # Required Skills
    # -----------------------------------------

    required_matched = skill_result.get(
        "required_matched",
        []
    )

    required_missing = skill_result.get(
        "required_missing",
        []
    )

    total_required = (
        len(required_matched)
        + len(required_missing)
    )

    required_skill_score = (
        len(required_matched)
        / total_required
        * 100
        if total_required > 0
        else 100.0
    )

    # -----------------------------------------
    # Preferred Skills
    # -----------------------------------------

    preferred_matched = skill_result.get(
        "preferred_matched",
        []
    )

    preferred_missing = skill_result.get(
        "preferred_missing",
        []
    )

    total_preferred = (
        len(preferred_matched)
        + len(preferred_missing)
    )

    preferred_skill_score = (
        len(preferred_matched)
        / total_preferred
        * 100
        if total_preferred > 0
        else 100.0
    )

    # -----------------------------------------
    # GitHub / Project Quality
    # -----------------------------------------

    project_analysis = project_analysis or {}

    project_quality_score = (
        project_analysis.get(
            "project_quality_score"
        )
    )

    if project_quality_score is not None:

        # Project analyzer should return 0-10.
        # Clamp the value to prevent invalid LLM output
        # from breaking the scoring system.

        project_quality_score = min(
            max(float(project_quality_score), 0.0),
            10.0
        )

        # Convert 0-10 to 0-100.
        project_score = (
            project_quality_score * 10
        )
    else:

        # No GitHub/project analysis available.
        # Do not penalize the candidate.
        project_score = None

    # -----------------------------------------
    # Suitability Score
    # -----------------------------------------

    if project_score is not None:

        suitability_score = (
            required_skill_score * 0.50
            + preferred_skill_score * 0.20
            + project_score * 0.30
        )

    else:

        # If project analysis is unavailable,
        # calculate using the available signals
        # without treating missing GitHub as zero.

        available_weight = 0.50 + 0.20

        suitability_score = (
            required_skill_score * 0.50
            + preferred_skill_score * 0.20
        ) / available_weight

    # -----------------------------------------
    # Result
    # -----------------------------------------

    return {
        "suitability_score": round(
            suitability_score,
            2
        ),

        "eligibility_score": round(
            eligibility_score,
            2
        ),

        "required_skill_score": round(
            required_skill_score,
            2
        ),

        "preferred_skill_score": round(
            preferred_skill_score,
            2
        ),

        "project_quality_score": (
            round(project_score, 2)
            if project_score is not None
            else None
        ),

        "mandatory_requirements_satisfied":
            mandatory_requirements_satisfied,

        "failed_requirements":
            failed_requirements,
    }