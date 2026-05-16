from sqlalchemy import Column, String, DateTime, Float, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from app.core.database import Base


class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False, index=True)
    date = Column(DateTime, default=datetime.utcnow, nullable=False)
    action = Column(String, nullable=False)  # e.g., "bearing replacement", "lubrication"
    technician = Column(String)  # technician name
    cost = Column(Float)  # maintenance cost in currency
    downtime = Column(Float)  # downtime in hours
    notes = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)