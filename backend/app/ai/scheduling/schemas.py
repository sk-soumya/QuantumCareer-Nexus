from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class AvailabilityPeriod(BaseModel):

    start_time: datetime

    end_time: datetime

    @model_validator(mode="after")
    def validate_period(self):

        if self.end_time <= self.start_time:
            raise ValueError(
                "end_time must be after start_time"
            )

        return self


class SchedulingRequest(BaseModel):

    drive_id: str

    shortlisted_students: list[str] = Field(
        min_length=1
    )

    availability_periods: list[AvailabilityPeriod] = Field(
        min_length=1
    )

    interview_duration_minutes: int = Field(
        gt=0
    )

    number_of_interviewers: int = Field(
        gt=0
    )

    mode: str

    number_of_rooms: int = Field(
        ge=0
    )

    location: str | None = None

    @model_validator(mode="after")
    def validate_request(self):

        mode = self.mode.lower()

        if mode not in {"online", "offline"}:
            raise ValueError(
                "mode must be either 'online' or 'offline'"
            )

        if mode == "offline" and self.number_of_rooms <= 0:
            raise ValueError(
                "Offline interviews require at least one room"
            )

        if mode == "online" and self.number_of_rooms != 0:
            raise ValueError(
                "Online interviews should have number_of_rooms = 0"
            )

        return self