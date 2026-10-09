from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, model_validator


class TimeSlotCreate(BaseModel):
    slot_date: date
    start_time: time
    end_time: time

    @model_validator(mode="after")
    def validate_times(self):
        if self.end_time <= self.start_time:
            raise ValueError(
                "end_time must be later than start_time"
            )

        return self


class TimeSlotResponse(BaseModel):
    id: int
    slot_date: date
    start_time: time
    end_time: time
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )