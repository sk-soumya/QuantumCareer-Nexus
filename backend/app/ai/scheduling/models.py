from datetime import datetime

from pydantic import BaseModel


class PlacementEvent(BaseModel):

    event_id: str

    title: str

    start_time: datetime

    end_time: datetime

    location: str | None = None

    student_id: str | None = None

    interviewer_id: str | None = None


class SchedulingConflict(BaseModel):

    event_1: str

    event_2: str

    conflict_type: str

    message: str