from app.ai.schemas.student_profile import StudentProfile
from app.ai.schemas.job import JobProfile

from app.ai.matching.skill_matcher import match_skills
from app.ai.matching.job_matcher import match_student_to_job

from app.ai.readiness.readiness_features import (
    extract_readiness_features,
)
from app.ai.readiness.readiness_model import (
    calculate_readiness_score,
)
from app.ai.readiness.project_aggregation import (
    aggregate_project_quality,
)


def run_readiness_workflow(
    student: StudentProfile,
    job: JobProfile,
    project_analyses: list[dict] | None = None,
):
    # 1. Match student skills with the target job
    skill_result = match_skills(
        student=student,
        job=job,
    )

    # 2. Calculate job suitability
    job_match = match_student_to_job(
        student=student,
        job=job,
    )
    fit_score=job_match.suitability_score
    # 3. Aggregate GitHub project quality
    overall_project_quality = aggregate_project_quality(
        project_analyses or []
    )

    # 4. Extract readiness features
    readiness_features = extract_readiness_features(
        student=student,
        skill_result=skill_result,
        fit_score=job_match.suitability_score,
        overall_project_quality=overall_project_quality,
    )

    # 5. Calculate final readiness
    readiness_result = calculate_readiness_score(
        readiness_features
    )

    return {
        "readiness": readiness_result,
        "readiness_features": readiness_features,
        "job_match": job_match,
        "project_quality": overall_project_quality,
        "project_analyses": project_analyses or [],
    }