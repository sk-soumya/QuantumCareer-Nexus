from typing import List, Dict


def calculate_placement_analytics(
    job_matches: List[Dict],
    readiness_result: Dict | None = None,
    skill_gap: Dict | None = None,
) -> Dict:

    # -----------------------------
    # Job suitability analysis
    # -----------------------------

    total_jobs = len(job_matches)

    eligible_jobs = sum(
        1
        for job in job_matches
        if job.get("eligibility_satisfied")
    )

    average_suitability = (
        sum(
            job.get("suitability_score", 0)
            for job in job_matches
        ) / total_jobs
        if total_jobs
        else 0.0
    )

    job_suitability = [
        {
            "company": job.get("company"),
            "role": job.get("role"),
            "suitability_score": job.get(
                "suitability_score", 0
            ),
        }
        for job in job_matches
    ]

    # -----------------------------
    # Readiness analysis
    # -----------------------------

    readiness_factors = {}

    readiness_score = None
    readiness_level = None

    if readiness_result:
        readiness_score = readiness_result.get(
            "readiness_score"
        )

        readiness_level = readiness_result.get(
            "readiness_level"
        )

        readiness_factors = readiness_result.get(
            "factors", {}
        )

    # -----------------------------
    # Skill-gap analysis
    # -----------------------------

    skill_gap_analysis = {
        "required_skill_gaps": [],
        "preferred_skill_gaps": [],
        "required_skills_strength": [],
        "preferred_skills_strength": [],
        "total_skill_gaps": 0,
    }

    if skill_gap:
        skill_gap_analysis = {
            "required_skill_gaps": skill_gap.get(
                "required_skill_gaps", []
            ),
            "preferred_skill_gaps": skill_gap.get(
                "preferred_skill_gaps", []
            ),
            "required_skills_strength": skill_gap.get(
                "required_skills_strength", []
            ),
            "preferred_skills_strength": skill_gap.get(
                "preferred_skills_strength", []
            ),
            "total_skill_gaps": skill_gap.get(
                "total_skill_gaps", 0
            ),
        }

    # -----------------------------
    # Top job
    # -----------------------------

    top_job = (
        max(
            job_matches,
            key=lambda job: job.get(
                "suitability_score", 0
            ),
        )
        if job_matches
        else None
    )

    return {
        "overview": {
            "total_jobs": total_jobs,
            "eligible_jobs": eligible_jobs,
            "average_suitability": round(
                average_suitability,
                2,
            ),
        },

        "readiness": {
            "score": readiness_score,
            "level": readiness_level,
            "factors": readiness_factors,
        },

        "job_suitability": job_suitability,

        "skill_gaps": skill_gap_analysis,

        "top_job": top_job,
    }