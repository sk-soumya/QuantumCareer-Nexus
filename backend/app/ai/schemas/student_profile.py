import os
from typing import List, Optional

from pydantic import BaseModel, Field

from app.ai.local_llm import invoke_structured
from app.ai.schemas.resume_loader import load_resume


class Education(BaseModel):
    degree: str = ""
    institution: str = ""
    branch: str = ""
    graduation_year: Optional[int] = None
    cgpa: Optional[float] = None
    backlogs: Optional[int] = None


class Project(BaseModel):
    title: str = ""
    description: str = ""
    technologies: List[str] = Field(default_factory=list)


class Experience(BaseModel):
    company: str = ""
    role: str = ""
    description: str = ""


class StudentProfile(BaseModel):
    name: str
    email: str

    education: List[Education] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)

    phone: Optional[str] = None
    github_url: Optional[str] = None
    projects: List[Project] = Field(default_factory=list)
    experience: List[Experience] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    achievements: List[str] = Field(default_factory=list)


def extract_resume(file_path: str) -> StudentProfile:
    """Extract a structured student profile with local Qwen."""
    resume_text = load_resume(file_path)

    if not resume_text.strip():
        raise ValueError(
            "No readable text could be extracted from the resume."
        )

    prompt = f"""
You are CampusLink's resume extraction engine.

Extract ONLY facts explicitly supported by the resume text below.
Never invent, guess, calculate, or infer missing values.

Rules:
- Keep name/email accurate.
- Separate education, technical skills, projects, experience,
  certifications, and achievements.
- Extract GitHub only when an explicit GitHub URL appears.
- Preserve project technologies only when explicitly associated with
  that project.
- If a field is missing, use an empty list or null as appropriate.
- Do not fabricate CGPA, years, companies, roles, skills, metrics, or URLs.

Resume text:
----------------
{resume_text}
----------------

Return only the StudentProfile JSON.
"""
    return invoke_structured(StudentProfile, prompt, temperature=0.1)


if __name__ == "__main__":
    file_path = os.path.join(
        os.path.dirname(__file__),
        "mock_it_fresher_resume.pdf",
    )
    print(extract_resume(file_path).model_dump_json(indent=2))
