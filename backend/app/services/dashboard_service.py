from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.models.defect import DefectCategory, DefectType
from app.models.plant import Plant, TankLine
from app.models.process import Process, Station
from app.models.solution import Solution
from app.models.solution_map import SolutionMap
from app.models.status_definition import StatusDefinition


def get_summary(
    db: Session,
    defect_category_id: int | None = None,
    defect_type_id: int | None = None,
    solution_id: int | None = None,
    plant_id: int | None = None,
    process_id: int | None = None,
) -> dict:
    statuses = {s.id: s for s in db.query(StatusDefinition).all()}
    mp_status = next((s for s in statuses.values() if s.code == "MP"), None)
    dev_status = next((s for s in statuses.values() if s.code == "DEVELOPING"), None)
    plan_status = next((s for s in statuses.values() if s.code == "PLANNED"), None)
    na_status = next((s for s in statuses.values() if s.code == "NA"), None)
    no_intention_status = next((s for s in statuses.values() if s.code == "NO_INTENTION"), None)

    # Exclude NA and No intention from total count
    excluded_status_ids = [s.id for s in [na_status, no_intention_status] if s is not None]

    # Base query with optional plant filter
    def build_kpi_query():
        query = db.query(func.count(SolutionMap.id))
        if plant_id:
            query = query.join(TankLine, SolutionMap.tank_line_id == TankLine.id).filter(TankLine.plant_id == plant_id)
        return query

    total_query = build_kpi_query()
    if excluded_status_ids:
        total_query = total_query.filter(~SolutionMap.status_id.in_(excluded_status_ids))
    total = total_query.scalar() or 0

    def count_by_status(status):
        if status is None:
            return 0
        query = db.query(func.count(SolutionMap.id)).filter(SolutionMap.status_id == status.id)
        if plant_id:
            query = query.join(TankLine, SolutionMap.tank_line_id == TankLine.id).filter(TankLine.plant_id == plant_id)
        return query.scalar() or 0

    mp_count = count_by_status(mp_status)
    dev_count = count_by_status(dev_status)
    plan_count = count_by_status(plan_status)

    # Coverage by plant (exclude NA and No intention from total)
    coverage_by_plant = []
    if mp_status:
        coverage_query = (
            db.query(
                Plant.name,
                func.count(SolutionMap.id).label("total"),
                func.sum(case((SolutionMap.status_id == mp_status.id, 1), else_=0)).label("mp"),
            )
            .join(TankLine, TankLine.plant_id == Plant.id)
            .join(SolutionMap, SolutionMap.tank_line_id == TankLine.id)
        )
        if excluded_status_ids:
            coverage_query = coverage_query.filter(~SolutionMap.status_id.in_(excluded_status_ids))
        coverage_rows = coverage_query.group_by(Plant.name).all()
        coverage_by_plant = [
            {
                "plant": row[0],
                "total": row[1],
                "mp_percentage": round((row[2] / row[1]) * 100, 1) if row[1] > 0 else 0,
            }
            for row in coverage_rows
        ]

    kpi = {
        "total_solutions": total,
        "mp_count": mp_count,
        "mp_percentage": round((mp_count / total) * 100, 1) if total > 0 else 0,
        "developing_count": dev_count,
        "planned_count": plan_count,
        "coverage_by_plant": coverage_by_plant,
    }

    # Sankey: DefectCategory → DefectType → Solution → Plant flow
    flow_query = (
        db.query(
            DefectCategory.id, DefectCategory.name,
            DefectType.id, DefectType.name,
            Solution.id, Solution.name,
            Plant.id, Plant.name,
            func.count(SolutionMap.id),
        )
        .join(DefectType, DefectType.category_id == DefectCategory.id)
        .join(Solution, Solution.defect_type_id == DefectType.id)
        .join(Station, Solution.station_id == Station.id)
        .join(SolutionMap, SolutionMap.solution_id == Solution.id)
        .join(TankLine, SolutionMap.tank_line_id == TankLine.id)
        .join(Plant, TankLine.plant_id == Plant.id)
    )

    # Apply filters
    if defect_category_id:
        flow_query = flow_query.filter(DefectCategory.id == defect_category_id)
    if defect_type_id:
        flow_query = flow_query.filter(DefectType.id == defect_type_id)
    if solution_id:
        flow_query = flow_query.filter(Solution.id == solution_id)
    if plant_id:
        flow_query = flow_query.filter(Plant.id == plant_id)
    if process_id:
        flow_query = flow_query.filter(Station.process_id == process_id)

    flow_rows = flow_query.group_by(
        DefectCategory.id, DefectCategory.name,
        DefectType.id, DefectType.name,
        Solution.id, Solution.name,
        Plant.id, Plant.name,
    ).all()

    nodes_set: dict[str, dict] = {}
    links_map: dict[tuple[str, str], int] = {}

    for cat_id, cat_name, dt_id, dt_name, sol_id, sol_name, plant_id, plant_name, count in flow_rows:
        cat_key = f"cat_{cat_id}"
        dt_key = f"type_{dt_id}"
        sol_key = f"sol_{sol_id}"
        plant_key = f"plant_{plant_id}"

        nodes_set[cat_key] = {"id": cat_key, "name": cat_name, "layer": "defect_category"}
        nodes_set[dt_key] = {"id": dt_key, "name": dt_name, "layer": "defect_type"}
        nodes_set[sol_key] = {"id": sol_key, "name": sol_name, "layer": "solution"}
        nodes_set[plant_key] = {"id": plant_key, "name": plant_name, "layer": "plant"}

        for src, tgt in [(cat_key, dt_key), (dt_key, sol_key), (sol_key, plant_key)]:
            pair = (src, tgt)
            links_map[pair] = links_map.get(pair, 0) + count

    # Get filter options
    filter_options = {
        "defect_categories": [
            {"id": c.id, "name": c.name}
            for c in db.query(DefectCategory).filter(DefectCategory.is_active == True).order_by(DefectCategory.sort_order).all()  # noqa: E712
        ],
        "defect_types": [
            {"id": t.id, "name": t.name, "category_id": t.category_id}
            for t in db.query(DefectType).filter(DefectType.is_active == True).order_by(DefectType.sort_order).all()  # noqa: E712
        ],
        "solutions": [
            {"id": s.id, "name": s.name, "defect_type_id": s.defect_type_id}
            for s in db.query(Solution).filter(Solution.is_active == True).order_by(Solution.sort_order).all()  # noqa: E712
        ],
        "plants": [
            {"id": p.id, "name": p.name}
            for p in db.query(Plant).filter(Plant.is_active == True).order_by(Plant.sort_order).all()  # noqa: E712
        ],
        "processes": [
            {"id": p.id, "name": p.name}
            for p in db.query(Process).filter(Process.is_active == True).order_by(Process.sort_order).all()  # noqa: E712
        ],
    }

    sankey = {
        "nodes": list(nodes_set.values()),
        "links": [{"source": src, "target": tgt, "value": val} for (src, tgt), val in links_map.items()],
    }

    return {"kpi": kpi, "sankey": sankey, "filter_options": filter_options}


