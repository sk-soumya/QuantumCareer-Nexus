from pydantic import BaseModel, Field
from app.core.dependencies import get_current_user

class ResumeGenerateRequest(BaseModel):
    full_name: str
    email: str | None = None
    phone: str | None = None

    degree: str | None = None
    department: str | None = None
    graduation_year: int | None = None
    cgpa: float | None = None

    skills: str | None = None
    projects: str | None = None
    experience: str | None = None
    certifications: str | None = None

    linkedin: str | None = None
    github: str | None = None

    preferred_roles: str | None = None
    career_objective: str | None = None


class ResumeProject(BaseModel):
    name: str = ""
    description: str = ""
    technologies: list[str] = Field(default_factory=list)


class ResumeExperience(BaseModel):
    role: str = ""
    company: str = ""
    description: str = ""
    achievements: list[str] = Field(default_factory=list)


class ResumeEducation(BaseModel):
    degree: str = ""
    department: str = ""
    graduation_year: int | None = None
    cgpa: float | None = None


class ResumeGeneratedResponse(BaseModel):
    full_name: str = ""
    headline: str = ""

    contact_line: str = ""

    professional_summary: str = ""

    skills: list[str] = Field(default_factory=list)

    education: list[ResumeEducation] = Field(
        default_factory=list
    )

    projects: list[ResumeProject] = Field(
        default_factory=list
    )

    experience: list[ResumeExperience] = Field(
        default_factory=list
    )

    certifications: list[str] = Field(
        default_factory=list
    )

    career_objective: str = ""

    preferred_roles: list[str] = Field(
        default_factory=list
    )

    resume_markdown: str = ""