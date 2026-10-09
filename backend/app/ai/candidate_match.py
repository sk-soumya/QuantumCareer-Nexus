from app.ai.matcher import calculate_match_score


def match_candidate_to_job(
    candidate_text: str,
    candidate_skills: str | None,
    candidate_cgpa: float | None,
    job_title: str,
    job_description: str | None,
    required_skills: str | None,
    minimum_cgpa: float | None,
) -> dict:
    """
    Match one real student profile against one job drive.

    This function connects the CAMPUSLINK student profile
    data with the existing Member 2 AI matching engine.
    """

    # --------------------------------------------------------
    # Prepare candidate skills
    # --------------------------------------------------------

    candidate_skill_list = []

    if candidate_skills:
        candidate_skill_list = [
            skill.strip()
            for skill in candidate_skills.split(",")
            if skill.strip()
        ]

    # --------------------------------------------------------
    # Prepare required job skills
    # --------------------------------------------------------

    required_skill_list = []

    if required_skills:
        required_skill_list = [
            skill.strip()
            for skill in required_skills.split(",")
            if skill.strip()
        ]

    # --------------------------------------------------------
    # Prepare job text
    # --------------------------------------------------------

    job_text_parts = [
        job_title or "",
        job_description or "",
    ]

    job_text = " ".join(
        part.strip()
        for part in job_text_parts
        if part and part.strip()
    )

    # --------------------------------------------------------
    # Safe CGPA value
    # --------------------------------------------------------

    safe_cgpa = (
        float(candidate_cgpa)
        if candidate_cgpa is not None
        else 0.0
    )

    # --------------------------------------------------------
    # Run existing Member 2 matcher
    # --------------------------------------------------------

    result = calculate_match_score(
        candidate_text=candidate_text or "",
        job_description=job_text,
        candidate_skills=candidate_skill_list,
        required_skills=required_skill_list,
        candidate_cgpa=safe_cgpa,
        minimum_cgpa=minimum_cgpa,
    )

    # --------------------------------------------------------
    # Add useful CAMPUSLINK context
    # --------------------------------------------------------

    return {
        "job_title": job_title,
        "overall_score": result["overall_score"],
        "skill_score": result["skill_score"],
        "semantic_score": result["semantic_score"],
        "cgpa_score": result["cgpa_score"],
        "matched_skills": result["matched_skills"],
        "missing_skills": result["missing_skills"],
        "is_eligible": result["is_eligible"],
    }