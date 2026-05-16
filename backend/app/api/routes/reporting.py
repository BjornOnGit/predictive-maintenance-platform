from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models import Asset, Prediction, Alert, MaintenanceLog
from sqlalchemy import func, desc
from datetime import datetime, timedelta
import csv
import io

router = APIRouter(prefix="/reporting", tags=["reporting"])


@router.get("/assets/export-csv")
def export_assets_csv(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Export all assets with their health status to CSV"""
    
    assets = db.query(Asset).all()
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(["Asset ID", "Name", "Type", "Facility", "Status", "Manufacturer", "Install Date"])
    
    # Write data
    for asset in assets:
        writer.writerow([
            str(asset.id),
            asset.name,
            asset.type,
            asset.facility,
            asset.status,
            asset.manufacturer or "",
            asset.install_date.isoformat() if asset.install_date else ""
        ])
    
    csv_content = output.getvalue()
    
    return {
        "format": "csv",
        "timestamp": datetime.utcnow().isoformat(),
        "total_records": len(assets),
        "data": csv_content
    }


@router.get("/maintenance/export-csv")
def export_maintenance_csv(
    asset_id: str | None = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Export maintenance logs to CSV, optionally filtered by asset"""
    
    query = db.query(MaintenanceLog)
    if asset_id:
        query = query.filter(MaintenanceLog.asset_id == asset_id)
    
    logs = query.order_by(desc(MaintenanceLog.performed_at)).all()
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(["Log ID", "Asset ID", "Action", "Technician", "Performed At", "Downtime Hours", "Cost", "Notes"])
    
    # Write data
    for log in logs:
        writer.writerow([
            str(log.id),
            str(log.asset_id),
            log.action,
            log.technician,
            log.performed_at.isoformat(),
            log.downtime_hours,
            log.cost,
            log.notes or ""
        ])
    
    csv_content = output.getvalue()
    
    return {
        "format": "csv",
        "timestamp": datetime.utcnow().isoformat(),
        "total_records": len(logs),
        "filter_asset_id": asset_id,
        "data": csv_content
    }


@router.get("/alerts/export-csv")
def export_alerts_csv(
    asset_id: str | None = None,
    alert_type: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Export alerts to CSV with filtering options"""
    
    query = db.query(Alert)
    
    if asset_id:
        query = query.filter(Alert.asset_id == asset_id)
    if alert_type:
        query = query.filter(Alert.type == alert_type)
    if start_date:
        try:
            start = datetime.fromisoformat(start_date)
            query = query.filter(Alert.created_at >= start)
        except:
            pass
    if end_date:
        try:
            end = datetime.fromisoformat(end_date)
            query = query.filter(Alert.created_at <= end)
        except:
            pass
    
    alerts = query.order_by(desc(Alert.created_at)).all()
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(["Alert ID", "Asset ID", "Type", "Severity", "Message", "Created At", "Acknowledged", "Acknowledged At"])
    
    # Write data
    for alert in alerts:
        writer.writerow([
            str(alert.id),
            str(alert.asset_id),
            alert.type,
            alert.severity,
            alert.message,
            alert.created_at.isoformat(),
            "Yes" if alert.acknowledged else "No",
            alert.acknowledged_at.isoformat() if alert.acknowledged_at else ""
        ])
    
    csv_content = output.getvalue()
    
    return {
        "format": "csv",
        "timestamp": datetime.utcnow().isoformat(),
        "total_records": len(alerts),
        "filters": {
            "asset_id": asset_id,
            "alert_type": alert_type,
            "start_date": start_date,
            "end_date": end_date
        },
        "data": csv_content
    }


@router.get("/health-scorecard")
def get_health_scorecard(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Generate health scorecard report for all assets"""
    
    assets = db.query(Asset).all()
    predictions = db.query(Prediction).all()
    alerts = db.query(Alert).all()
    
    # Create prediction lookup
    pred_by_asset = {p.asset_id: p for p in predictions}
    
    # Asset health breakdown
    health_categories = {
        "Excellent": 0,  # >= 80
        "Good": 0,       # 60-79
        "Fair": 0,       # 40-59
        "Poor": 0,       # 20-39
        "Critical": 0    # < 20
    }
    
    asset_scores = []
    
    for asset in assets:
        pred = pred_by_asset.get(asset.id)
        score = pred.health_score if pred else 0
        
        if score >= 80:
            category = "Excellent"
        elif score >= 60:
            category = "Good"
        elif score >= 40:
            category = "Fair"
        elif score >= 20:
            category = "Poor"
        else:
            category = "Critical"
        
        health_categories[category] += 1
        
        asset_scores.append({
            "asset_id": str(asset.id),
            "name": asset.name,
            "health_score": float(score),
            "category": category,
            "risk_level": pred.risk_level if pred else "Unknown",
            "active_alerts": len([a for a in alerts if a.asset_id == asset.id and not a.acknowledged])
        })
    
    # Sort by health score
    asset_scores.sort(key=lambda x: x["health_score"])
    
    return {
        "generated_at": datetime.utcnow().isoformat(),
        "total_assets": len(assets),
        "health_distribution": health_categories,
        "assets": asset_scores,
        "summary": {
            "total_active_alerts": len([a for a in alerts if not a.acknowledged]),
            "assets_requiring_attention": sum(1 for a in asset_scores if a["health_score"] < 60),
            "critical_assets": sum(1 for a in asset_scores if a["health_score"] < 20)
        }
    }


@router.get("/maintenance-forecast")
def get_maintenance_forecast(
    days_ahead: int = 30,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Forecast maintenance needs based on predictions"""
    
    predictions = db.query(Prediction).filter(
        Prediction.failure_probability > 0.3
    ).order_by(desc(Prediction.failure_probability)).all()
    
    forecast_date = datetime.utcnow() + timedelta(days=days_ahead)
    
    # Group by risk level and create recommendations
    recommendations = []
    
    for pred in predictions:
        asset = db.query(Asset).filter(Asset.id == pred.asset_id).first()
        if not asset:
            continue
        
        # Estimate maintenance urgency
        if pred.failure_probability > 0.7:
            priority = "URGENT"
            estimated_days = 3
        elif pred.failure_probability > 0.5:
            priority = "HIGH"
            estimated_days = 7
        else:
            priority = "MEDIUM"
            estimated_days = 14
        
        recommended_date = datetime.utcnow() + timedelta(days=estimated_days)
        
        recommendations.append({
            "asset_id": str(asset.id),
            "asset_name": asset.name,
            "asset_type": asset.type,
            "failure_probability": float(pred.failure_probability),
            "health_score": float(pred.health_score),
            "priority": priority,
            "estimated_maintenance_date": recommended_date.isoformat(),
            "estimated_days_until_failure": estimated_days
        })
    
    return {
        "generated_at": datetime.utcnow().isoformat(),
        "forecast_horizon_days": days_ahead,
        "total_recommendations": len(recommendations),
        "by_priority": {
            "urgent": len([r for r in recommendations if r["priority"] == "URGENT"]),
            "high": len([r for r in recommendations if r["priority"] == "HIGH"]),
            "medium": len([r for r in recommendations if r["priority"] == "MEDIUM"])
        },
        "recommendations": recommendations
    }
