from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user, require_role
from app.models.solution_map import SolutionMap
from app.models.user import User
from app.schemas.common import ok
from app.schemas.solution_map import SolutionMapUpdate, SolutionMapBatchUpsert
from app.services.audit_service import log_audit
from app.services.solution_map_service import get_pivot_data

router = APIRouter(prefix="/api/v1/solution-map", tags=["solution-map"])


@router.get("")
def get_solution_map(
    process_category: str | None = None,
    process_id: int | None = None,
    station_id: int | None = None,
    defect_category_id: int | None = None,
    plant_id: int | None = None,
    status_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    data = get_pivot_data(db, process_category, process_id, station_id, defect_category_id, plant_id, status_id)
    return ok(data)


@router.put("/{map_id}")
def update_solution_map(
    map_id: int,
    body: SolutionMapUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("editor", "admin")),
):
    sm = db.query(SolutionMap).filter(SolutionMap.id == map_id).first()
    if sm is None:
        raise HTTPException(status_code=404, detail="Not found")

    # Optimistic lock check
    if sm.version != body.version:
        raise HTTPException(
            status_code=409,
            detail="Conflict: record was modified by another user. Please refresh.",
        )

    old_status = sm.status_id
    sm.status_id = body.status_id
    sm.notes = body.notes
    sm.version += 1
    sm.updated_by = user.id

    log_audit(
        db, user.id, "UPDATE", "solution_map", sm.id,
        old_values={"status_id": old_status},
        new_values={"status_id": body.status_id},
    )

    db.commit()
    db.refresh(sm)
    return ok({
        "id": sm.id,
        "solution_id": sm.solution_id,
        "tank_line_id": sm.tank_line_id,
        "status_id": sm.status_id,
        "notes": sm.notes,
        "version": sm.version,
        "updated_at": sm.updated_at.isoformat() if sm.updated_at else None,
        "updated_by": {"id": user.id, "display_name": user.display_name},
    })


@router.post("/batch")
def batch_upsert(
    body: SolutionMapBatchUpsert,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("editor", "admin")),
):
    created = 0
    updated = 0
    for item in body.updates:
        existing = db.query(SolutionMap).filter(
            SolutionMap.solution_id == item.solution_id,
            SolutionMap.tank_line_id == item.tank_line_id,
        ).first()

        if existing:
            existing.status_id = item.status_id
            existing.notes = item.notes
            existing.version += 1
            existing.updated_by = user.id
            updated += 1
        else:
            new_sm = SolutionMap(
                solution_id=item.solution_id,
                tank_line_id=item.tank_line_id,
                status_id=item.status_id,
                notes=item.notes,
                created_by=user.id,
                updated_by=user.id,
            )
            db.add(new_sm)
            created += 1

    db.commit()
    return ok({"created": created, "updated": updated, "failed": 0})
