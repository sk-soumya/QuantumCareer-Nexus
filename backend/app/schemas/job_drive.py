from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class JobDriveCreate(BaseModel):
    company_id: int
    title: str
    description: str | None = None
    job_type: str = "FULL_TIME"
    location: str | None = None
    salary_package: str | None = None
    minimum_cgpa: float | None = None
    required_skills: str | None = None
    application_deadline: date | None = None


class JobDriveStatusUpdate(BaseModel):
    drive_status: str


class JobDriveResponse(BaseModel):
    id: int
    company_id: int
    title: str
    description: str | None
    job_type: str
    location: str | None
    salary_package: str | None
    minimum_cgpa: float | None
    required_skills: str | None
    application_deadline: date | None
    drive_status: str
    created_by: int
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )