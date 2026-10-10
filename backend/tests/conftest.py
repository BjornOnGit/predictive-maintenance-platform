import os

os.environ.setdefault("SECRET_KEY", "test-secret-key")  # must be set before the app is imported

import pytest
from fastapi.testclient import TestClient

from app.main import app
from tests.helpers import make_user


@pytest.fixture(scope="session")
def client():
    return TestClient(app)


@pytest.fixture
def viewer(client):
    return make_user(client, "viewer")


@pytest.fixture
def engineer(client):
    return make_user(client, "engineer")
