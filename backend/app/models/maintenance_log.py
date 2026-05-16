from sqlalchemy import Column, String, DateTime, Float, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from app.core.database import Base


class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False, index=True)
    date = Column(DateTime, default=datetime.utcnow, index=True)
    action = Column(String, nullable=False)  # Description of maintenance performed
    technician = Column(String)  # Name of technician
    cost = Column(Float)  # Cost in currency units
    downtime = Column(Float)  # Downtime in hours
    created_at = Column(DateTime, default=datetime.utcnow)
