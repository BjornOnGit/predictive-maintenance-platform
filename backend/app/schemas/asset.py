from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class AssetCreate(BaseModel):
    name: str
    type: str
    facility: str
    manufacturer: Optional[str] = None
    install_date: Optional[datetime] = None


class AssetRead(BaseModel):
    id: UUID
    name: str
    type: str
    facility: str
    manufacturer: Optional[str]
    install_date: Optional[datetime]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
