"""Adapters between CampusLink's existing DB-shaped objects and Member 4 schemas.

These adapters are intentionally duck-typed so they work with the existing
CampusLink SQLAlchemy models without copying DB models into the AI package.
"""
from __future__ import annotations

from typing import Iterable

from app.ai.schemas.job import JobProfile
from app.ai.schemas.student_profile import (
    Education,
    Experience,
    Project,
    StudentProfile,
)


def _split(value) -> list[str]:
    if value is None:
        return []
    return [
        item.strip()
        for item in str(value).replace("|", "\n").replace(";", "\n").splitlines()
        if item.strip()
    ]


def _projects(value) -> list[Project]:
    return [
        Project(
            title=f"Project {index}",
            description=item,
            technologies=[],
        )
        for index, item in enumerate(_split(value), start=1)
    ]


def _experiences(value) -> list[Experience]:
    return [
        Experience(
            company="",
            role="",
            description=item,
        )
        for item in _split(value)
    ]


def student_profile_from_campuslink(
    user,
    profile,
) -> StudentProfile:
    """Map the current CampusLink User + StudentProfile to Member 4 schema."""
    education = [
        Education(
            degree=getattr(profile, "degree", "") or "",
            institution="",
            branch=getattr(profile, "department", "") or "",
            graduation_year=getattr(profile, "graduation_year", None),
            cgpa=(
                float(profile.cgpa)
                if getattr(profile, "cgpa", None) is not None
                else None
            ),
            backlogs=None,
        )
    ]

    return StudentProfile(
        name=getattr(user, "full_name", "") or "",
        email=getattr(user, "email", "") or "",
        education=education,
        skills=_split(getattr(profile, "skills", "")),
        phone=getattr(profile, "phone", None),
        github_url=getattr(profile, "github", None),
        projects=_projects(getattr(profile, "projects", "")),
        experience=_experiences(getattr(profile, "experience", "")),
        certifications=_split(
            getattr(profile, "certifications", "")
        ),
        achievements=[],
    )


def job_profile_from_campuslink(
    job,
    company_name: str | None = None,
) -> JobProfile:
    """Map a CampusLink JobDrive-like object to Member 4 JobProfile."""
    required_skills = _split(
        getattr(job, "required_skills", "")
    )
    preferred_skills = _split(
        getattr(job, "preferred_skills", "")
    )

    eligible_branches = _split(
        getattr(job, "eligible_branches", "")
    )

    return JobProfile(
        company=(
            company_name
            or getattr(job, "company_name", None)
            or str(getattr(job, "company_id", "") or "")
        ),
        role=getattr(job, "title", "") or "",
        description=getattr(job, "description", "") or "",
        required_skills=required_skills,
        preferred_skills=preferred_skills,
        eligible_branches=eligible_branches,
        minimum_cgpa=(
            float(job.minimum_cgpa)
            if getattr(job, "minimum_cgpa", None) is not None
            else None
        ),
        maximum_backlogs=getattr(
            job, "maximum_backlogs", None
        ),
        graduation_year=getattr(
            job, "graduation_year", None
        ),
        required_certifications=_split(
            getattr(job, "required_certifications", "")
        ),
        required_experience=getattr(
            job, "required_experience", None
        ),
        preferred_experience=getattr(
            job, "preferred_experience", None
        ),
        location=getattr(job, "location", None),
        employment_type=getattr(job, "employment_type", None),
    )
