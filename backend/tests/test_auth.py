import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.dependencies import get_db
from app.main import app
from app.models.user import User
from app.utils.security import hash_password


@pytest.fixture
def client():
    # Use a single shared connection so all sessions share the same in-memory DB
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    connection = engine.connect()
    Base.metadata.create_all(bind=connection)
    TestSession = sessionmaker(bind=connection)

    def override_get_db():
        session = TestSession()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=connection)
    connection.close()


@pytest.fixture
def active_user(client):
    """Create an active user directly in DB."""
    db = next(app.dependency_overrides[get_db]())
    user = User(
        username="testuser",
        email="test@example.com",
        password_hash=hash_password("TestPass123"),
        display_name="Test User",
        role="editor",
        status="active",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_register_success(client):
    resp = client.post("/api/v1/auth/register", json={
        "username": "newuser",
        "email": "new@example.com",
        "password": "SecurePass1",
        "display_name": "New User",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["success"] is True
    assert data["data"]["status"] == "pending"


def test_register_weak_password(client):
    resp = client.post("/api/v1/auth/register", json={
        "username": "newuser",
        "email": "new@example.com",
        "password": "weak",
        "display_name": "New User",
    })
    assert resp.status_code == 422


def test_login_success(client, active_user):
    resp = client.post("/api/v1/auth/login", json={
        "username": "testuser",
        "password": "TestPass123",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "access_token" in data["data"]
    assert data["data"]["user"]["role"] == "editor"
    assert "refresh_token" in resp.cookies


def test_login_wrong_password(client, active_user):
    resp = client.post("/api/v1/auth/login", json={
        "username": "testuser",
        "password": "WrongPass1",
    })
    assert resp.status_code == 401


def test_login_pending_user(client):
    client.post("/api/v1/auth/register", json={
        "username": "pending",
        "email": "p@e.com",
        "password": "SecurePass1",
        "display_name": "Pending",
    })
    resp = client.post("/api/v1/auth/login", json={
        "username": "pending",
        "password": "SecurePass1",
    })
    assert resp.status_code == 401
