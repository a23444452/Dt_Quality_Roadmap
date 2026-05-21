from unittest.mock import patch

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


@patch("app.routers.auth.verify_azure_id_token")
def test_sso_login_new_user(mock_verify, client):
    mock_verify.return_value = {
        "preferred_username": "newuser@corning.com",
        "email": "newuser@corning.com",
        "name": "New User",
        "sub": "azure-sub-id",
    }
    resp = client.post("/api/v1/auth/sso-login", json={"id_token": "fake-token"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["data"]["status"] == "need_registration"
    assert data["data"]["username"] == "newuser"
    assert data["data"]["email"] == "newuser@corning.com"


@patch("app.routers.auth.verify_azure_id_token")
def test_sso_login_active_user(mock_verify, client, active_user):
    mock_verify.return_value = {
        "preferred_username": "testuser@corning.com",
        "email": "test@example.com",
        "name": "Test User",
        "sub": "azure-sub-id",
    }
    resp = client.post("/api/v1/auth/sso-login", json={"id_token": "fake-token"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["data"]["status"] == "authenticated"
    assert "access_token" in data["data"]
    assert data["data"]["user"]["username"] == "testuser"


@patch("app.routers.auth.verify_azure_id_token")
def test_sso_login_pending_user(mock_verify, client):
    client.post("/api/v1/auth/register", json={
        "username": "pendingsso",
        "email": "pending@corning.com",
        "password": "SecurePass1",
        "display_name": "Pending User",
    })
    mock_verify.return_value = {
        "preferred_username": "pendingsso@corning.com",
        "email": "pending@corning.com",
        "name": "Pending User",
        "sub": "azure-sub-id",
    }
    resp = client.post("/api/v1/auth/sso-login", json={"id_token": "fake-token"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["data"]["status"] == "pending_approval"


@patch("app.routers.auth.verify_azure_id_token")
def test_sso_login_invalid_token(mock_verify, client):
    from app.utils.azure_ad import AzureADTokenError
    mock_verify.side_effect = AzureADTokenError("Invalid or expired SSO token")
    resp = client.post("/api/v1/auth/sso-login", json={"id_token": "bad-token"})
    assert resp.status_code == 401


@patch("app.routers.auth.verify_azure_id_token")
def test_sso_register_success(mock_verify, client):
    mock_verify.return_value = {
        "preferred_username": "ssouser@corning.com",
        "email": "ssouser@corning.com",
        "name": "SSO User",
        "sub": "azure-sub-id",
    }
    resp = client.post("/api/v1/auth/sso-register", json={
        "id_token": "fake-token",
        "plant_ids": [],
        "process_ids": [],
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["success"] is True
    assert data["data"]["status"] == "pending"
    assert data["data"]["username"] == "ssouser"


@patch("app.routers.auth.verify_azure_id_token")
def test_sso_register_duplicate(mock_verify, client, active_user):
    mock_verify.return_value = {
        "preferred_username": "testuser@corning.com",
        "email": "test@example.com",
        "name": "Test User",
        "sub": "azure-sub-id",
    }
    resp = client.post("/api/v1/auth/sso-register", json={
        "id_token": "fake-token",
        "plant_ids": [],
        "process_ids": [],
    })
    assert resp.status_code == 409
