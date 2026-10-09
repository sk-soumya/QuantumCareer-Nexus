from typing import List

from app.ai.schemas.student_profile import StudentProfile
from app.ai.schemas.job import JobProfile
from app.ai.schemas.job_match import JobMatchResult

from app.ai.matching.job_matcher_pipeline import (
    match_student_to_jobs,
)


def run_job_recommendation_workflow(
    student: StudentProfile,
    jobs: List[JobProfile],
) -> List[JobMatchResult]:

    results = match_student_to_jobs(
        student=student,
        jobs=jobs,
    )

    return results