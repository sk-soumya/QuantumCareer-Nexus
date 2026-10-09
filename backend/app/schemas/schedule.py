from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ScheduleCreate(BaseModel):
    selection_round_id: int
    interviewer_id: int
    room_id: int
    time_slot_id: int
    notes: str | None = None


class ScheduleResponse(BaseModel):
    id: int
    selection_round_id: int
    student_id: int
    interviewer_id: int
    room_id: int
    time_slot_id: int
    status: str
    notes: str | None
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )