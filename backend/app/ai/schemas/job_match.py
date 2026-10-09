from pydantic import BaseModel, Field
from typing import List, Optional


class JobMatchResult(BaseModel):
    company: str
    role: str

    suitability_score: float = Field(ge=0, le=100)

    eligibility_satisfied: bool
    failed_requirements: List[str] = Field(default_factory=list)

    required_skills_matched: List[str] = Field(default_factory=list)
    required_skills_missing: List[str] = Field(default_factory=list)

    preferred_skills_matched: List[str] = Field(default_factory=list)
    preferred_skills_missing: List[str] = Field(default_factory=list)

    project_relevance: Optional[float] = None

    explanation: str