from typing import List

from app.ai.schemas.student_profile import StudentProfile
from app.ai.schemas.job import JobProfile
from app.ai.schemas.job_match import JobMatchResult

from app.ai.matching.job_matcher import match_student_to_job


def match_student_to_jobs(
    student: StudentProfile,
    jobs: List[JobProfile],
) -> List[JobMatchResult]:

    results = []

    for job in jobs:

        result = match_student_to_job(
            student=student,
            job=job,
        )

        results.append(result)

    # Highest suitability first
    results.sort(
        key=lambda result: result.suitability_score,
        reverse=True
    )

    return results