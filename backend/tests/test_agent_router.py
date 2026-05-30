"""Tests for agent router endpoints."""
import json
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import BigInteger, Integer, create_engine, event
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.dependencies import get_db
from app.main import app
from app.models.agent import AgentConversation
from app.models.user import User
from app.utils.security import create_access_token, hash_password


def _sqlite_bigint_workaround(target, connection, **kwargs):
    for table in target.tables.values():
        for col in table.columns:
            if col.primary_key and isinstance(col.type, BigInteger):
                col.type = Integer()


@pytest.fixture
def client():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    connection = engine.connect()

    event.listen(Base.metadata, "before_create", _sqlite_bigint_workaround)
    Base.metadata.create_all(bind=connection)
    event.remove(Base.metadata, "before_create", _sqlite_bigint_workaround)

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


def _create_user(client) -> tuple[str, int]:
    """Create a test user and return (auth_header_value, user_id)."""
    db = next(app.dependency_overrides[get_db]())
    user = User(
        username="testuser",
        email="test@corning.com",
        password_hash=hash_password("TestPass123"),
        display_name="Test User",
        role="viewer",
        status="active",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id, user.role)
    return f"Bearer {token}", user.id


def _auth_headers(client) -> dict:
    token_value, _ = _create_user(client)
    return {"Authorization": token_value}


def test_chat_rejects_too_long_message(client):
    headers = _auth_headers(client)
    resp = client.post(
        "/api/v1/agent/chat",
        json={"message": "x" * 2001},
        headers=headers,
    )
    assert resp.status_code == 400


def test_chat_rejects_empty_message(client):
    headers = _auth_headers(client)
    resp = client.post(
        "/api/v1/agent/chat",
        json={"message": "   "},
        headers=headers,
    )
    assert resp.status_code == 422


def test_conversations_list_empty(client):
    headers = _auth_headers(client)
    resp = client.get("/api/v1/agent/conversations", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["data"] == []


def test_delete_nonexistent_conversation(client):
    headers = _auth_headers(client)
    resp = client.delete(
        "/api/v1/agent/conversations/nonexistent-id",
        headers=headers,
    )
    assert resp.status_code == 404


@patch("app.routers.agent.stream_agent")
def test_chat_creates_conversation(mock_stream, client):
    headers, user_id = _create_user(client)
    headers = {"Authorization": headers}

    async def fake_stream(db, msgs):
        yield json.dumps({"type": "token", "content": "Hello"}) + "\n"
        yield json.dumps({"type": "done"}) + "\n"

    mock_stream.return_value = fake_stream(None, None)

    resp = client.post(
        "/api/v1/agent/chat",
        json={"message": "test question"},
        headers=headers,
    )
    assert resp.status_code == 200

    # Verify conversation was created
    db = next(app.dependency_overrides[get_db]())
    convs = db.query(AgentConversation).filter_by(user_id=user_id).all()
    assert len(convs) == 1
    assert convs[0].title == "test question"


@patch("app.routers.agent.stream_agent")
def test_chat_continues_existing_conversation(mock_stream, client):
    headers, user_id = _create_user(client)
    headers = {"Authorization": headers}

    # Create an existing conversation
    db = next(app.dependency_overrides[get_db]())
    conv = AgentConversation(
        id="existing-conv-id",
        user_id=user_id,
        title="Previous topic",
        messages=json.dumps([
            {"role": "user", "content": "hello"},
            {"role": "assistant", "content": "Hi there!"},
        ]),
    )
    db.add(conv)
    db.commit()

    async def fake_stream(db, msgs):
        yield json.dumps({"type": "token", "content": "Follow up"}) + "\n"
        yield json.dumps({"type": "done"}) + "\n"

    mock_stream.return_value = fake_stream(None, None)

    resp = client.post(
        "/api/v1/agent/chat",
        json={"message": "follow up question", "conversation_id": "existing-conv-id"},
        headers=headers,
    )
    assert resp.status_code == 200

    # Should not create a new conversation
    db2 = next(app.dependency_overrides[get_db]())
    convs = db2.query(AgentConversation).filter_by(user_id=user_id).all()
    assert len(convs) == 1
    assert convs[0].id == "existing-conv-id"


def test_conversations_list_returns_user_conversations(client):
    headers, user_id = _create_user(client)
    headers = {"Authorization": headers}

    db = next(app.dependency_overrides[get_db]())
    conv = AgentConversation(
        id="conv-1",
        user_id=user_id,
        title="Test conversation",
        messages=json.dumps([{"role": "user", "content": "hi"}]),
    )
    db.add(conv)
    db.commit()

    resp = client.get("/api/v1/agent/conversations", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert len(data["data"]) == 1
    assert data["data"][0]["id"] == "conv-1"
    assert data["data"][0]["title"] == "Test conversation"
    assert data["data"][0]["message_count"] == 1


def test_delete_conversation_soft_deletes(client):
    headers, user_id = _create_user(client)
    headers = {"Authorization": headers}

    db = next(app.dependency_overrides[get_db]())
    conv = AgentConversation(
        id="conv-to-delete",
        user_id=user_id,
        title="To be deleted",
        messages="[]",
    )
    db.add(conv)
    db.commit()

    resp = client.delete(
        "/api/v1/agent/conversations/conv-to-delete",
        headers=headers,
    )
    assert resp.status_code == 200

    # Should not appear in list
    resp = client.get("/api/v1/agent/conversations", headers=headers)
    assert resp.json()["data"] == []

    # But still in DB (soft delete)
    db2 = next(app.dependency_overrides[get_db]())
    conv_in_db = db2.query(AgentConversation).filter_by(id="conv-to-delete").first()
    assert conv_in_db is not None
    assert conv_in_db.is_active is False
