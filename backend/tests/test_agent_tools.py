import json

from app.models.defect import DefectCategory, DefectType
from app.models.plant import Plant, TankLine
from app.models.process import Process, Station
from app.models.solution import Solution
from app.models.solution_map import SolutionMap
from app.models.status_definition import StatusDefinition
from app.services.agent_tools import (
    query_dashboard_kpi,
    query_plant_coverage,
    query_g_items,
    query_g_tracking,
    query_solutions_by_filter,
    query_solution_map_status,
    query_process_analysis,
)


def _seed_data(db):
    """Seed minimal data for agent tool tests."""
    status_mp = StatusDefinition(id=1, code="MP", name="Mass Production", color="#22c55e", sort_order=1)
    status_dev = StatusDefinition(id=2, code="DEVELOPING", name="Developing", color="#f59e0b", sort_order=2)
    db.add_all([status_mp, status_dev])

    cat = DefectCategory(id=1, name="Surface", sort_order=1)
    db.add(cat)

    dt = DefectType(id=1, name="Scratch", category_id=1, sort_order=1)
    db.add(dt)

    proc = Process(id=1, name="Melting", category="Melting", sort_order=1)
    db.add(proc)

    sta = Station(id=1, name="Furnace", process_id=1, sort_order=1)
    db.add(sta)

    plant = Plant(id=1, name="TPK", code="TPK", sort_order=1)
    db.add(plant)

    tl = TankLine(id=1, name="TL-1", code="TL1", plant_id=1, line_type="Line", sort_order=1)
    db.add(tl)

    sol = Solution(id=1, name="Sol-A", defect_type_id=1, station_id=1, sort_order=1, is_g_item=True)
    db.add(sol)

    sm = SolutionMap(id=1, solution_id=1, tank_line_id=1, status_id=1)
    db.add(sm)

    db.commit()


def test_query_dashboard_kpi(db_session):
    _seed_data(db_session)
    result = json.loads(query_dashboard_kpi(db_session))
    assert result["data"]["kpi"]["total_solutions"] >= 1
    assert "chart_config" in result
    assert result["chart_config"]["type"] == "pie"


def test_query_plant_coverage(db_session):
    _seed_data(db_session)
    result = json.loads(query_plant_coverage(db_session))
    assert len(result["data"]) >= 1
    assert result["data"][0]["plant"] == "TPK"
    assert result["chart_config"]["type"] == "bar"


def test_query_g_items(db_session):
    _seed_data(db_session)
    result = json.loads(query_g_items(db_session))
    assert result["data"]["total"] >= 1


def test_query_g_tracking(db_session):
    _seed_data(db_session)
    result = json.loads(query_g_tracking(db_session))
    assert "complete_count" in result["data"]
    assert "total_count" in result["data"]
    assert result["chart_config"]["type"] == "line"


def test_query_solutions_by_filter(db_session):
    _seed_data(db_session)
    result = json.loads(query_solutions_by_filter(db_session, process_id=1))
    assert len(result["data"]) >= 1
    assert result["data"][0]["name"] == "Sol-A"


def test_query_solution_map_status(db_session):
    _seed_data(db_session)
    result = json.loads(query_solution_map_status(db_session))
    assert len(result["data"]) >= 1
    assert result["chart_config"]["type"] == "pie"


def test_query_process_analysis(db_session):
    _seed_data(db_session)
    result = json.loads(query_process_analysis(db_session))
    assert len(result["data"]) >= 1
    assert result["data"][0]["station"] == "Furnace"
    assert result["chart_config"]["type"] == "bar"
