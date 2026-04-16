from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user, require_role
from app.models.status_definition import StatusDefinition
from app.models.user import User
from app.schemas.common import ok
from app.schemas.status_definition import StatusCreate, StatusResponse, StatusUpdate

router = APIRouter(prefix="/api/v1/statuses", tags=["statuses"])


@router.get("")
def list_statuses(
    is_active: bool | None = None,
    sort: str = "sort_order",
    order: str = "asc",
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(StatusDefinition)
    if is_active is not None:
        query = query.filter(StatusDefinition.is_active == is_active)

    order_col = getattr(StatusDefinition, sort, StatusDefinition.sort_order)
    query = query.order_by(order_col.asc() if order == "asc" else order_col.desc())

    items = query.all()
    return ok([StatusResponse.model_validate(i).model_dump() for i in items])


@router.get("/{item_id}")
def get_status(
    item_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    item = db.query(StatusDefinition).filter(StatusDefinition.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")
    return ok(StatusResponse.model_validate(item).model_dump())


@router.post("", status_code=201)
def create_status(
    body: StatusCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    item = StatusDefinition(**body.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return ok(StatusResponse.model_validate(item).model_dump())


@router.put("/{item_id}")
def update_status(
    item_id: int,
    body: StatusUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    item = db.query(StatusDefinition).filter(StatusDefinition.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return ok(StatusResponse.model_validate(item).model_dump())
