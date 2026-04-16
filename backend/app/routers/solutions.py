from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user, require_role
from app.models.solution import Solution
from app.models.user import User
from app.schemas.common import ok
from app.schemas.solution import SolutionCreate, SolutionResponse, SolutionUpdate

router = APIRouter(prefix="/api/v1/solutions", tags=["solutions"])


@router.get("")
def list_solutions(
    is_active: bool | None = None,
    defect_type_id: int | None = None,
    station_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Solution)
    if is_active is not None:
        query = query.filter(Solution.is_active == is_active)
    if defect_type_id is not None:
        query = query.filter(Solution.defect_type_id == defect_type_id)
    if station_id is not None:
        query = query.filter(Solution.station_id == station_id)

    items = query.order_by(Solution.sort_order).all()
    return ok([SolutionResponse.model_validate(i).model_dump() for i in items])


@router.get("/{item_id}")
def get_solution(
    item_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    item = db.query(Solution).filter(Solution.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")
    return ok(SolutionResponse.model_validate(item).model_dump())


@router.post("", status_code=201)
def create_solution(
    body: SolutionCreate,
    db: Session = Depends(get_db),
    user=Depends(require_role("editor", "admin")),
):
    item = Solution(**body.model_dump(), created_by=user.id, updated_by=user.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return ok(SolutionResponse.model_validate(item).model_dump())


@router.put("/{item_id}")
def update_solution(
    item_id: int,
    body: SolutionUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_role("editor", "admin")),
):
    item = db.query(Solution).filter(Solution.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)
    item.updated_by = user.id

    db.commit()
    db.refresh(item)
    return ok(SolutionResponse.model_validate(item).model_dump())


@router.delete("/{item_id}")
def delete_solution(
    item_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_role("admin")),
):
    item = db.query(Solution).filter(Solution.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")

    item.is_active = False
    item.updated_by = user.id
    db.commit()
    return ok({"id": item_id, "is_active": False})
