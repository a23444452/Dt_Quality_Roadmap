from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user, require_role
from app.models.plant import Plant, TankLine
from app.models.user import User
from app.schemas.common import ok
from app.schemas.plant import (
    PlantCreate,
    PlantResponse,
    PlantUpdate,
    TankLineCreate,
    TankLineResponse,
    TankLineUpdate,
)

plant_router = APIRouter(prefix="/api/v1/plants", tags=["plants"])
tank_line_router = APIRouter(prefix="/api/v1/tank-lines", tags=["plants"])


# --- Plants ---

@plant_router.get("")
def list_plants(
    is_active: bool | None = None,
    sort: str = "sort_order",
    order: str = "asc",
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Plant)
    if is_active is not None:
        query = query.filter(Plant.is_active == is_active)

    order_col = getattr(Plant, sort, Plant.sort_order)
    query = query.order_by(order_col.asc() if order == "asc" else order_col.desc())

    items = query.all()
    return ok([PlantResponse.model_validate(i).model_dump() for i in items])


@plant_router.get("/{item_id}")
def get_plant(
    item_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    item = db.query(Plant).filter(Plant.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")
    return ok(PlantResponse.model_validate(item).model_dump())


@plant_router.post("", status_code=201)
def create_plant(
    body: PlantCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    item = Plant(**body.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return ok(PlantResponse.model_validate(item).model_dump())


@plant_router.put("/{item_id}")
def update_plant(
    item_id: int,
    body: PlantUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    item = db.query(Plant).filter(Plant.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return ok(PlantResponse.model_validate(item).model_dump())


# --- Tank Lines ---

@tank_line_router.get("")
def list_tank_lines(
    plant_id: int | None = None,
    is_active: bool | None = None,
    sort: str = "sort_order",
    order: str = "asc",
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(TankLine)
    if plant_id is not None:
        query = query.filter(TankLine.plant_id == plant_id)
    if is_active is not None:
        query = query.filter(TankLine.is_active == is_active)

    order_col = getattr(TankLine, sort, TankLine.sort_order)
    query = query.order_by(order_col.asc() if order == "asc" else order_col.desc())

    items = query.all()
    return ok([TankLineResponse.model_validate(i).model_dump() for i in items])


@tank_line_router.get("/{item_id}")
def get_tank_line(
    item_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    item = db.query(TankLine).filter(TankLine.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")
    return ok(TankLineResponse.model_validate(item).model_dump())


@tank_line_router.post("", status_code=201)
def create_tank_line(
    body: TankLineCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    # Verify plant exists
    plant = db.query(Plant).filter(Plant.id == body.plant_id).first()
    if plant is None:
        raise HTTPException(status_code=404, detail="Plant not found")

    item = TankLine(**body.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return ok(TankLineResponse.model_validate(item).model_dump())


@tank_line_router.put("/{item_id}")
def update_tank_line(
    item_id: int,
    body: TankLineUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    item = db.query(TankLine).filter(TankLine.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return ok(TankLineResponse.model_validate(item).model_dump())
