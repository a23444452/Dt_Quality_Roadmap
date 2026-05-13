"""Business logic for the G$ Management feature."""
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.defect import DefectType  # noqa: F401 — imported for relationship resolution
from app.models.plant import Plant, TankLine
from app.models.process import Process, Station
from app.models.solution import Solution
from app.models.solution_map import SolutionMap
from app.models.status_definition import StatusDefinition

REASON_UNSPECIFIED = "UNSPECIFIED"


def list_g_items(
    db: Session,
    *,
    plant_ids: list[int] | None = None,
    process_ids: list[int] | None = None,
    reasons: list[str] | None = None,
    search: str | None = None,
    page: int = 1,
    limit: int = 50,
) -> tuple[list[dict[str, Any]], int]:
    """Return (items, total) for the G$ Management list view.

    Each item is a plain dict (GItemResponse shape) including its solution_map
    array. Filters applied in the order given by the arguments.
    """
    query = (
        db.query(Solution, Station, Process)
        .join(Station, Solution.station_id == Station.id)
        .join(Process, Station.process_id == Process.id)
        .filter(Solution.is_g_item == True)  # noqa: E712
        .filter(Solution.is_active == True)  # noqa: E712
    )

    if process_ids:
        query = query.filter(Process.id.in_(process_ids))

    if plant_ids:
        # Keep only solutions with at least one solution_map row in these plants.
        solution_ids_in_plants = (
            db.query(SolutionMap.solution_id)
            .join(TankLine, SolutionMap.tank_line_id == TankLine.id)
            .filter(TankLine.plant_id.in_(plant_ids))
            .distinct()
            .subquery()
        )
        query = query.filter(Solution.id.in_(solution_ids_in_plants))

    if reasons:
        reason_clauses = []
        explicit = [r for r in reasons if r != REASON_UNSPECIFIED]
        if explicit:
            reason_clauses.append(Solution.reason.in_(explicit))
        if REASON_UNSPECIFIED in reasons:
            reason_clauses.append(Solution.reason.is_(None))
        if reason_clauses:
            from sqlalchemy import or_
            query = query.filter(or_(*reason_clauses))

    if search:
        query = query.filter(func.lower(Solution.name).like(f"%{search.lower()}%"))

    query = query.order_by(Solution.name)

    total = query.count()
    rows = query.offset((page - 1) * limit).limit(limit).all()

    solution_ids = [s.id for s, _, _ in rows]
    sm_rows = []
    if solution_ids:
        sm_rows = (
            db.query(SolutionMap, TankLine, Plant, StatusDefinition)
            .join(TankLine, SolutionMap.tank_line_id == TankLine.id)
            .join(Plant, TankLine.plant_id == Plant.id)
            .join(StatusDefinition, SolutionMap.status_id == StatusDefinition.id)
            .filter(SolutionMap.solution_id.in_(solution_ids))
            .all()
        )

    sm_by_solution: dict[int, list[dict[str, Any]]] = {sid: [] for sid in solution_ids}
    for sm, line, plant, status in sm_rows:
        sm_by_solution[sm.solution_id].append({
            "plant_id": plant.id,
            "plant_name": plant.name,
            "tank_line_id": line.id,
            "tank_line_name": line.name,
            "status_id": status.id,
            "status_code": status.code,
            "status_color": status.color,
            "solution_map_id": sm.id,
            "version": sm.version,
        })

    items: list[dict[str, Any]] = []
    for sol, sta, proc in rows:
        items.append({
            "id": sol.id,
            "name": sol.name,
            "process": proc.name,
            "station": sta.name,
            "quality_attribute": sol.quality_attribute,
            "reason": sol.reason,
            "remark": sol.remark,
            "solution_map": sm_by_solution.get(sol.id, []),
        })

    return items, total
