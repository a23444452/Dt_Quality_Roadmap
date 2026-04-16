from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.common import ok
from app.services.dashboard_service import get_defect_analysis, get_process_analysis, get_summary

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


@router.get("/summary")
def dashboard_summary(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    data = get_summary(db)
    return ok(data)


@router.get("/defect-analysis")
def defect_analysis(
    process_id: int | None = None,
    plant_id: int | None = None,
    group_by: str = "defect_category",
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    data = get_defect_analysis(db, process_id=process_id, plant_id=plant_id, group_by=group_by)
    return ok(data)


@router.get("/process-analysis")
def process_analysis(
    plant_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    data = get_process_analysis(db, plant_id=plant_id)
    return ok(data)
