from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import settings
from app.dependencies import get_db
from app.models.plant import Plant
from app.models.process import Process
from app.models.user import User
from app.schemas.common import ok

router = APIRouter(prefix="/api/v1/reference", tags=["reference"])


@router.get("/options")
def get_reference_options(db: Session = Depends(get_db)):
    """Get plants and processes for registration form (no auth required)."""
    plants = (
        db.query(Plant)
        .filter(Plant.is_active == True)  # noqa: E712
        .order_by(Plant.sort_order)
        .all()
    )

    processes = (
        db.query(Process)
        .filter(Process.is_active == True)  # noqa: E712
        .order_by(Process.sort_order)
        .all()
    )

    return ok({
        "plants": [{"id": p.id, "name": p.name, "code": p.code} for p in plants],
        "processes": [{"id": p.id, "name": p.name, "category": p.category} for p in processes],
    })


@router.get("/system-config")
def get_system_config(db: Session = Depends(get_db)):
    """Get public system configuration (admin contacts, etc.)."""
    # Get admin emails: priority is env setting, fallback to database
    if settings.admin_notification_emails:
        admin_emails = [e.strip() for e in settings.admin_notification_emails.split(",") if e.strip()]
    else:
        admin_emails = [
            u.email
            for u in db.query(User).filter(User.role == "admin", User.status == "active").all()
            if u.email and not u.email.endswith("_disabled_") and not u.email.endswith("_rejected_")
        ]

    return ok({
        "admin_emails": admin_emails,
        "app_url": settings.app_base_url,
    })
