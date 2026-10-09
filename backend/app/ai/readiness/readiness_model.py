from typing import Dict


def calculate_readiness_score(features: Dict) -> Dict:
    """
    Calculate an explainable placement readiness score.

    Weights:
    Academic        : 15%
    Skills          : 30%
    Projects        : 20%
    Certifications  : 10%
    Experience      : 10%
    Achievements    : 5%
    Job Fit         : 10%

    Project quality is preferred over project count when
    GitHub/project analysis is available.
    """

    # -----------------------------------------
    # Academic
    # -----------------------------------------

    cgpa = min(
        (features["cgpa"] / 10) * 100,
        100
    )

    backlog_score = max(
        100 - (features["backlogs"] * 20),
        0
    )

    academic_score = (
        cgpa * 0.8
        + backlog_score * 0.2
    )

    # -----------------------------------------
    # Skills
    # -----------------------------------------

    skill_score = (
        features["required_skill_match"] * 0.7
        + features["preferred_skill_match"] * 0.3
    )

    # -----------------------------------------
    # Projects
    # -----------------------------------------

    project_quality = features.get(
        "project_quality_score"
    )

    project_count = features.get(
        "project_count",
        0
    )

    if project_quality is not None:

        # GitHub/project analysis available
        project_score = float(
            project_quality
        )

    else:

        # Fallback when GitHub analysis
        # is unavailable
        project_score = min(
            project_count / 3 * 100,
            100
        )

    # -----------------------------------------
    # Certifications
    # -----------------------------------------

    certification_score = min(
        features["certification_count"] / 4 * 100,
        100
    )

    # -----------------------------------------
    # Experience
    # -----------------------------------------

    experience_score = min(
        features["experience_count"] / 2 * 100,
        100
    )

    # -----------------------------------------
    # Achievements
    # -----------------------------------------

    achievement_score = min(
        features["achievement_count"] / 3 * 100,
        100
    )

    # -----------------------------------------
    # Job Fit
    # -----------------------------------------

    job_fit_score = features.get(
    "suitability_score",
    0.0
    )

    # -----------------------------------------
    # Final Readiness Score
    # -----------------------------------------

    readiness_score = (
        academic_score * 0.15
        + skill_score * 0.30
        + project_score * 0.20
        + certification_score * 0.10
        + experience_score * 0.10
        + achievement_score * 0.05
        + job_fit_score * 0.10
    )

    # -----------------------------------------
    # Readiness Level
    # -----------------------------------------

    if readiness_score < 40:

        readiness_level = "Not Ready"

    elif readiness_score < 60:

        readiness_level = "Developing"

    elif readiness_score < 80:

        readiness_level = "Ready"

    else:

        readiness_level = "Highly Employable"

    # -----------------------------------------
    # Result
    # -----------------------------------------

    return {
        "readiness_score": round(
            readiness_score,
            2
        ),

        "readiness_level": readiness_level,

        "factors": {
            "academic": round(
                academic_score,
                2
            ),

            "skills": round(
                skill_score,
                2
            ),

            "projects": round(
                project_score,
                2
            ),

            "certifications": round(
                certification_score,
                2
            ),

            "experience": round(
                experience_score,
                2
            ),

            "achievements": round(
                achievement_score,
                2
            ),

            "job_fit": round(
                job_fit_score,
                2
            )
        }
    }