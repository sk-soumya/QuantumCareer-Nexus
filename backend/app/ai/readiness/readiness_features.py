from typing import Dict

from app.ai.schemas.student_profile import StudentProfile


def extract_readiness_features(
    student: StudentProfile,
    skill_result: Dict,
    fit_score: float,
    overall_project_quality: float = 0.0
) -> Dict:
    """
    GitHub/project analysis is optional.
    Overall project quality is supplied from the
    student's relevant GitHub project analyses.
    """
    education = (
        student.education[0]
        if student.education
        else None
    )

    # -----------------------------------------
    # Academic features
    # -----------------------------------------

    cgpa = (
        education.cgpa
        if education and education.cgpa is not None
        else 0.0
    )

    backlogs = (
        education.backlogs
        if education and education.backlogs is not None
        else 0
    )

    # -----------------------------------------
    # Project / Experience features
    # -----------------------------------------

    project_count = len(student.projects)

    certification_count = len(
        student.certifications
    )

    achievement_count = len(
        student.achievements
    )

    experience_count = len(
        student.experience
    )

    # -----------------------------------------
    # Skill features
    # -----------------------------------------

    total_required = (
        len(skill_result.get("required_matched", []))
        + len(skill_result.get("required_missing", []))
    )

    required_matched = len(
        skill_result.get("required_matched", [])
    )

    required_skill_match = (
        (required_matched / total_required) * 100
        if total_required > 0
        else 0.0
    )

    total_preferred = (
        len(skill_result.get("preferred_matched", []))
        + len(skill_result.get("preferred_missing", []))
    )

    preferred_matched = len(
        skill_result.get("preferred_matched", [])
    )

    preferred_skill_match = (
        (preferred_matched / total_preferred) * 100
        if total_preferred > 0
        else 0.0
    )

    # --------------------------------------------
    # GitHub / Project Analysis
    # --------------------------------------------

    # Overall project quality is already aggregated
    # across the student's relevant GitHub projects.
    # It is provided on a 0-10 scale.

    overall_project_quality = min(
        max(float(overall_project_quality), 0.0),
        10.0
    )

    # Readiness features use a 0-100 scale.
    project_quality_score = (
        overall_project_quality * 10
    )

    # -----------------------------------------
    # Return features
    # -----------------------------------------

    return {
        "cgpa": cgpa,
        "backlogs": backlogs,

        "project_count": project_count,
        "project_quality_score": (
            round(project_quality_score, 2)
            if project_quality_score is not None
            else None
        ),

        "certification_count": certification_count,
        "achievement_count": achievement_count,
        "experience_count": experience_count,

        "required_skill_match": round(
            required_skill_match,
            2
        ),

        "preferred_skill_match": round(
            preferred_skill_match,
            2
        ),

        "suitability_score": round(
        fit_score,
        2
        )
    }