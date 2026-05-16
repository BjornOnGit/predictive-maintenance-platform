from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class SensorInput(BaseModel):
    asset_id: UUID
    vibration: Optional[float] = None
    temperature: Optional[float] = None
    pressure: Optional[float] = None
    runtime_hours: Optional[float] = None
    rpm: Optional[float] = None


class SensorReadingResponse(BaseModel):
    id: int
    asset_id: UUID
    timestamp: datetime
    vibration: Optional[float]
    temperature: Optional[float]
    pressure: Optional[float]
    runtime_hours: Optional[float]
    rpm: Optional[float]

    class Config:
        from_attributes = True
