from typing import List
from pydantic import BaseModel, Field

from app.ai.schemas.student_profile import StudentProfile
from app.ai.schemas.job import JobProfile


class EligibilityCheck(BaseModel):
    branch: bool
    cgpa: bool
    backlogs: bool
    graduation_year: bool

    mandatory_requirements_satisfied: bool

    failed_requirements: List[str] = Field(
        default_factory=list
    )


def normalize(text: str) -> str:
    return (
        text.strip()
        .lower()
        .replace("-", " ")
        .replace("_", " ")
        .replace("/", " ")
    )


def branch_matches(
    student_branch: str,
    eligible_branch: str
) -> bool:
    """
    Check whether a student's branch matches
    an eligible branch.

    Handles common variations such as:

    Computer Science
    Computer Science Engineering
    Computer Science and Engineering
    CSE
    """

    student = normalize(student_branch)
    eligible = normalize(eligible_branch)

    # Exact match
    if student == eligible:
        return True

    # Common abbreviation
    aliases = {
        "cse": "computer science",
        "cs": "computer science",
        "it": "information technology",
        "ece": "electronics and communication engineering",
        "eee": "electrical and electronics engineering",
        "me": "mechanical engineering",
        "civil": "civil engineering",
    }

    student_expanded = aliases.get(
        student,
        student
    )

    eligible_expanded = aliases.get(
        eligible,
        eligible
    )

    if student_expanded == eligible_expanded:
        return True

    # Handle:
    # Computer Science
    # Computer Science Engineering
    # Computer Science and Engineering
    student_words = set(
        student_expanded.split()
    )

    eligible_words = set(
        eligible_expanded.split()
    )

    # Remove generic engineering terms
    generic_words = {
        "engineering",
        "engineer",
        "and"
    }

    student_core = (
        student_words - generic_words
    )

    eligible_core = (
        eligible_words - generic_words
    )

    if (
        student_core
        and eligible_core
        and (
            student_core.issubset(eligible_core)
            or eligible_core.issubset(student_core)
        )
    ):
        return True

    return False


def check_eligibility(
    student: StudentProfile,
    job: JobProfile
) -> EligibilityCheck:

    failed_requirements = []

    # =========================================
    # Branch
    # =========================================

    branch_ok = True

    if job.eligible_branches:

        student_branches = [
            education.branch
            for education in student.education
            if education.branch
        ]

        eligible_branches = [
            branch
            for branch in job.eligible_branches
            if branch
        ]

        branch_ok = any(
            branch_matches(
                student_branch,
                eligible_branch
            )
            for student_branch in student_branches
            for eligible_branch in eligible_branches
        )

        if not branch_ok:
            failed_requirements.append(
                "Branch"
            )

    # =========================================
    # CGPA
    # =========================================

    cgpa_ok = True

    if job.minimum_cgpa is not None:

        student_cgpas = [
            education.cgpa
            for education in student.education
            if education.cgpa is not None
        ]

        if student_cgpas:

            highest_cgpa = max(
                student_cgpas
            )

            cgpa_ok = (
                highest_cgpa
                >= job.minimum_cgpa
            )

        else:
            cgpa_ok = False

        if not cgpa_ok:
            failed_requirements.append(
                "CGPA"
            )    

    # =========================================
    # Backlogs
    # =========================================

    backlogs_ok = True

    if job.maximum_backlogs is not None:

        student_backlogs = [
            education.backlogs
            for education in student.education
            if education.backlogs is not None
        ]

        if student_backlogs:

            highest_backlogs = max(
                student_backlogs
            )

            backlogs_ok = (
                highest_backlogs
                <= job.maximum_backlogs
            )

        else:
            backlogs_ok = False
        
        if not backlogs_ok:
            failed_requirements.append(
                "Backlogs"
            )

    # =========================================
    # Graduation Year
    # =========================================

    graduation_year_ok = True

    if job.graduation_year is not None:

        student_years = [
            education.graduation_year
            for education in student.education
            if education.graduation_year is not None
        ]

        graduation_year_ok = (
            job.graduation_year
            in student_years
        )

        if not graduation_year_ok:
            failed_requirements.append(
                "Graduation Year"
            )

    # =========================================
    # Overall mandatory requirements
    # =========================================

    mandatory_requirements_satisfied = (
        branch_ok
        and cgpa_ok
        and backlogs_ok
        and graduation_year_ok
    )

    # =========================================
    # Result
    # =========================================

    return EligibilityCheck(
        branch=branch_ok,
        cgpa=cgpa_ok,
        backlogs=backlogs_ok,
        graduation_year=graduation_year_ok,
        mandatory_requirements_satisfied=(
            mandatory_requirements_satisfied
        ),
        failed_requirements=failed_requirements,
    )