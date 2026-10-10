from app.ml.predict import predict


def test_normal_conditions_are_low_risk():
    result = predict(2.0, 50, 3.9, 7500)
    assert result["risk_level"] == "Low"


def test_stressed_conditions_are_high_risk():
    result = predict(11, 85, 6.2, 7500)
    assert result["risk_level"] == "High"
    assert 0 <= result["failure_probability"] <= 1
