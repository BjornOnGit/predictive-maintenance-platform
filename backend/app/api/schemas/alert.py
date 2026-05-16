from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class AlertResponse(BaseModel):
    id: UUID
    asset_id: UUID
    type: str
    message: str
    severity: str
    created_at: datetime
    acknowledged: bool
    acknowledged_at: datetime | None

    class Config:
        from_attributes = True
