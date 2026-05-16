from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from app.core.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False, index=True)
    type = Column(String, nullable=False)  # "vibration", "temperature", "high_risk"
    message = Column(String, nullable=False)
    severity = Column(String, nullable=False)  # "warning", "critical"
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    acknowledged = Column(Boolean, default=False)
    acknowledged_at = Column(DateTime)
