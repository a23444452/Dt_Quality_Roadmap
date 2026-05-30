"""Custom tools for the D^t Solution Roadmap AI Agent.

Each function queries the database using existing service logic and returns
a JSON string with data, chart_config, and summary fields.
"""
import json
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.defect import DefectCategory, DefectType
from app.models.plant import Plant, TankLine
from app.models.process import Process, Station
from app.models.solution import Solution
from app.models.solution_map import SolutionMap
from app.models.status_definition import StatusDefinition
from app.services.dashboard_service import get_process_analysis as _get_process_analysis
from app.services.dashboard_service import get_summary as _get_summary
from app.services.g_item_service import list_g_items as _list_g_items
from app.services.g_tracking_service import get_tracking_data as _get_tracking_data


def _json_response(data: Any, chart_config: dict | None = None, summary: str = "") -> str:
    return json.dumps(
        {"data": data, "chart_config": chart_config, "summary": summary},
        ensure_ascii=False,
        default=str,
    )


def query_dashboard_kpi(db: Session, plant_id: int | None = None) -> str:
    """Query overall KPI metrics for the dashboard.

    Returns solution status distribution (MP, Developing, Planned, etc.)
    with a pie chart configuration.
    """
    result = _get_summary(db, plant_id=plant_id)
    kpi = result["kpi"]
    summary = (
        f"Total solutions: {kpi['total_solutions']}, "
        f"MP: {kpi['mp_count']} ({kpi['mp_percentage']}%), "
        f"Developing: {kpi['developing_count']}, "
        f"Planned: {kpi['planned_count']}, "
        f"Initiation: {kpi['initiation_count']}, "
        f"Resource Constrain: {kpi['resource_constrain_count']}"
    )
    chart_config = {
        "type": "pie",
        "title": "Solution Status Distribution",
        "series_field": "name",
        "value_field": "value",
    }
    chart_data = [
        {"name": "MP", "value": kpi["mp_count"]},
        {"name": "Developing", "value": kpi["developing_count"]},
        {"name": "Planned", "value": kpi["planned_count"]},
        {"name": "Initiation", "value": kpi["initiation_count"]},
        {"name": "Resource Constrain", "value": kpi["resource_constrain_count"]},
    ]
    return _json_response(
        {"kpi": kpi, "chart_data": chart_data},
        chart_config=chart_config,
        summary=summary,
    )


def query_plant_coverage(db: Session) -> str:
    """Query MP coverage percentage by plant.

    Returns a bar chart showing each plant's MP deployment rate.
    """
    result = _get_summary(db)
    coverage = result["kpi"]["coverage_by_plant"]
    summary_parts = [f"{c['plant']}: {c['mp_percentage']}%" for c in coverage]
    chart_config = {
        "type": "bar",
        "title": "Plant MP Coverage (%)",
        "x_field": "plant",
        "y_field": "mp_percentage",
    }
    return _json_response(
        coverage,
        chart_config=chart_config,
        summary="MP coverage by plant: " + ", ".join(summary_parts),
    )


def query_g_items(
    db: Session,
    plant_ids: list[int] | None = None,
    process_ids: list[int] | None = None,
    reasons: list[str] | None = None,
    search: str | None = None,
) -> str:
    """Query G$ items with optional filters.

    Returns a table of G$ items with their solution maps.
    """
    items, total = _list_g_items(
        db,
        plant_ids=plant_ids,
        process_ids=process_ids,
        reasons=reasons,
        search=search,
        page=1,
        limit=50,
    )
    summary = f"Found {total} G$ items."
    if items:
        summary += f" First item: {items[0]['name']} ({items[0]['process']})"
    return _json_response(
        {"items": items[:20], "total": total},
        chart_config={"type": "table", "title": "G$ Items"},
        summary=summary,
    )


def query_g_tracking(db: Session, year: int | None = None) -> str:
    """Query G$ tracking progress data.

    Returns monthly targets vs actuals with a line chart configuration.
    """
    data = _get_tracking_data(db, year=year)
    monthly = data["monthly_targets"]
    items = data["items"]
    complete_count = sum(1 for i in items if i["status"] == "Complete")
    total_count = len(items)
    summary = (
        f"G$ Tracking: {complete_count}/{total_count} items complete. "
        f"Monthly data available for {len(monthly)} months."
    )
    chart_config = {
        "type": "line",
        "title": "G$ Tracking Monthly Progress",
        "x_field": "month",
        "y_fields": ["budget", "stretch", "actual_cumulative"],
    }
    return _json_response(
        {
            "monthly_targets": monthly,
            "plant_targets": data["plant_targets"],
            "complete_count": complete_count,
            "total_count": total_count,
        },
        chart_config=chart_config,
        summary=summary,
    )


