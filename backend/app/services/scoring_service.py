"""
Health Scoring Service for Equipment Condition Assessment

Scoring Rules:
- Start with 100 points
- Deduct points for:
  1. Vibration excess (max 30 points)
  2. Temperature excess (max 30 points)
  3. Runtime age (max 20 points)
- Clamp final score to 0-100 range
"""


# Thresholds
VIBRATION_WARNING = 3.0  # mm/s - warning threshold
VIBRATION_CRITICAL = 6.0  # mm/s - critical threshold
VIBRATION_MAX_DEDUCTION = 30  # points

TEMPERATURE_WARNING = 60.0  # Celsius - warning threshold
TEMPERATURE_CRITICAL = 85.0  # Celsius - critical threshold
TEMPERATURE_MAX_DEDUCTION = 30  # points

RUNTIME_WARNING = 2000.0  # hours - equipment aged
RUNTIME_CRITICAL = 5000.0  # hours - equipment very aged
RUNTIME_MAX_DEDUCTION = 20  # points


def calculate_health_score(
    vibration: float,
    temperature: float,
    pressure: float,
    runtime_hours: float
) -> float:
    """
    Calculate equipment health score (0-100).
    
    Args:
        vibration: Current vibration in mm/s
        temperature: Current temperature in Celsius
        pressure: Current pressure in bar (not used for scoring currently)
        runtime_hours: Total equipment runtime hours
    
    Returns:
        Health score from 0 (failed) to 100 (excellent)
    """
    
    score = 100.0
    
    # Deduct points for vibration excess
    if vibration > VIBRATION_WARNING:
        if vibration >= VIBRATION_CRITICAL:
            # Critical: full deduction
            score -= VIBRATION_MAX_DEDUCTION
        else:
            # Warning: proportional deduction
            excess = vibration - VIBRATION_WARNING
            range_width = VIBRATION_CRITICAL - VIBRATION_WARNING
            deduction = (excess / range_width) * VIBRATION_MAX_DEDUCTION
            score -= deduction
    
    # Deduct points for temperature excess
    if temperature > TEMPERATURE_WARNING:
        if temperature >= TEMPERATURE_CRITICAL:
            # Critical: full deduction
            score -= TEMPERATURE_MAX_DEDUCTION
        else:
            # Warning: proportional deduction
            excess = temperature - TEMPERATURE_WARNING
            range_width = TEMPERATURE_CRITICAL - TEMPERATURE_WARNING
            deduction = (excess / range_width) * TEMPERATURE_MAX_DEDUCTION
            score -= deduction
    
    # Deduct points for runtime age
    if runtime_hours > RUNTIME_WARNING:
        if runtime_hours >= RUNTIME_CRITICAL:
            # Critical age: full deduction
            score -= RUNTIME_MAX_DEDUCTION
        else:
            # Warning: proportional deduction
            excess = runtime_hours - RUNTIME_WARNING
            range_width = RUNTIME_CRITICAL - RUNTIME_WARNING
            deduction = (excess / range_width) * RUNTIME_MAX_DEDUCTION
            score -= deduction
    
    # Clamp to 0-100 range
    return max(0.0, min(100.0, score))


def get_health_category(score: float) -> str:
    """Map score to health category"""
    if score >= 80:
        return "Excellent"
    elif score >= 60:
        return "Good"
    elif score >= 40:
        return "Fair"
    elif score >= 20:
        return "Poor"
    else:
        return "Critical"


if __name__ == "__main__":
    # Test scoring
    print("Testing health scoring...")
    
    # Excellent condition
    score = calculate_health_score(1.5, 50.0, 4.0, 1000)
    print(f"Normal: {score:.1f} ({get_health_category(score)})")
    
    # Warning vibration
    score = calculate_health_score(4.5, 50.0, 4.0, 1000)
    print(f"High vibration: {score:.1f} ({get_health_category(score)})")
    
    # Warning temperature
    score = calculate_health_score(2.0, 70.0, 4.0, 1000)
    print(f"High temperature: {score:.1f} ({get_health_category(score)})")
    
    # Old equipment
    score = calculate_health_score(2.0, 50.0, 4.0, 3000)
    print(f"Old equipment: {score:.1f} ({get_health_category(score)})")
    
    # Critical condition
    score = calculate_health_score(8.0, 90.0, 4.0, 5500)
    print(f"Critical: {score:.1f} ({get_health_category(score)})")
