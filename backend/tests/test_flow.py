from tests.helpers import make_asset

READING = {"vibration": 2.0, "temperature": 50, "pressure": 3.9, "runtime_hours": 7500}


def test_sensor_post_and_recalculate(client, engineer):
    # Redis is not running in tests: the sensor post must still succeed (queueing is best-effort)
    asset_id = make_asset(client, engineer)
    res = client.post("/sensors/data", json={"asset_id": asset_id, **READING}, headers=engineer)
    assert res.status_code == 201, res.text

    res = client.post(f"/predictions/{asset_id}/recalculate", headers=engineer)
    assert res.status_code == 200, res.text
    assert res.json()["risk_level"] in ("Low", "Medium", "High")


def test_maintenance_log_feeds_summary_and_csv(client, engineer):
    # Regression test: these endpoints used column names the model does not have and returned 500
    asset_id = make_asset(client, engineer)
    log = {"asset_id": asset_id, "action": "overheating", "technician": "T1", "cost": 100, "downtime": 1}
    assert client.post("/maintenance/log", json=log, headers=engineer).status_code == 201

    summary = client.get(f"/analytics/assets/{asset_id}/maintenance-summary", headers=engineer)
    assert summary.status_code == 200, summary.text

    export = client.get("/reporting/maintenance/export-csv", headers=engineer)
    assert export.status_code == 200, export.text
    assert "overheating" in export.json()["data"]