def query_solutions_by_filter(
    db: Session,
    process_id: int | None = None,
    station_id: int | None = None,
    defect_type_id: int | None = None,
    plant_id: int | None = None,
    is_g_item: bool | None = None,
) -> str:
    """Query solutions with various filter criteria.

    Returns a filtered table of solutions with process, station, and defect info.
    """
    query = (
        db.query(Solution, Station, Process, DefectType, DefectCategory)
        .join(Station, Solution.station_id == Station.id)
        .join(Process, Station.process_id == Process.id)
        .join(DefectType, Solution.defect_type_id == DefectType.id)
        .join(DefectCategory, DefectType.category_id == DefectCategory.id)
        .filter(Solution.is_active == True)  # noqa: E712
    )

    if process_id:
        query = query.filter(Process.id == process_id)
    if station_id:
        query = query.filter(Station.id == station_id)
    if defect_type_id:
        query = query.filter(DefectType.id == defect_type_id)
    if is_g_item is not None:
        query = query.filter(Solution.is_g_item == is_g_item)

    rows = query.order_by(Station.sort_order, Solution.name).limit(50).all()

    solutions = [
        {
            "id": sol.id,
            "name": sol.name,
            "process": proc.name,
            "station": sta.name,
            "defect_type": dt.name,
            "defect_category": cat.name,
            "quality_attribute": sol.quality_attribute,
            "is_g_item": sol.is_g_item,
        }
        for sol, sta, proc, dt, cat in rows
    ]

    summary = f"Found {len(solutions)} solutions"
    if process_id:
        summary += f" for process_id={process_id}"

    return _json_response(
        solutions,
        chart_config={"type": "table", "title": "Solutions"},
        summary=summary,
    )


def query_solution_map_status(
    db: Session,
    plant_id: int | None = None,
    process_id: int | None = None,
) -> str:
    """Query solution map status distribution.

    Returns a pie chart of status counts across all solution maps.
    """
    status_counts = (
        db.query(
            StatusDefinition.name,
            StatusDefinition.code,
            StatusDefinition.color,
            func.count(SolutionMap.id).label("count"),
        )
        .join(SolutionMap, SolutionMap.status_id == StatusDefinition.id)
        .join(Solution, SolutionMap.solution_id == Solution.id)
        .join(TankLine, SolutionMap.tank_line_id == TankLine.id)
    )
    if plant_id:
        status_counts = status_counts.join(
            Plant, TankLine.plant_id == Plant.id
        ).filter(Plant.id == plant_id)
    if process_id:
        status_counts = status_counts.join(
            Station, Solution.station_id == Station.id
        ).filter(Station.process_id == process_id)

    rows = status_counts.group_by(
        StatusDefinition.name, StatusDefinition.code, StatusDefinition.color
    ).all()

    data = [
        {"status": row.name, "code": row.code, "color": row.color, "count": row.count}
        for row in rows
    ]
    total = sum(d["count"] for d in data)
    summary = f"Solution map status distribution (total {total}): " + ", ".join(
        f"{d['status']}: {d['count']}" for d in data
    )
    chart_config = {
        "type": "pie",
        "title": "Solution Map Status Distribution",
        "series_field": "status",
        "value_field": "count",
    }
    return _json_response(data, chart_config=chart_config, summary=summary)


def query_process_analysis(db: Session, plant_id: int | None = None) -> str:
    """Query process analysis showing solutions per station.

    Returns a bar chart of solution counts grouped by station.
    """
    result = _get_process_analysis(db, plant_id=plant_id)
    nodes = result["nodes"]
    data = [
        {
            "station": n["station"],
            "process": n["process"],
            "solution_count": n["solution_count"],
        }
        for n in nodes
    ]
    summary = f"Process analysis: {len(nodes)} stations with solutions."
    if nodes:
        top = max(nodes, key=lambda x: x["solution_count"])
        summary += f" Highest: {top['station']} ({top['solution_count']} solutions)"
    chart_config = {
        "type": "bar",
        "title": "Solutions per Station",
        "x_field": "station",
        "y_field": "solution_count",
    }
    return _json_response(data, chart_config=chart_config, summary=summary)
