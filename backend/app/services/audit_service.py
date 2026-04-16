import json
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog


def log_audit(
    db: Session,
    user_id: int,
    action: str,
    entity_type: str,
    entity_id: int,
    old_values: dict | None = None,
    new_values: dict | None = None,
    ip_address: str | None = None,
) -> None:
    entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_values=json.dumps(old_values) if old_values else None,
        new_values=json.dumps(new_values) if new_values else None,
        ip_address=ip_address,
    )
    db.add(entry)
