"""Agent chat API endpoints with SSE streaming."""
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.config import settings
from app.dependencies import get_current_user, get_db
from app.models.agent import AgentConversation
from app.models.user import User
from app.schemas.common import ok
from app.services.agent_service import stream_agent

router = APIRouter(prefix="/api/v1/agent", tags=["agent"])


class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None

    @field_validator("message")
    @classmethod
    def message_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Message cannot be empty")
        return v.strip()


@router.post("/chat")
async def chat(
    body: ChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if len(body.message) > 2000:
        raise HTTPException(status_code=400, detail="Message too long (max 2000 chars)")

    # Load or create conversation
    conversation = None
    if body.conversation_id:
        conversation = (
            db.query(AgentConversation)
            .filter(
                AgentConversation.id == body.conversation_id,
                AgentConversation.user_id == user.id,
                AgentConversation.is_active == True,  # noqa: E712
            )
            .first()
        )

    if conversation is None:
        conversation = AgentConversation(
            id=str(uuid.uuid4()),
            user_id=user.id,
            title=body.message[:100],
            messages="[]",
        )
        db.add(conversation)
        db.commit()

    # Build messages for agent (last N pairs from history)
    history = json.loads(conversation.messages)
    history.append({"role": "user", "content": body.message})

    max_msgs = settings.agent_max_messages * 2
    context_messages = history[-max_msgs:]

    async def event_stream():
        full_response = ""
        async for chunk in stream_agent(db, context_messages):
            parsed = json.loads(chunk.strip())
            if parsed["type"] == "token":
                full_response += parsed["content"]
            yield f"data: {chunk}\n\n"

        # Save conversation after streaming completes
        history.append({"role": "assistant", "content": full_response})
        conversation.messages = json.dumps(history, ensure_ascii=False)
        db.commit()

        # Send conversation_id in meta event
        yield f"data: {json.dumps({'type': 'meta', 'conversation_id': conversation.id})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/conversations")
def list_conversations(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = (
        db.query(AgentConversation)
        .filter(
            AgentConversation.user_id == user.id,
            AgentConversation.is_active == True,  # noqa: E712
        )
        .order_by(AgentConversation.updated_at.desc())
        .limit(50)
        .all()
    )
    data = [
        {
            "id": r.id,
            "title": r.title,
            "created_at": r.created_at.isoformat(),
            "message_count": len(json.loads(r.messages)),
        }
        for r in rows
    ]
    return ok(data)


@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    conv = (
        db.query(AgentConversation)
        .filter(
            AgentConversation.id == conversation_id,
            AgentConversation.user_id == user.id,
        )
        .first()
    )
    if conv is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv.is_active = False
    db.commit()
    return ok(None)
