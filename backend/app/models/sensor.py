from sqlalchemy import Column, Float, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from app.core.database import Base


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    vibration = Column(Float)  # mm/s
    temperature = Column(Float)  # Celsius
    pressure = Column(Float)  # bar
    runtime_hours = Column(Float)
    rpm = Column(Float)