def get_process_analysis(db: Session, plant_id: int | None = None) -> dict:
    """Return process → station → solution count data for the process map.

    Stations are ordered by sort_order which represents the production flow sequence
    from the Excel file (top to bottom = production line order).
    """
    query = (
        db.query(
            Process.category.label("process_category"),
            Process.name.label("process"),
            Station.name.label("station"),
            Station.id.label("station_id"),
            Station.sort_order.label("sort_order"),
            func.count(func.distinct(Solution.id)).label("solution_count"),
        )
        .join(Station, Station.process_id == Process.id)
        .join(Solution, Solution.station_id == Station.id)
        .join(SolutionMap, SolutionMap.solution_id == Solution.id)
    )

    if plant_id:
        query = query.join(TankLine, SolutionMap.tank_line_id == TankLine.id).filter(
            TankLine.plant_id == plant_id
        )

    query = query.filter(Solution.is_active == True).group_by(  # noqa: E712
        Process.category, Process.name, Station.name, Station.id, Station.sort_order
    ).order_by(Station.sort_order)  # Order by production flow sequence

    rows = query.all()

    nodes = [
        {
            "process_category": row.process_category,
            "process": row.process,
            "station": row.station,
            "station_id": row.station_id,
            "sort_order": row.sort_order,
            "solution_count": row.solution_count,
        }
        for row in rows
    ]

    return {"nodes": nodes}


def get_defect_analysis(
    db: Session,
    process_id: int | None = None,
    plant_id: int | None = None,
    group_by: str = "defect_category",
) -> dict:
    """Return defect analysis grouped by category or type."""
    if group_by == "defect_type":
        label_col = DefectType.name
        group_col = DefectType.name
    else:
        label_col = DefectCategory.name
        group_col = DefectCategory.name

    query = (
        db.query(
            label_col.label("label"),
            func.count(SolutionMap.id).label("total"),
        )
        .join(DefectType, DefectType.category_id == DefectCategory.id)
        .join(Solution, Solution.defect_type_id == DefectType.id)
        .join(SolutionMap, SolutionMap.solution_id == Solution.id)
    )

    if process_id:
        query = query.join(Station, Solution.station_id == Station.id).filter(
            Station.process_id == process_id
        )
    if plant_id:
        query = query.join(TankLine, SolutionMap.tank_line_id == TankLine.id).filter(
            TankLine.plant_id == plant_id
        )

    query = query.group_by(group_col).order_by(func.count(SolutionMap.id).desc())
    rows = query.all()

    return {
        "group_by": group_by,
        "data": [{"label": row.label, "count": row.total} for row in rows],
    }
