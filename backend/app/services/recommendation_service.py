"""
Maintenance Recommendation Service

Generates maintenance recommendations based on sensor readings,
health score, and failure prediction.
"""

from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.sensor import SensorReading
from app.models.prediction import Prediction


def get_maintenance_recommendations(db: Session, asset_id: str) -> dict:
    """
    Generate maintenance recommendations for an asset.
    
    Returns:
        {
            "asset_id": UUID,
            "recommendations": [...],
            "priority": "low" | "medium" | "high" | "critical"
        }
    """
    
    recommendations = []
    priority = "low"
    
    # Get latest prediction
    prediction = db.query(Prediction).filter(
        Prediction.asset_id == asset_id
    ).first()
    
    # Get latest sensor reading
    latest_reading = (
        db.query(SensorReading)
        .filter(SensorReading.asset_id == asset_id)
        .order_by(desc(SensorReading.timestamp))
        .first()
    )
    
    if not latest_reading:
        return {
            "asset_id": asset_id,
            "recommendations": ["No sensor data available"],
            "priority": "low"
        }
    
    # Vibration-based rules
    if latest_reading.vibration is not None:
        if latest_reading.vibration > 8.0:
            recommendations.append("URGENT: Inspect and possibly replace bearings (critical vibration)")
            priority = "critical"
        elif latest_reading.vibration > 6.0:
            recommendations.append("Inspect bearings for wear (high vibration detected)")
            if priority != "critical":
                priority = "high"
        elif latest_reading.vibration > 4.0:
            recommendations.append("Monitor bearing condition (moderate vibration)")
            if priority == "low":
                priority = "medium"
    
    # Temperature-based rules
    if latest_reading.temperature is not None:
        if latest_reading.temperature > 90.0:
            recommendations.append("URGENT: Check lubrication system immediately (critical temperature)")
            priority = "critical"
        elif latest_reading.temperature > 85.0:
            recommendations.append("Inspect lubrication levels and condition (high temperature)")
            if priority != "critical":
                priority = "high"
        elif latest_reading.temperature > 70.0:
            recommendations.append("Check cooling system efficiency (elevated temperature)")
            if priority == "low":
                priority = "medium"
    
    # Pressure-based rules
    if latest_reading.pressure is not None:
        if latest_reading.pressure > 6.5:
            recommendations.append("Inspect pressure relief valve (pressure above normal)")
            if priority == "low":
                priority = "medium"
    
    # Runtime age rules
    if latest_reading.runtime_hours is not None:
        if latest_reading.runtime_hours > 5000:
            recommendations.append("Equipment is heavily used - consider preventive replacement of wear components")
            if priority == "low":
                priority = "medium"
        elif latest_reading.runtime_hours > 3000:
            recommendations.append("Equipment approaching major service interval")
    
    # Failure prediction rules
    if prediction:
        if prediction.risk_level == "High":
            recommendations.append("Failure risk is HIGH - schedule preventive maintenance soon")
            if priority not in ["critical", "high"]:
                priority = "high"
        elif prediction.risk_level == "Medium":
            recommendations.append("Failure risk is MEDIUM - monitor closely and plan maintenance")
            if priority == "low":
                priority = "medium"
        
        if prediction.health_score < 20:
            recommendations.append("Equipment health is CRITICAL - immediate intervention required")
            priority = "critical"
        elif prediction.health_score < 40:
            recommendations.append("Equipment health is POOR - urgent maintenance needed")
            if priority != "critical":
                priority = "high"
    
    # Default if no issues detected
    if not recommendations:
        recommendations.append("Equipment operating normally - continue routine monitoring")
    
    return {
        "asset_id": asset_id,
        "recommendations": recommendations,
        "priority": priority
    }
