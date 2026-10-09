from app.ai.schemas.student_profile import StudentProfile
from app.ai.schemas.job import JobProfile
from app.ai.schemas.job_match import JobMatchResult

from app.ai.matching.eligibility import check_eligibility
from app.ai.matching.skill_matcher import match_skills
from app.ai.matching.fit_scorer import calculate_fit_score


def match_student_to_job(
    student: StudentProfile,
    job: JobProfile,
    project_analysis=None,
) -> JobMatchResult:

    # --------------------------------------------
    # 1. Eligibility
    # --------------------------------------------

    eligibility_result = check_eligibility(
        student,
        job
    )

    # --------------------------------------------
    # 2. Skill Matching
    # --------------------------------------------

    skill_result = match_skills(
        student,
        job
    )

    # --------------------------------------------
    # 3. Suitability Score
    # --------------------------------------------

    suitability_result = calculate_fit_score(
        eligibility_result,
        skill_result,
        project_analysis
    )

    # --------------------------------------------
    # 4. Explanation
    # --------------------------------------------

    explanation_parts = []

    if suitability_result["required_skill_score"] >= 80:
        explanation_parts.append(
            "Strong match with the required technical skills."
        )
    else:
        explanation_parts.append(
            "Some required technical skills are missing."
        )

    if suitability_result["preferred_skill_score"] >= 60:
        explanation_parts.append(
            "The student also matches several preferred skills."
        )

    if project_analysis:
        explanation_parts.append(
            "GitHub project analysis was considered in the suitability score."
        )

    if not suitability_result["mandatory_requirements_satisfied"]:
        explanation_parts.append(
            "Some stated eligibility requirements are not satisfied."
        )

    explanation = " ".join(explanation_parts)

    # --------------------------------------------
    # 5. Final Result
    # --------------------------------------------

    return JobMatchResult(
        company=job.company,
        role=job.role,

        suitability_score=suitability_result[
            "suitability_score"
        ],

        eligibility_satisfied=suitability_result[
            "mandatory_requirements_satisfied"
        ],

        failed_requirements=suitability_result[
            "failed_requirements"
        ],

        required_skills_matched=skill_result[
            "required_matched"
        ],

        required_skills_missing=skill_result[
            "required_missing"
        ],

        preferred_skills_matched=skill_result[
            "preferred_matched"
        ],

        preferred_skills_missing=skill_result[
            "preferred_missing"
        ],

        project_relevance=(
            project_analysis.get("project_quality_score")
            if project_analysis
            else None
        ),

        explanation=explanation
    )