import json
import uuid

from app.models.agent import AgentConversation


def test_agent_conversation_create(db_session):
    conv = AgentConversation(
        id=str(uuid.uuid4()),
        user_id=1,
        title="Test conversation",
        messages=json.dumps([]),
    )
    db_session.add(conv)
    db_session.commit()
    db_session.refresh(conv)

    assert conv.id is not None
    assert conv.title == "Test conversation"
    assert conv.is_active is True
    assert conv.created_at is not None


def test_agent_conversation_messages_json(db_session):
    messages = [
        {"role": "user", "content": "hello"},
        {"role": "assistant", "content": "hi"},
    ]
    conv = AgentConversation(
        id=str(uuid.uuid4()),
        user_id=1,
        title="Chat",
        messages=json.dumps(messages),
    )
    db_session.add(conv)
    db_session.commit()
    db_session.refresh(conv)

    loaded = json.loads(conv.messages)
    assert len(loaded) == 2
    assert loaded[0]["role"] == "user"
