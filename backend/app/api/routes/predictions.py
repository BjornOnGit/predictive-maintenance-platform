from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from app.core.database import get_db
from app.api.deps import get_current_user, require_engineer
from app.models.user import User
from app.models.asset import Asset
from app.models.prediction import Prediction
from app.api.schemas.prediction import PredictionResponse
from app.services.prediction_service import save_prediction

router = APIRouter(prefix="/predictions", tags=["predictions"])


@router.get("/all", response_model=list[PredictionResponse])
def get_all_predictions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get predictions for all assets"""
    predictions = db.query(Prediction).order_by(
        Prediction.updated_at.desc()
    ).all()
    return predictions


@router.get("/{asset_id}", response_model=PredictionResponse)
def get_prediction(
    asset_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get latest prediction for asset"""
    
    # Verify asset exists
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Get or calculate prediction
    prediction = db.query(Prediction).filter(
        Prediction.asset_id == asset_id
    ).first()
    
    if not prediction:
        # Calculate on first request
        prediction = save_prediction(db, asset_id)
    
    return prediction


@router.post("/{asset_id}/recalculate", response_model=PredictionResponse)
def recalculate_prediction(
    asset_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_engineer)
):
    """Force recalculation of prediction for asset"""
    
    # Verify asset exists
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Recalculate
    prediction = save_prediction(db, asset_id)
    return prediction
