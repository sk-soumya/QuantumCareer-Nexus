from pydantic import BaseModel, Field
from typing import List


class LearningResource(BaseModel):
    title: str
    skill: str
    resource_type: str
    content: str
    source: str
    topics: List[str] = Field(default_factory=list)