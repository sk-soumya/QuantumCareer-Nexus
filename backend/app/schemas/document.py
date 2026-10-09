from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    offer_id: int
    uploaded_by: int
    original_filename: str
    stored_filename: str
    document_type: str
    content_type: str
    status: str
    created_at: datetime