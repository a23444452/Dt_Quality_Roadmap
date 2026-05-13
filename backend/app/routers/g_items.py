"""HTTP endpoints for the G$ Management feature."""
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.dependencies import get_db, require_role
from app.schemas.common import PaginationMeta, ok
from app.schemas.g_item import GItemResponse, GItemUpdate
from app.services.g_item_service import (
    NotGItemError,
    list_g_items,
    update_g_item,
)

ReasonFilter = Literal["QI", "FMEA_H_RISK", "OTHER", "UNSPECIFIED"]

router = APIRouter(prefix="/api/v1/g-items", tags=["g-items"])


@router.get("")
def list_endpoint(
    plant_ids: list[int] = Query(default_factory=list),
    process_ids: list[int] = Query(default_factory=list),
    reasons: list[ReasonFilter] = Query(default_factory=list),
    search: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    _=Depends(require_role("editor", "admin")),
):
    items, total = list_g_items(
        db,
        plant_ids=plant_ids,
        process_ids=process_ids,
        reasons=reasons,
        search=search,
        page=page,
        limit=limit,
    )
    return ok(
        [GItemResponse.model_validate(item).model_dump() for item in items],
        meta=PaginationMeta(total=total, page=page, limit=limit),
    )


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
    return ok(GItemResponse.model_validate(updated).model_dump())
