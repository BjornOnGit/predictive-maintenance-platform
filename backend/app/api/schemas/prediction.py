from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class PredictionResponse(BaseModel):
    asset_id: UUID
    failure_probability: float
    health_score: float
    risk_level: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
