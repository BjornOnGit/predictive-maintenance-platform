from sqlalchemy import Column, Float, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from app.core.database import Base


class Prediction(Base):
    __tablename__ = "predictions"

    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), primary_key=True)
    failure_probability = Column(Float, nullable=False)
    health_score = Column(Float, nullable=False)  # 0-100
    risk_level = Column(String, nullable=False)  # Low, Medium, High
    predicted_failure_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
