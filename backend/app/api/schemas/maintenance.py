from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional


class MaintenanceLogCreate(BaseModel):
    asset_id: UUID
    action: str
    technician: Optional[str] = None
    cost: Optional[float] = None
    downtime: Optional[float] = None


class MaintenanceLogResponse(BaseModel):
    id: int
    asset_id: UUID
    date: datetime
    action: str
    technician: Optional[str]
    cost: Optional[float]
    downtime: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True


class MaintenanceRecommendation(BaseModel):
    asset_id: UUID
    recommendations: list[str]
    priority: str  # "low", "medium", "high", "critical"
