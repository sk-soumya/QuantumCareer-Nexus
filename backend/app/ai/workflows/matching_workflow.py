from app.ai.schemas.student_profile import StudentProfile
from app.ai.schemas.job import JobProfile

from app.ai.matching.skill_matcher import match_skills
from app.ai.matching.skill_gap import calculate_skill_gap
from app.ai.matching.job_matcher import match_student_to_job

from app.ai.recommendation.preparation_plan import (
    generate_preparation_plan,
)


def run_matching_workflow(
    student: StudentProfile,
    job: JobProfile,
):
    # 1. Match student skills with job
    skill_result = match_skills(
        student=student,
        job=job,
    )

    # 2. Calculate skill gaps
    skill_gap = calculate_skill_gap(
        skill_result
    )

    # 3. Calculate overall job match
    job_match = match_student_to_job(
        student=student,
        job=job,
    )

    # 4. Generate preparation plan
    preparation_plan = generate_preparation_plan(
        job=job,
        skill_gap=skill_gap,
    )

    return {
        "job_match": job_match,
        "skill_gap": skill_gap,
        "preparation_plan": preparation_plan,
    }
