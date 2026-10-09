from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ApplicationCreate(BaseModel):
    job_drive_id: int


class ApplicationStatusUpdate(BaseModel):
    status: str


class ApplicationResponse(BaseModel):
    id: int
    student_id: int
    job_drive_id: int
    status: str
    applied_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )