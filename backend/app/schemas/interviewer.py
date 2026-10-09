from datetime import datetime

from pydantic import BaseModel, ConfigDict


class InterviewerCreate(BaseModel):
    company_id: int
    name: str
    email: str


class InterviewerResponse(BaseModel):
    id: int
    company_id: int
    name: str
    email: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )