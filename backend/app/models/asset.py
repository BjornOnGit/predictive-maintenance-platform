from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from app.core.database import Base


class Asset(Base):
    __tablename__ = "assets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # pump, compressor, turbine, motor, blower, fan, gearbox
    facility = Column(String, nullable=False)
    manufacturer = Column(String)
    install_date = Column(DateTime)
    status = Column(String, default="operational")  # operational, warning, critical, offline
    created_at = Column(DateTime, default=datetime.utcnow)
