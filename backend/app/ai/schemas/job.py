from pydantic import BaseModel, Field
from typing import List, Optional


class JobProfile(BaseModel):

    company: str
    role: str
    description: str

    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)

    eligible_branches: List[str] = Field(default_factory=list)
    minimum_cgpa: Optional[float] = None
    maximum_backlogs: Optional[int] = None
    graduation_year: Optional[int] = None

    required_certifications: List[str] = Field(default_factory=list)

    required_experience: Optional[str] = None
    preferred_experience: Optional[str] = None

    location: Optional[str] = None
    employment_type: Optional[str] = None