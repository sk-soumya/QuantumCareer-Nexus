from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class OfferCreate(BaseModel):
    application_id: int
    salary_package: float = Field(gt=0)
    joining_date: date | None = None
    offer_letter_url: str | None = None


class OfferStatusUpdate(BaseModel):
    status: str


class OfferResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    application_id: int
    salary_package: float
    joining_date: date | None
    offer_letter_url: str | None
    status: str
    created_by: int
    created_at: datetime
    updated_at: datetime