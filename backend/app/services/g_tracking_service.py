from datetime import date

from sqlalchemy.orm import Session

from app.models.g_tracking import GTrackingMonthlyTarget, GTrackingPlantTarget
from app.models.plant import Plant, TankLine
from app.models.solution import Solution
from app.models.solution_map import SolutionMap
from app.models.status_definition import StatusDefinition


def get_tracking_data(db: Session, year: int | None = None) -> dict:
    if year is None:
        year = date.today().year

    items = _get_tracking_items(db, year)
    monthly_targets = _get_monthly_targets(db, year)
    plant_targets = _get_plant_targets(db)

    monthly_actuals: dict[int, int] = {}
    for item in items:
        if item["complete_date"]:
            month_num = int(item["complete_date"].split("-")[1])
            monthly_actuals[month_num] = monthly_actuals.get(month_num, 0) + 1

    cumulative = 0
    for target in monthly_targets:
        cumulative += monthly_actuals.get(target["num"], 0)
        target["actual_cumulative"] = cumulative

    return {
        "items": items,
        "monthly_targets": monthly_targets,
        "plant_targets": plant_targets,
    }


def _get_tracking_items(db: Session, year: int) -> list[dict]:
    rows = (
        db.query(SolutionMap, Solution, TankLine, Plant, StatusDefinition)
        .join(Solution, SolutionMap.solution_id == Solution.id)
        .join(TankLine, SolutionMap.tank_line_id == TankLine.id)
        .join(Plant, TankLine.plant_id == Plant.id)
        .join(StatusDefinition, SolutionMap.status_id == StatusDefinition.id)
        .filter(SolutionMap.is_g_tracking == True)  # noqa: E712
        .all()
    )

    items = []
    for sm, sol, tl, plant, status in rows:
        complete_date_str = sm.g_complete_date.isoformat() if sm.g_complete_date else None
        is_complete = sm.g_complete_date is not None
        items.append({
            "plant": plant.code,
            "line": tl.name,
            "category": sol.name,
            "status": "Complete" if is_complete else "Not Complete",
            "complete_date": complete_date_str,
            "planned_date": None,
            "owner": "",
            "class": "D^t",
        })

    return items


def _get_monthly_targets(db: Session, year: int) -> list[dict]:
    rows = (
        db.query(GTrackingMonthlyTarget)
        .filter(GTrackingMonthlyTarget.year == year)
        .order_by(GTrackingMonthlyTarget.month)
        .all()
    )

    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    targets = []
    for r in rows:
        targets.append({
            "month": month_names[r.month - 1],
            "num": r.month,
            "budget": round(r.budget, 2),
            "stretch": round(r.stretch, 2),
            "actual_cumulative": 0,
        })

    return targets


def _get_plant_targets(db: Session) -> list[dict]:
    rows = (
        db.query(GTrackingPlantTarget, Plant)
        .join(Plant, GTrackingPlantTarget.plant_id == Plant.id)
        .order_by(Plant.sort_order)
        .all()
    )

    targets = []
    for r, plant in rows:
        targets.append({
            "plant": plant.code,
            "budget": r.budget,
            "stretch": r.stretch,
        })

    return targets
