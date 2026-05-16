from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.asset import Asset
from app.models.maintenance_log import MaintenanceLog
from app.api.schemas.maintenance import MaintenanceLogCreate, MaintenanceLogResponse, MaintenanceRecommendation
from app.services.recommendation_service import get_maintenance_recommendations

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


@router.post("/log", response_model=MaintenanceLogResponse, status_code=status.HTTP_201_CREATED)
def create_maintenance_log(
    log: MaintenanceLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a maintenance log entry for an asset"""
    
    # Verify asset exists
    asset = db.query(Asset).filter(Asset.id == log.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Create log
    db_log = MaintenanceLog(**log.dict())
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    
    return db_log


@router.get("/log/{asset_id}", response_model=list[MaintenanceLogResponse])
def get_maintenance_logs(
    asset_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 50
):
    """Get maintenance history for an asset"""
    
    # Verify asset exists
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Get logs ordered by newest first
    logs = (
        db.query(MaintenanceLog)
        .filter(MaintenanceLog.asset_id == asset_id)
        .order_by(MaintenanceLog.date.desc())
        .limit(limit)
        .all()
    )
    
    return logs


@router.get("/recommendation/{asset_id}", response_model=MaintenanceRecommendation)
def get_asset_recommendation(
    asset_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get maintenance recommendations for an asset"""
    
    # Verify asset exists
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Generate recommendations
    rec = get_maintenance_recommendations(db, asset_id)
    
    return MaintenanceRecommendation(
        asset_id=rec["asset_id"],
        recommendations=rec["recommendations"],
        priority=rec["priority"]
    )
