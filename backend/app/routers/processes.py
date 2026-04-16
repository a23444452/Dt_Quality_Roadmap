from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user, require_role
from app.models.process import Process, Station
from app.models.user import User
from app.schemas.common import ok
from app.schemas.process import (
    ProcessCreate,
    ProcessResponse,
    ProcessUpdate,
    StationCreate,
    StationResponse,
    StationUpdate,
)

process_router = APIRouter(prefix="/api/v1/processes", tags=["processes"])
station_router = APIRouter(prefix="/api/v1/stations", tags=["processes"])


# --- Processes ---

@process_router.get("")
def list_processes(
    is_active: bool | None = None,
    sort: str = "sort_order",
    order: str = "asc",
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Process)
    if is_active is not None:
        query = query.filter(Process.is_active == is_active)

    order_col = getattr(Process, sort, Process.sort_order)
    query = query.order_by(order_col.asc() if order == "asc" else order_col.desc())

    items = query.all()
    return ok([ProcessResponse.model_validate(i).model_dump() for i in items])


@process_router.get("/{item_id}")
def get_process(
    item_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    item = db.query(Process).filter(Process.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")
    return ok(ProcessResponse.model_validate(item).model_dump())


@process_router.post("", status_code=201)
def create_process(
    body: ProcessCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    item = Process(**body.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return ok(ProcessResponse.model_validate(item).model_dump())


@process_router.put("/{item_id}")
def update_process(
    item_id: int,
    body: ProcessUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    item = db.query(Process).filter(Process.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return ok(ProcessResponse.model_validate(item).model_dump())


# --- Stations ---

@station_router.get("")
def list_stations(
    process_id: int | None = None,
    is_active: bool | None = None,
    sort: str = "sort_order",
    order: str = "asc",
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Station)
    if process_id is not None:
        query = query.filter(Station.process_id == process_id)
    if is_active is not None:
        query = query.filter(Station.is_active == is_active)

    order_col = getattr(Station, sort, Station.sort_order)
    query = query.order_by(order_col.asc() if order == "asc" else order_col.desc())

    items = query.all()
    return ok([StationResponse.model_validate(i).model_dump() for i in items])


@station_router.get("/{item_id}")
def get_station(
    item_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    item = db.query(Station).filter(Station.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")
    return ok(StationResponse.model_validate(item).model_dump())


@station_router.post("", status_code=201)
def create_station(
    body: StationCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    # Verify process exists
    process = db.query(Process).filter(Process.id == body.process_id).first()
    if process is None:
        raise HTTPException(status_code=404, detail="Process not found")

    item = Station(**body.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return ok(StationResponse.model_validate(item).model_dump())


@station_router.put("/{item_id}")
def update_station(
    item_id: int,
    body: StationUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    item = db.query(Station).filter(Station.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return ok(StationResponse.model_validate(item).model_dump())
