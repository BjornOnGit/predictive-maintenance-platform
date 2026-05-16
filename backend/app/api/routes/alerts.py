from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.alert import Alert
from app.api.schemas.alert import AlertResponse
from app.services.alert_service import acknowledge_alert, get_active_alerts

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertResponse])
def list_alerts(
    asset_id: UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get active (unacknowledged) alerts, optionally filtered by asset"""
    
    alerts = get_active_alerts(db, asset_id=asset_id)
    return alerts


@router.patch("/{alert_id}/acknowledge", response_model=AlertResponse)
def ack_alert(
    alert_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Acknowledge an alert"""
    
    try:
        alert = acknowledge_alert(db, alert_id)
        return alert
    except ValueError:
        raise HTTPException(status_code=404, detail="Alert not found")
