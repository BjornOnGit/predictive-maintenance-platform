import uuid

from tests.helpers import PASSWORD, make_asset


def test_register_rejects_short_password(client):
    res = client.post("/auth/register", json={"email": f"{uuid.uuid4().hex[:8]}@test.dev", "password": "short"})
    assert res.status_code == 422


def test_duplicate_email_is_rejected(client):
    email = f"{uuid.uuid4().hex[:8]}@test.dev"
    assert client.post("/auth/register", json={"email": email, "password": PASSWORD}).status_code in (200, 201)
    assert client.post("/auth/register", json={"email": email, "password": PASSWORD}).status_code in (400, 409)


def test_wrong_password_is_rejected(client):
    email = f"{uuid.uuid4().hex[:8]}@test.dev"
    client.post("/auth/register", json={"email": email, "password": PASSWORD})
    assert client.post("/auth/login", json={"email": email, "password": "wrong-password"}).status_code == 401


def test_endpoints_require_auth(client):
    assert client.get("/assets").status_code in (401, 403)


def test_viewer_is_read_only(client, viewer):
    assert client.get("/assets", headers=viewer).status_code == 200
    res = client.post("/assets", json={"name": "X", "type": "Pump", "facility": "F"}, headers=viewer)
    assert res.status_code == 403


def test_engineer_can_write(client, engineer):
    assert make_asset(client, engineer)
