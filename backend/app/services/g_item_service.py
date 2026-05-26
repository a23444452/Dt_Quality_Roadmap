"""Business logic for the G$ Management feature."""
from typing import Any

from sqlalchemy import or_
from sqlalchemy.orm import Session

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
            query = query.filter(or_(*reason_clauses))

    if search:
        query = query.filter(Solution.name.ilike(f"%{search}%"))

    query = query.order_by(Station.sort_order, Solution.name)

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
            "is_g_tracking": sm.is_g_tracking,
            "g_complete_date": sm.g_complete_date.isoformat() if sm.g_complete_date else None,
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


def _serialize_g_item(db: Session, sol: Solution) -> dict[str, Any]:
    """Serialize a single Solution into the GItemResponse dict shape.

    Used by update_g_item to return a consistent response without re-running
    list_g_items (which filters out is_active=False rows and would raise
    StopIteration for such solutions).
    """
    sta = db.query(Station).filter(Station.id == sol.station_id).one()
    proc = db.query(Process).filter(Process.id == sta.process_id).one()
    sm_rows = (
        db.query(SolutionMap, TankLine, Plant, StatusDefinition)
        .join(TankLine, SolutionMap.tank_line_id == TankLine.id)
        .join(Plant, TankLine.plant_id == Plant.id)
        .join(StatusDefinition, SolutionMap.status_id == StatusDefinition.id)
        .filter(SolutionMap.solution_id == sol.id)
        .all()
    )
    return {
        "id": sol.id,
        "name": sol.name,
        "process": proc.name,
        "station": sta.name,
        "quality_attribute": sol.quality_attribute,
        "reason": sol.reason,
        "remark": sol.remark,
        "solution_map": [
            {
                "plant_id": plant.id,
                "plant_name": plant.name,
                "tank_line_id": line.id,
                "tank_line_name": line.name,
                "status_id": status.id,
                "status_code": status.code,
                "status_color": status.color,
                "solution_map_id": sm.id,
                "version": sm.version,
                "is_g_tracking": sm.is_g_tracking,
                "g_complete_date": sm.g_complete_date.isoformat() if sm.g_complete_date else None,
            }
            for sm, line, plant, status in sm_rows
        ],
    }


class NotGItemError(ValueError):
    """Raised when a caller tries to update reason/remark on a non-G$ Solution."""


def update_g_item(
    db: Session,
    *,
    solution_id: int,
    actor_id: int,
    fields: dict[str, Any],
) -> dict[str, Any]:
    """Update reason and/or remark for a G$ solution.

    `fields` should contain only the keys the caller wants changed (use
    Pydantic's model_dump(exclude_unset=True) upstream). Valid keys:
    "reason", "remark". An empty or None remark is stored as NULL.

    Raises LookupError if the solution does not exist.
    Raises NotGItemError if the solution is not marked as G$.
    """
    sol = db.query(Solution).filter(Solution.id == solution_id).first()
    if sol is None:
        raise LookupError(f"Solution {solution_id} not found")
    if not sol.is_g_item:
        raise NotGItemError("Solution is not a G$ item")

    if "reason" in fields:
        sol.reason = fields["reason"]
    if "remark" in fields:
        raw = fields["remark"]
        sol.remark = None if raw in (None, "") else raw

    sol.updated_by = actor_id
    db.commit()
    db.refresh(sol)

    return _serialize_g_item(db, sol)
