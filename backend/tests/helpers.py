import uuid

from sqlalchemy import update

from app.core.database import SessionLocal
from app.models.user import User

PASSWORD = "password123"


def make_user(client, role="viewer"):
    """Register + log in a fresh user; returns auth headers. Roles are set directly in the DB."""
    email = f"{uuid.uuid4().hex[:10]}@test.dev"
    res = client.post("/auth/register", json={"email": email, "password": PASSWORD})
    assert res.status_code in (200, 201), res.text
    if role != "viewer":
        with SessionLocal() as db:
            db.execute(update(User).where(User.email == email).values(role=role))
            db.commit()
    token = client.post("/auth/login", json={"email": email, "password": PASSWORD}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def make_asset(client, headers):
    res = client.post(
        "/assets",
        json={"name": "Test Pump", "type": "Pump", "facility": "Plant 1"},
        headers=headers,
    )
    assert res.status_code == 201, res.text
    return res.json()["id"]
