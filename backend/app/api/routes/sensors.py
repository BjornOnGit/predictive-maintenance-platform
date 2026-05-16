from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.asset import Asset
from app.models.sensor import SensorReading
from app.schemas.sensor import SensorInput, SensorReadingResponse
from app.services.prediction_service import save_prediction

router = APIRouter(prefix="/sensors", tags=["sensors"])


@router.post("/data", response_model=SensorReadingResponse, status_code=status.HTTP_201_CREATED)
def post_sensor_data(
    sensor_data: SensorInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify asset exists
    asset = db.query(Asset).filter(Asset.id == sensor_data.asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset {sensor_data.asset_id} not found"
        )
    
    # Create sensor reading
    reading = SensorReading(**sensor_data.dict())
    db.add(reading)
    db.commit()
    db.refresh(reading)
    
    # Trigger prediction update
    try:
        save_prediction(db, sensor_data.asset_id)
    except Exception as e:
        # Log but don't fail sensor post
        from app.core.logging import logger
        logger.warning(f"Failed to update prediction for asset {sensor_data.asset_id}: {e}")
    
    return reading


@router.get("/history/{asset_id}", response_model=list[SensorReadingResponse])
def get_sensor_history(
    asset_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 100
):
    # Verify asset exists
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset {asset_id} not found"
        )
    
    # Get readings ordered by newest first
    readings = (
        db.query(SensorReading)
        .filter(SensorReading.asset_id == asset_id)
        .order_by(SensorReading.timestamp.desc())
        .limit(limit)
        .all()
    )
    
    return readings
