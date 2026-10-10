from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models import Asset, Prediction, SensorReading, MaintenanceLog, Alert
from sqlalchemy import func, desc
from datetime import datetime, timedelta

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/assets/health-report")
def get_assets_health_report(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Get comprehensive health report for all assets"""
    
    assets = db.query(Asset).all()
    
    report = {
        "generated_at": datetime.utcnow().isoformat(),
        "total_assets": len(assets),
        "assets": []
    }
    
    for asset in assets:
        # Get latest prediction
        prediction = db.query(Prediction).filter(
            Prediction.asset_id == asset.id
        ).order_by(desc(Prediction.updated_at)).first()
        
        # Get sensor count
        sensor_count = db.query(SensorReading).filter(
            SensorReading.asset_id == asset.id
        ).count()
        
        # Get active alerts
        active_alerts = db.query(Alert).filter(
            Alert.asset_id == asset.id,
            Alert.acknowledged == False
        ).count()
        
        # Get maintenance logs count
        maintenance_count = db.query(MaintenanceLog).filter(
            MaintenanceLog.asset_id == asset.id
        ).count()
        
        asset_health = {
            "asset_id": str(asset.id),
            "name": asset.name,
            "type": asset.type,
            "facility": asset.facility,
            "status": asset.status,
            "health_score": float(prediction.health_score) if prediction else 0.0,
            "risk_level": prediction.risk_level if prediction else "Unknown",
            "failure_probability": float(prediction.failure_probability) if prediction else 0.0,
            "sensor_readings_count": sensor_count,
            "active_alerts": active_alerts,
            "maintenance_records": maintenance_count,
            "last_prediction_update": prediction.updated_at.isoformat() if prediction else None
        }
        
        report["assets"].append(asset_health)
    
    # Summary statistics
    health_scores = [a["health_score"] for a in report["assets"]]
    report["summary"] = {
        "average_health": round(sum(health_scores) / len(health_scores), 2) if health_scores else 0,
        "critical_assets": sum(1 for a in report["assets"] if a["health_score"] < 20),
        "warning_assets": sum(1 for a in report["assets"] if 20 <= a["health_score"] < 60),
        "healthy_assets": sum(1 for a in report["assets"] if a["health_score"] >= 80),
        "total_active_alerts": sum(a["active_alerts"] for a in report["assets"])
    }
    
    return report


@router.get("/assets/{asset_id}/maintenance-summary")
def get_asset_maintenance_summary(asset_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Get maintenance history summary for specific asset"""
    
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    logs = db.query(MaintenanceLog).filter(
        MaintenanceLog.asset_id == asset_id
    ).order_by(desc(MaintenanceLog.date)).all()
    
    summary = {
        "asset_id": str(asset.id),
        "asset_name": asset.name,
        "total_maintenance_records": len(logs),
        "total_downtime_hours": sum(log.downtime or 0 for log in logs),
        "total_maintenance_cost": sum(log.cost or 0 for log in logs),
        "maintenance_history": [
            {
                "id": log.id,
                "action": log.action,
                "technician": log.technician,
                "performed_at": log.date.isoformat(),
                "downtime_hours": log.downtime,
                "cost": log.cost
            }
            for log in logs
        ]
    }
    
    return summary


@router.get("/alerts/trend")
def get_alerts_trend(days: int = 7, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Get alerts trend over specified days"""
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get alerts grouped by day and type
    alert_data = db.query(
        func.date(Alert.created_at).label("date"),
        Alert.type,
        func.count(Alert.id).label("count")
    ).filter(
        Alert.created_at >= start_date
    ).group_by(
        func.date(Alert.created_at),
        Alert.type
    ).order_by("date").all()
    
    # Format response
    trend = {
        "period_days": days,
        "start_date": start_date.isoformat(),
        "end_date": datetime.utcnow().isoformat(),
        "daily_breakdown": []
    }
    
    daily_totals = {}
    alert_types = set()
    
    for record in alert_data:
        date = str(record.date)
        alert_type = record.type
        count = record.count
        
        if date not in daily_totals:
            daily_totals[date] = {"date": date, "total": 0, "by_type": {}}
        
        daily_totals[date]["total"] += count
        daily_totals[date]["by_type"][alert_type] = count
        alert_types.add(alert_type)
    
    trend["daily_breakdown"] = list(daily_totals.values())
    trend["alert_types"] = list(alert_types)
    
    return trend


@router.get("/predictions/summary")
def get_predictions_summary(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Get summary of all predictions for all assets"""
    
    predictions = db.query(Prediction).all()
    
    summary = {
        "total_predictions": len(predictions),
        "risk_distribution": {
            "low": sum(1 for p in predictions if p.risk_level == "Low"),
            "medium": sum(1 for p in predictions if p.risk_level == "Medium"),
            "high": sum(1 for p in predictions if p.risk_level == "High")
        },
        "health_distribution": {
            "excellent": sum(1 for p in predictions if p.health_score >= 80),
            "good": sum(1 for p in predictions if 60 <= p.health_score < 80),
            "fair": sum(1 for p in predictions if 40 <= p.health_score < 60),
            "poor": sum(1 for p in predictions if 20 <= p.health_score < 40),
            "critical": sum(1 for p in predictions if p.health_score < 20)
        },
        "average_health_score": round(sum(p.health_score for p in predictions) / len(predictions), 2) if predictions else 0,
        "average_failure_probability": round(sum(p.failure_probability for p in predictions) / len(predictions), 2) if predictions else 0,
        "predictions": [
            {
                "asset_id": str(p.asset_id),
                "health_score": float(p.health_score),
                "risk_level": p.risk_level,
                "failure_probability": float(p.failure_probability),
                "updated_at": p.updated_at.isoformat()
            }
            for p in predictions
        ]
    }
    
    return summary
