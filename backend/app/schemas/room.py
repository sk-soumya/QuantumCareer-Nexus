from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RoomCreate(BaseModel):
    name: str
    location: str | None = None
    capacity: int = 1


class RoomResponse(BaseModel):
    id: int
    name: str
    location: str | None
    capacity: int
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )