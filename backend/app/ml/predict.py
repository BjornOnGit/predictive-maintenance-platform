import pickle
import os
from typing import Dict, Optional

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, "models", "failure_model.pkl")

# Global model cache
_model = None


def load_model():
    """Load trained model from disk"""
    global _model
    
    if _model is not None:
        return _model
    
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"Model not found at {MODEL_PATH}. "
            "Please run: python -m app.ml.train"
        )
    
    with open(MODEL_PATH, "rb") as f:
        _model = pickle.load(f)
    
    return _model


def predict(
    vibration: float,
    temperature: float,
    pressure: float,
    runtime_hours: float
) -> Dict[str, float]:
    """
    Predict failure probability given sensor readings
    
    Returns:
        {
            "failure_probability": 0.0-1.0,
            "risk_level": "Low" | "Medium" | "High"
        }
    """
    
    model = load_model()
    
    # Prepare features in order: vibration, temperature, pressure, runtime_hours
    features = [[vibration, temperature, pressure, runtime_hours]]
    
    # Get probability
    probability = model.predict_proba(features)[0][1]  # Probability of class 1 (failure)
    
    # Map to risk level
    if probability < 0.3:
        risk_level = "Low"
    elif probability < 0.7:
        risk_level = "Medium"
    else:
        risk_level = "High"
    
    return {
        "failure_probability": float(probability),
        "risk_level": risk_level
    }


if __name__ == "__main__":
    # Test prediction
    print("Testing prediction...")
    
    # Normal operating conditions
    result = predict(
        vibration=2.0,
        temperature=50.0,
        pressure=4.0,
        runtime_hours=1500
    )
    print(f"Normal conditions: {result}")
    
    # High-stress conditions
    result = predict(
        vibration=9.5,
        temperature=85.0,
        pressure=6.2,
        runtime_hours=2000
    )
    print(f"High-stress conditions: {result}")
