from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.sensor import SensorReading
from app.models.prediction import Prediction
from app.ml.predict import predict
from app.services.scoring_service import calculate_health_score
from app.services.alert_service import check_and_create_alerts
from datetime import datetime


def calculate_prediction(db: Session, asset_id: str) -> dict:
    """
    Calculate failure prediction for asset based on latest sensor readings
    
    Returns:
        {
            "asset_id": UUID,
            "failure_probability": 0.0-1.0,
            "health_score": 0-100,
            "risk_level": "Low" | "Medium" | "High"
        }
    """
    
    # Get last 10 sensor readings
    readings = (
        db.query(SensorReading)
        .filter(SensorReading.asset_id == asset_id)
        .order_by(desc(SensorReading.timestamp))
        .limit(10)
        .all()
    )
    
    if not readings:
        raise ValueError(f"No sensor data found for asset {asset_id}")
    
    # Calculate averages
    avg_vibration = sum(r.vibration for r in readings if r.vibration) / len(readings)
    avg_temperature = sum(r.temperature for r in readings if r.temperature) / len(readings)
    avg_pressure = sum(r.pressure for r in readings if r.pressure) / len(readings)
    avg_runtime = sum(r.runtime_hours for r in readings if r.runtime_hours) / len(readings)
    
    # Get predictions from ML model
    ml_result = predict(avg_vibration, avg_temperature, avg_pressure, avg_runtime)
    
    # Calculate health score using scoring service
    health_score = calculate_health_score(avg_vibration, avg_temperature, avg_pressure, avg_runtime)
    
    return {
        "asset_id": asset_id,
        "failure_probability": ml_result["failure_probability"],
        "health_score": health_score,
        "risk_level": ml_result["risk_level"]
    }


def save_prediction(db: Session, asset_id: str) -> Prediction:
    """Calculate and save prediction for asset, trigger alert checks"""
    
    # Calculate prediction
    pred_data = calculate_prediction(db, asset_id)
    
    # Get latest sensor reading for alert thresholds
    latest_reading = (
        db.query(SensorReading)
        .filter(SensorReading.asset_id == asset_id)
        .order_by(desc(SensorReading.timestamp))
        .first()
    )
    
    # Check and create alerts if needed
    if latest_reading:
        check_and_create_alerts(
            db,
            asset_id,
            vibration=latest_reading.vibration,
            temperature=latest_reading.temperature,
            risk_level=pred_data["risk_level"]
        )
    
    # Update or create prediction record
    prediction = db.query(Prediction).filter(
        Prediction.asset_id == asset_id
    ).first()
    
    if prediction:
        prediction.failure_probability = pred_data["failure_probability"]
        prediction.health_score = pred_data["health_score"]
        prediction.risk_level = pred_data["risk_level"]
        prediction.updated_at = datetime.utcnow()
    else:
        prediction = Prediction(
            asset_id=asset_id,
            failure_probability=pred_data["failure_probability"],
            health_score=pred_data["health_score"],
            risk_level=pred_data["risk_level"]
        )
        db.add(prediction)
    
    db.commit()
    return prediction
