from pydantic import BaseModel, Field
from typing import List


class SkillPreparation(BaseModel):
    skill: str
    priority: str
    reason: str
    recommended_topics: List[str] = Field(default_factory=list)


class PreparationPlan(BaseModel):
    target_role: str
    overall_goal: str
    skill_gaps: List[SkillPreparation] = Field(default_factory=list)
    recommended_projects: List[str] = Field(default_factory=list)
    preparation_summary: str