"""Integration test: verify full agent conversation lifecycle with mocked LLM.

Uses a shared-session fixture to ensure streaming response commits are visible
to subsequent queries (SQLite in-memory + multiple sessions on one connection
causes transaction isolation issues with streaming generators).
"""
import json
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import BigInteger, Integer, create_engine, event
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.dependencies import get_db
from app.main import app
from app.models.agent import AgentConversation
from app.models.user import User
from app.utils.security import create_access_token, hash_password

import pytest


def _sqlite_bigint_workaround(target, connection, **kwargs):
    for table in target.tables.values():
        for col in table.columns:
            if col.primary_key and isinstance(col.type, BigInteger):
                col.type = Integer()


@pytest.fixture
def client():
    """Create test client with a shared session to avoid streaming commit issues."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    connection = engine.connect()

    event.listen(Base.metadata, "before_create", _sqlite_bigint_workaround)
    Base.metadata.create_all(bind=connection)
    event.remove(Base.metadata, "before_create", _sqlite_bigint_workaround)

    TestSession = sessionmaker(bind=connection)
    shared_session = TestSession()

    def override_get_db():
        try:
            yield shared_session
        finally:
            pass  # keep session open for streaming commits

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
    shared_session.close()
    Base.metadata.drop_all(bind=connection)
    connection.close()


def _create_user(client) -> tuple[str, int]:
    db = next(app.dependency_overrides[get_db]())
    user = User(
        username="integrationuser",
        email="integration@corning.com",
        password_hash=hash_password("TestPass123"),
        display_name="Integration User",
        role="viewer",
        status="active",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id, user.role)
    return f"Bearer {token}", user.id


@patch("app.routers.agent.stream_agent")
def test_full_conversation_lifecycle(mock_stream, client):
    """Test: create conversation via chat -> list it -> delete it -> verify gone."""
    headers_value, user_id = _create_user(client)
    headers = {"Authorization": headers_value}

    # 1. List conversations - should be empty
    resp = client.get("/api/v1/agent/conversations", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["data"] == []

    # 2. Send a chat message (creates conversation)
    async def fake_stream_1(db, msgs):
        yield json.dumps({"type": "token", "content": "Hello"}) + "\n"
        yield json.dumps({"type": "token", "content": "!"}) + "\n"
        yield json.dumps({"type": "done"}) + "\n"

    mock_stream.return_value = fake_stream_1(None, None)

    resp = client.post(
        "/api/v1/agent/chat",
        json={"message": "hello agent"},
        headers=headers,
    )
    assert resp.status_code == 200
    # Force full body consumption to ensure streaming generator completes
    _ = resp.text

    # Verify conversation was persisted
    db = next(app.dependency_overrides[get_db]())
    db.expire_all()
    convs = db.query(AgentConversation).filter_by(user_id=user_id).all()
    assert len(convs) == 1
    conv_id = convs[0].id
    assert convs[0].title == "hello agent"

    # Verify messages were saved
    saved_msgs = json.loads(convs[0].messages)
    assert len(saved_msgs) == 2
    assert saved_msgs[0]["role"] == "user"
    assert saved_msgs[0]["content"] == "hello agent"
    assert saved_msgs[1]["role"] == "assistant"
    assert "Hello" in saved_msgs[1]["content"]

    # 3. List conversations - should have 1
    resp = client.get("/api/v1/agent/conversations", headers=headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data) == 1
    assert data[0]["title"] == "hello agent"
    assert data[0]["message_count"] == 2

    # 4. Delete the conversation
    resp = client.delete(f"/api/v1/agent/conversations/{conv_id}", headers=headers)
    assert resp.status_code == 200

    # 5. List should be empty again
    resp = client.get("/api/v1/agent/conversations", headers=headers)
    assert resp.json()["data"] == []

    # 6. But record still exists (soft delete)
    db.expire_all()
    conv = db.query(AgentConversation).filter_by(id=conv_id).first()
    assert conv is not None
    assert conv.is_active is False


@patch("app.routers.agent.stream_agent")
def test_chat_with_chart_event(mock_stream, client):
    """Test: agent returns a chart event alongside text."""
    headers_value, _ = _create_user(client)
    headers = {"Authorization": headers_value}

    async def fake_stream_chart(db, msgs):
        yield json.dumps({"type": "token", "content": "Here is the data:"}) + "\n"
        yield json.dumps({
            "type": "chart",
            "chart_config": {"type": "bar", "title": "Test Chart", "x_field": "name", "y_field": "value"},
            "data": [{"name": "A", "value": 10}, {"name": "B", "value": 20}],
        }) + "\n"
        yield json.dumps({"type": "done"}) + "\n"

    mock_stream.return_value = fake_stream_chart(None, None)

    resp = client.post(
        "/api/v1/agent/chat",
        json={"message": "show me data"},
        headers=headers,
    )
    assert resp.status_code == 200

    # Parse SSE response to find chart event
    body = resp.text
    assert '"type": "chart"' in body or '"type":"chart"' in body
