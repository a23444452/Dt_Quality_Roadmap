from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.models.defect import DefectCategory, DefectType
from app.models.plant import Plant, TankLine
from app.models.process import Process, Station
from app.models.solution import Solution
from app.models.solution_map import SolutionMap
from app.models.status_definition import StatusDefinition


def get_summary(db: Session) -> dict:
    statuses = {s.id: s for s in db.query(StatusDefinition).all()}
    mp_status = next((s for s in statuses.values() if s.code == "MP"), None)
    dev_status = next((s for s in statuses.values() if s.code == "DEV"), None)
    plan_status = next((s for s in statuses.values() if s.code == "PLAN"), None)

    total = db.query(func.count(SolutionMap.id)).scalar() or 0

    def count_by_status(status):
        if status is None:
            return 0
        return db.query(func.count(SolutionMap.id)).filter(SolutionMap.status_id == status.id).scalar() or 0

    mp_count = count_by_status(mp_status)
    dev_count = count_by_status(dev_status)
    plan_count = count_by_status(plan_status)

    # Coverage by plant
    coverage_by_plant = []
    if mp_status:
        coverage_rows = (
            db.query(
                Plant.name,
                func.count(SolutionMap.id).label("total"),
                func.sum(case((SolutionMap.status_id == mp_status.id, 1), else_=0)).label("mp"),
            )
            .join(TankLine, TankLine.plant_id == Plant.id)
            .join(SolutionMap, SolutionMap.tank_line_id == TankLine.id)
            .group_by(Plant.name)
            .all()
        )
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

    # Sankey: DefectCategory → DefectType → Station → Status flow
    flow_rows = (
        db.query(
            DefectCategory.id, DefectCategory.name,
            DefectType.id, DefectType.name,
            Station.id, Station.name,
            StatusDefinition.id, StatusDefinition.name,
            func.count(SolutionMap.id),
        )
        .join(DefectType, DefectType.category_id == DefectCategory.id)
        .join(Solution, Solution.defect_type_id == DefectType.id)
        .join(Station, Solution.station_id == Station.id)
        .join(SolutionMap, SolutionMap.solution_id == Solution.id)
        .join(StatusDefinition, SolutionMap.status_id == StatusDefinition.id)
        .group_by(
            DefectCategory.id, DefectCategory.name,
            DefectType.id, DefectType.name,
            Station.id, Station.name,
            StatusDefinition.id, StatusDefinition.name,
        )
        .all()
    )

    nodes_set: dict[str, dict] = {}
    links_map: dict[tuple[str, str], int] = {}

    for cat_id, cat_name, dt_id, dt_name, sta_id, sta_name, st_id, st_name, count in flow_rows:
        cat_key = f"cat_{cat_id}"
        dt_key = f"type_{dt_id}"
        sta_key = f"sta_{sta_id}"
        st_key = f"status_{st_id}"

        nodes_set[cat_key] = {"id": cat_key, "name": cat_name, "layer": "defect_category"}
        nodes_set[dt_key] = {"id": dt_key, "name": dt_name, "layer": "defect_type"}
        nodes_set[sta_key] = {"id": sta_key, "name": sta_name, "layer": "station"}
        nodes_set[st_key] = {"id": st_key, "name": st_name, "layer": "status"}

        for src, tgt in [(cat_key, dt_key), (dt_key, sta_key), (sta_key, st_key)]:
            pair = (src, tgt)
            links_map[pair] = links_map.get(pair, 0) + count

    sankey = {
        "nodes": list(nodes_set.values()),
        "links": [{"source": src, "target": tgt, "value": val} for (src, tgt), val in links_map.items()],
    }

    return {"kpi": kpi, "sankey": sankey}
