from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user, require_role
from app.models.defect import DefectCategory, DefectType
from app.models.user import User
from app.schemas.common import ok
from app.schemas.defect import (
    DefectCategoryCreate,
    DefectCategoryResponse,
    DefectCategoryUpdate,
    DefectTypeCreate,
    DefectTypeResponse,
    DefectTypeUpdate,
)

category_router = APIRouter(prefix="/api/v1/defect-categories", tags=["defects"])
type_router = APIRouter(prefix="/api/v1/defect-types", tags=["defects"])


# --- Defect Categories ---

@category_router.get("")
def list_defect_categories(
    is_active: bool | None = None,
    sort: str = "sort_order",
    order: str = "asc",
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(DefectCategory)
    if is_active is not None:
        query = query.filter(DefectCategory.is_active == is_active)

    order_col = getattr(DefectCategory, sort, DefectCategory.sort_order)
    query = query.order_by(order_col.asc() if order == "asc" else order_col.desc())

    items = query.all()
    return ok([DefectCategoryResponse.model_validate(i).model_dump() for i in items])


@category_router.get("/{item_id}")
def get_defect_category(
    item_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    item = db.query(DefectCategory).filter(DefectCategory.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")
    return ok(DefectCategoryResponse.model_validate(item).model_dump())


@category_router.post("", status_code=201)
def create_defect_category(
    body: DefectCategoryCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    item = DefectCategory(**body.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return ok(DefectCategoryResponse.model_validate(item).model_dump())


@category_router.put("/{item_id}")
def update_defect_category(
    item_id: int,
    body: DefectCategoryUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    item = db.query(DefectCategory).filter(DefectCategory.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return ok(DefectCategoryResponse.model_validate(item).model_dump())


@category_router.delete("/{item_id}")
def delete_defect_category(
    item_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    item = db.query(DefectCategory).filter(DefectCategory.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")

    db.delete(item)
    db.commit()
    return ok({"deleted": True})


# --- Defect Types ---

@type_router.get("")
def list_defect_types(
    category_id: int | None = None,
    is_active: bool | None = None,
    sort: str = "sort_order",
    order: str = "asc",
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(DefectType)
    if category_id is not None:
        query = query.filter(DefectType.category_id == category_id)
    if is_active is not None:
        query = query.filter(DefectType.is_active == is_active)

    order_col = getattr(DefectType, sort, DefectType.sort_order)
    query = query.order_by(order_col.asc() if order == "asc" else order_col.desc())

    items = query.all()
    return ok([DefectTypeResponse.model_validate(i).model_dump() for i in items])


@type_router.get("/{item_id}")
def get_defect_type(
    item_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    item = db.query(DefectType).filter(DefectType.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")
    return ok(DefectTypeResponse.model_validate(item).model_dump())


@type_router.post("", status_code=201)
def create_defect_type(
    body: DefectTypeCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    # Verify category exists
    category = db.query(DefectCategory).filter(DefectCategory.id == body.category_id).first()
    if category is None:
        raise HTTPException(status_code=404, detail="Defect category not found")

    item = DefectType(**body.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return ok(DefectTypeResponse.model_validate(item).model_dump())


@type_router.put("/{item_id}")
def update_defect_type(
    item_id: int,
    body: DefectTypeUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    item = db.query(DefectType).filter(DefectType.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return ok(DefectTypeResponse.model_validate(item).model_dump())


@type_router.delete("/{item_id}")
def delete_defect_type(
    item_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    item = db.query(DefectType).filter(DefectType.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")

    db.delete(item)
    db.commit()
    return ok({"deleted": True})
