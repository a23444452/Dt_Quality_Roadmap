from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.plant import Plant
from app.models.process import Process
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
