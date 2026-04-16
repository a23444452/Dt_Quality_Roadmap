import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.dependencies import get_db
from app.main import app
from app.models.user import User
from app.utils.security import create_access_token, hash_password


@pytest.fixture
def client():
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


def _create_user(client, role: str, username: str, status: str = "active") -> tuple[int, str]:
    """Create a user in the DB and return (user_id, JWT token)."""
    db = next(app.dependency_overrides[get_db]())
    user = User(
        username=username,
        email=f"{username}@example.com",
        password_hash=hash_password("TestPass123"),
        display_name=username.capitalize(),
        role=role,
        status=status,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id, user.role)
    return user.id, token


def admin_headers(client) -> dict:
    _, token = _create_user(client, "admin", "adminuser")
    return {"Authorization": f"Bearer {token}"}


def editor_headers(client) -> dict:
    _, token = _create_user(client, "editor", "editoruser")
    return {"Authorization": f"Bearer {token}"}


def test_list_users_as_admin(client):
    admin_hdrs = admin_headers(client)
    resp = client.get("/api/v1/users", headers=admin_hdrs)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert isinstance(data["data"], list)
    assert "total" in data["meta"]
    assert "page" in data["meta"]
    assert "limit" in data["meta"]


def test_list_users_as_non_admin(client):
    editor_hdrs = editor_headers(client)
    resp = client.get("/api/v1/users", headers=editor_hdrs)
    assert resp.status_code == 403


def test_list_users_filter_by_status(client):
    admin_hdrs = admin_headers(client)
    # Create a pending user
    _create_user(client, "viewer", "pendinguser", status="pending")

    resp = client.get("/api/v1/users?status=pending", headers=admin_hdrs)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert all(u["status"] == "pending" for u in data["data"])
    assert data["meta"]["total"] >= 1


def test_approve_pending_user(client):
    admin_hdrs = admin_headers(client)
    user_id, _ = _create_user(client, "viewer", "pendinguser2", status="pending")

    resp = client.put(
        f"/api/v1/users/{user_id}/approve",
        json={"role": "editor"},
        headers=admin_hdrs,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["data"]["status"] == "active"
    assert data["data"]["role"] == "editor"


def test_reject_user(client):
    admin_hdrs = admin_headers(client)
    user_id, _ = _create_user(client, "viewer", "rejectme", status="pending")

    resp = client.put(
        f"/api/v1/users/{user_id}/reject",
        json={},
        headers=admin_hdrs,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["data"]["status"] == "rejected"


def test_disable_user(client):
    admin_hdrs = admin_headers(client)
    user_id, _ = _create_user(client, "viewer", "disableme", status="active")

    resp = client.put(f"/api/v1/users/{user_id}/disable", headers=admin_hdrs)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["data"]["status"] == "disabled"


def test_reset_password_returns_temp_password(client):
    admin_hdrs = admin_headers(client)
    user_id, _ = _create_user(client, "viewer", "resetme", status="active")

    resp = client.put(f"/api/v1/users/{user_id}/reset-password", headers=admin_hdrs)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "temporary_password" in data["data"]
    assert len(data["data"]["temporary_password"]) == 12
    assert data["data"]["message"] == "Password has been reset."


def test_approve_nonexistent_user(client):
    admin_hdrs = admin_headers(client)
    resp = client.put("/api/v1/users/99999/approve", json={"role": "viewer"}, headers=admin_hdrs)
    assert resp.status_code == 404


def test_reject_nonexistent_user(client):
    admin_hdrs = admin_headers(client)
    resp = client.put("/api/v1/users/99999/reject", json={}, headers=admin_hdrs)
    assert resp.status_code == 404


def test_disable_nonexistent_user(client):
    admin_hdrs = admin_headers(client)
    resp = client.put("/api/v1/users/99999/disable", headers=admin_hdrs)
    assert resp.status_code == 404


def test_reset_password_nonexistent_user(client):
    admin_hdrs = admin_headers(client)
    resp = client.put("/api/v1/users/99999/reset-password", headers=admin_hdrs)
    assert resp.status_code == 404
