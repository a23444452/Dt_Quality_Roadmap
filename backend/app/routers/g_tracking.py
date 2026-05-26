from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user, require_role
from app.models.g_tracking import GTrackingMonthlyTarget, GTrackingPlantTarget
from app.models.plant import Plant
from app.models.user import User
from app.schemas.common import ok
from app.schemas.g_tracking import TargetsUpdate
from app.services.g_tracking_service import get_tracking_data

router = APIRouter(prefix="/api/v1/g-tracking", tags=["g-tracking"])


@router.get("/data")
def tracking_data(
    year: int | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    data = get_tracking_data(db, year)
    return ok(data)


@router.get("/targets")
def get_targets(
    year: int = Query(default=2026),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    monthly = (
        db.query(GTrackingMonthlyTarget)
        .filter(GTrackingMonthlyTarget.year == year)
        .order_by(GTrackingMonthlyTarget.month)
        .all()
    )
    plants_rows = (
        db.query(GTrackingPlantTarget, Plant)
        .join(Plant, GTrackingPlantTarget.plant_id == Plant.id)
        .filter(GTrackingPlantTarget.year == year)
        .order_by(Plant.sort_order)
        .all()
    )

    return ok({
        "year": year,
        "monthly": [
            {"month": r.month, "budget": r.budget, "stretch": r.stretch}
            for r in monthly
        ],
        "plants": [
            {"plant_id": plant.id, "plant_name": plant.name, "budget": r.budget, "stretch": r.stretch}
            for r, plant in plants_rows
        ],
    })


@router.put("/targets")
def update_targets(
    body: TargetsUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    for item in body.monthly:
        existing = (
            db.query(GTrackingMonthlyTarget)
            .filter(
                GTrackingMonthlyTarget.year == body.year,
                GTrackingMonthlyTarget.month == item.month,
            )
            .first()
        )
        if existing:
            existing.budget = item.budget
            existing.stretch = item.stretch
        else:
            db.add(GTrackingMonthlyTarget(
                year=body.year, month=item.month,
                budget=item.budget, stretch=item.stretch,
            ))

    for item in body.plants:
        existing = (
            db.query(GTrackingPlantTarget)
            .filter(
                GTrackingPlantTarget.year == body.year,
                GTrackingPlantTarget.plant_id == item.plant_id,
            )
            .first()
        )
        if existing:
            existing.budget = item.budget
            existing.stretch = item.stretch
        else:
            db.add(GTrackingPlantTarget(
                year=body.year, plant_id=item.plant_id,
                budget=item.budget, stretch=item.stretch,
            ))

    db.commit()
    return ok({"message": "Targets updated"})
