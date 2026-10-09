from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SelectionRoundCreate(BaseModel):
    application_id: int
    round_number: int
    round_type: str
    title: str
    description: str | None = None


class SelectionRoundStatusUpdate(BaseModel):
    status: str
    result: str | None = None


class SelectionRoundResponse(BaseModel):
    id: int
    application_id: int
    round_number: int
    round_type: str
    title: str
    description: str | None
    status: str
    result: str | None
    scheduled_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )