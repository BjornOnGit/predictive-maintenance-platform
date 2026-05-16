"""
Alert Service for Equipment Anomalies

Creates and manages alerts based on sensor readings and predictions.
Prevents duplicate active alerts for the same asset/type combination.
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models.alert import Alert
from datetime import datetime


ALERT_THRESHOLDS = {
    "vibration": 6.0,  # mm/s
    "temperature": 85.0,  # Celsius
}


def check_and_create_alerts(
    db: Session,
    asset_id: str,
    vibration: float = None,
    temperature: float = None,
    risk_level: str = None
) -> list[Alert]:
    """
    Check sensor readings and risk level against thresholds.
    Create new alerts if thresholds exceeded and no active alert exists.
    
    Returns:
        List of newly created alerts (empty if none triggered)
    """
    
    new_alerts = []
    
    # Check vibration alert
    if vibration is not None and vibration > ALERT_THRESHOLDS["vibration"]:
        alert = _create_alert_if_needed(
            db, asset_id, 
            type_="vibration",
            message=f"High vibration detected: {vibration:.2f} mm/s (threshold: {ALERT_THRESHOLDS['vibration']})",
            severity="critical"
        )
        if alert:
            new_alerts.append(alert)
    
    # Check temperature alert
    if temperature is not None and temperature > ALERT_THRESHOLDS["temperature"]:
        alert = _create_alert_if_needed(
            db, asset_id,
            type_="temperature",
            message=f"High temperature detected: {temperature:.1f}°C (threshold: {ALERT_THRESHOLDS['temperature']})",
            severity="critical"
        )
        if alert:
            new_alerts.append(alert)
    
    # Check high-risk alert
    if risk_level == "High":
        alert = _create_alert_if_needed(
            db, asset_id,
            type_="high_risk",
            message="High failure risk detected - immediate maintenance recommended",
            severity="critical"
        )
        if alert:
            new_alerts.append(alert)
    
    return new_alerts


def _create_alert_if_needed(
    db: Session,
    asset_id: str,
    type_: str,
    message: str,
    severity: str
) -> Alert | None:
    """
    Create alert only if no active (unacknowledged) alert exists for this asset/type.
    Returns created alert or None if duplicate prevented.
    """
    
    # Check for active alert
    active_alert = db.query(Alert).filter(
        and_(
            Alert.asset_id == asset_id,
            Alert.type == type_,
            Alert.acknowledged == False
        )
    ).first()
    
    if active_alert:
        return None  # Duplicate prevented
    
    # Create new alert
    alert = Alert(
        asset_id=asset_id,
        type=type_,
        message=message,
        severity=severity
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    
    return alert


def acknowledge_alert(db: Session, alert_id: str) -> Alert:
    """Mark alert as acknowledged"""
    
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise ValueError(f"Alert {alert_id} not found")
    
    alert.acknowledged = True
    alert.acknowledged_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)
    
    return alert


def get_active_alerts(db: Session, asset_id: str = None) -> list[Alert]:
    """Get all active (unacknowledged) alerts, optionally filtered by asset"""
    
    query = db.query(Alert).filter(Alert.acknowledged == False).order_by(Alert.created_at.desc())
    
    if asset_id:
        query = query.filter(Alert.asset_id == asset_id)
    
    return query.all()
