import pytest
from fastapi.testclient import TestClient
from sqlalchemy import BigInteger, Integer, event, create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.dependencies import get_db
from app.main import app
from app.models.defect import DefectCategory, DefectType
from app.models.plant import Plant, TankLine
from app.models.process import Process, Station
from app.models.solution import Solution
from app.models.solution_map import SolutionMap
from app.models.status_definition import StatusDefinition
from app.models.user import User
from app.utils.security import hash_password, create_access_token


def _sqlite_bigint_workaround(target, connection, **kwargs):
    for table in target.tables.values():
        for col in table.columns:
            if col.primary_key and isinstance(col.type, BigInteger):
                col.type = Integer()


@pytest.fixture
def client():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    connection = engine.connect()

    event.listen(Base.metadata, "before_create", _sqlite_bigint_workaround)
    Base.metadata.create_all(bind=connection)
    event.remove(Base.metadata, "before_create", _sqlite_bigint_workaround)

    TestSession = sessionmaker(bind=connection)

    def override_get_db():
        session = TestSession()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=connection)
    connection.close()


def _create_user(client, role: str, username: str) -> str:
    db = next(app.dependency_overrides[get_db]())
    user = User(
        username=username,
        email=f"{username}@example.com",
        password_hash=hash_password("TestPass123"),
        display_name=username.capitalize(),
        role=role,
        status="active",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return create_access_token(user.id, user.role)


def viewer_headers(client) -> dict:
    token = _create_user(client, "viewer", "vieweruser")
    return {"Authorization": f"Bearer {token}"}


def _seed_data(client, mp_code: str = "MP", dev_code: str = "DEV", plan_code: str = "PLAN") -> dict:
    """Seed a complete scenario with statuses, solution, solution map."""
    db = next(app.dependency_overrides[get_db]())

    process = Process(name="Electrocoat", sort_order=1)
    db.add(process)
    db.flush()

    station = Station(process_id=process.id, name="Dip Tank", sort_order=1)
    db.add(station)
    db.flush()

    category = DefectCategory(name="Surface Defects", sort_order=1)
    db.add(category)
    db.flush()

    defect_type = DefectType(category_id=category.id, name="Scratch", sort_order=1)
    db.add(defect_type)
    db.flush()

    plant = Plant(name="Main Factory", code="MF01", sort_order=1)
    db.add(plant)
    db.flush()

    tank_line = TankLine(plant_id=plant.id, name="Line A", code="LA", sort_order=1)
    db.add(tank_line)
    db.flush()

    mp_status = StatusDefinition(code=mp_code, name="Mass Production", color="#00FF00", sort_order=1)
    dev_status = StatusDefinition(code=dev_code, name="Developing", color="#FFFF00", sort_order=2)
    plan_status = StatusDefinition(code=plan_code, name="Planned", color="#0000FF", sort_order=3)
    db.add_all([mp_status, dev_status, plan_status])
    db.flush()

    solution = Solution(
        defect_type_id=defect_type.id,
        station_id=station.id,
        name="Polish Surface",
        sort_order=1,
    )
    db.add(solution)
    db.flush()

    # Create 3 solution map entries: 2 MP, 1 DEV
    tank_line2 = TankLine(plant_id=plant.id, name="Line B", code="LB", sort_order=2)
    db.add(tank_line2)
    db.flush()

    solution2 = Solution(
        defect_type_id=defect_type.id,
        station_id=station.id,
        name="Sand Surface",
        sort_order=2,
    )
    db.add(solution2)
    db.flush()

    sm1 = SolutionMap(solution_id=solution.id, tank_line_id=tank_line.id, status_id=mp_status.id)
    sm2 = SolutionMap(solution_id=solution2.id, tank_line_id=tank_line.id, status_id=mp_status.id)
    sm3 = SolutionMap(solution_id=solution.id, tank_line_id=tank_line2.id, status_id=dev_status.id)
    db.add_all([sm1, sm2, sm3])
    db.commit()

    return {
        "plant_id": plant.id,
        "mp_status_id": mp_status.id,
        "dev_status_id": dev_status.id,
        "plan_status_id": plan_status.id,
        "category_id": category.id,
        "defect_type_id": defect_type.id,
        "station_id": station.id,
    }


# ─── Tests ────────────────────────────────────────────────────────────────────

def test_summary_requires_auth(client):
    resp = client.get("/api/v1/dashboard/summary")
    assert resp.status_code == 403


def test_summary_empty_database(client):
    headers = viewer_headers(client)
    resp = client.get("/api/v1/dashboard/summary", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    kpi = data["data"]["kpi"]
    assert kpi["total_solutions"] == 0
    assert kpi["mp_count"] == 0
    assert kpi["mp_percentage"] == 0
    assert kpi["developing_count"] == 0
    assert kpi["planned_count"] == 0
    assert kpi["coverage_by_plant"] == []
    sankey = data["data"]["sankey"]
    assert sankey["nodes"] == []
    assert sankey["links"] == []


def test_summary_kpi_counts(client):
    headers = viewer_headers(client)
    _seed_data(client)

    resp = client.get("/api/v1/dashboard/summary", headers=headers)
    assert resp.status_code == 200
    kpi = resp.json()["data"]["kpi"]

    assert kpi["total_solutions"] == 3
    assert kpi["mp_count"] == 2
    assert kpi["mp_percentage"] == round((2 / 3) * 100, 1)
    assert kpi["developing_count"] == 1
    assert kpi["planned_count"] == 0


def test_summary_coverage_by_plant(client):
    headers = viewer_headers(client)
    _seed_data(client)

    resp = client.get("/api/v1/dashboard/summary", headers=headers)
    assert resp.status_code == 200
    coverage = resp.json()["data"]["kpi"]["coverage_by_plant"]

    assert len(coverage) == 1
    plant_cov = coverage[0]
    assert plant_cov["plant"] == "Main Factory"
    assert plant_cov["total"] == 3
    # 2 out of 3 are MP
    assert plant_cov["mp_percentage"] == round((2 / 3) * 100, 1)


def test_summary_sankey_nodes_have_required_fields(client):
    headers = viewer_headers(client)
    _seed_data(client)

    resp = client.get("/api/v1/dashboard/summary", headers=headers)
    assert resp.status_code == 200
    nodes = resp.json()["data"]["sankey"]["nodes"]

    assert len(nodes) > 0
    for node in nodes:
        assert "id" in node
        assert "name" in node
        assert "layer" in node
        assert node["layer"] in ("defect_category", "defect_type", "station", "status")


def test_summary_sankey_links_connect_layers(client):
    headers = viewer_headers(client)
    _seed_data(client)

    resp = client.get("/api/v1/dashboard/summary", headers=headers)
    assert resp.status_code == 200
    sankey = resp.json()["data"]["sankey"]
    nodes = {n["id"]: n for n in sankey["nodes"]}
    links = sankey["links"]

    # Each link should reference valid node IDs
    for link in links:
        assert link["source"] in nodes
        assert link["target"] in nodes
        assert link["value"] > 0

    # Should have 3 layers of links (cat→type, type→station, station→status)
    sources = {link["source"][:link["source"].rfind("_")] if "_" in link["source"] else link["source"] for link in links}
    # At minimum we expect links between all 4 layers = 3 edge types
    assert len(links) >= 3


def test_defect_analysis_endpoint(client):
    headers = viewer_headers(client)
    resp = client.get("/api/v1/dashboard/defect-analysis", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["data"]["group_by"] == "defect_category"
    assert isinstance(data["data"]["data"], list)


def test_process_analysis_endpoint(client):
    headers = viewer_headers(client)
    resp = client.get("/api/v1/dashboard/process-analysis", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["data"]["group_by"] == "station"
    assert isinstance(data["data"]["data"], list)


def test_defect_analysis_accepts_filter_params(client):
    headers = viewer_headers(client)
    resp = client.get(
        "/api/v1/dashboard/defect-analysis?process_id=1&plant_id=1&group_by=defect_type",
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["group_by"] == "defect_type"
