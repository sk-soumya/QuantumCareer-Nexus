from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class StudentProfileUpsert(BaseModel):
    cgpa: float | None = Field(
        default=None,
        ge=0,
        le=10,
    )

    skills: str | None = None

    resume_text: str | None = None

    phone: str | None = None

    degree: str | None = None

    department: str | None = None

    graduation_year: int | None = Field(
        default=None,
        ge=2000,
        le=2100,
    )

    projects: str | None = None

    experience: str | None = None

    certifications: str | None = None

    linkedin: str | None = None

    github: str | None = None

    preferred_roles: str | None = None

    preferred_locations: str | None = None

    career_objective: str | None = None

    profile_photo_url: str | None = None


class StudentProfileResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int

    student_id: int

    cgpa: float | None

    skills: str | None

    resume_text: str | None

    phone: str | None

    degree: str | None

    department: str | None

    graduation_year: int | None

    projects: str | None

    experience: str | None

    certifications: str | None

    linkedin: str | None

    github: str | None

    preferred_roles: str | None

    preferred_locations: str | None

    career_objective: str | None

    profile_photo_url: str | None

    updated_at: datetime