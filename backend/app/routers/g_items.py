"""HTTP endpoints for the G$ Management feature."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.dependencies import get_db, require_role
from app.schemas.common import PaginationMeta, ok
from app.schemas.g_item import GItemUpdate
from app.services.g_item_service import (
    NotGItemError,
    list_g_items,
    update_g_item,
)

router = APIRouter(prefix="/api/v1/g-items", tags=["g-items"])


@router.get("")
def list_endpoint(
    plant_ids: list[int] = Query(default_factory=list),
    process_ids: list[int] = Query(default_factory=list),
    reasons: list[str] = Query(default_factory=list),
    search: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    _=Depends(require_role("editor", "admin")),
):
    allowed_reasons = {"QI", "FMEA_H_RISK", "OTHER", "UNSPECIFIED"}
    for r in reasons:
        if r not in allowed_reasons:
            raise HTTPException(status_code=422, detail=f"Invalid reason: {r}")

    items, total = list_g_items(
        db,
        plant_ids=plant_ids or None,
        process_ids=process_ids or None,
        reasons=reasons or None,
        search=search,
        page=page,
        limit=limit,
    )
    return ok(items, meta=PaginationMeta(total=total, page=page, limit=limit))


@router.put("/{solution_id}")
def update_endpoint(
    solution_id: int,
    body: GItemUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_role("admin")),
):
    fields = body.model_dump(exclude_unset=True)
    try:
        updated = update_g_item(
            db, solution_id=solution_id, actor_id=user.id, fields=fields,
        )
    except LookupError:
        raise HTTPException(status_code=404, detail="Solution not found")
    except NotGItemError:
        raise HTTPException(status_code=400, detail="Solution is not a G$ item")
    return ok(updated)
