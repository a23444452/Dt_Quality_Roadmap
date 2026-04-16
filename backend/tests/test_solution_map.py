import pytest
from fastapi.testclient import TestClient
from sqlalchemy import BigInteger, Integer, event, create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.dependencies import get_db
from app.main import app
from app.models.audit_log import AuditLog
from app.models.defect import DefectCategory, DefectType
from app.models.plant import Plant, TankLine
from app.models.process import Process, Station
from app.models.solution import Solution
from app.models.solution_map import SolutionMap
from app.models.status_definition import StatusDefinition
from app.models.user import User
from app.utils.security import hash_password, create_access_token


def _sqlite_bigint_workaround(target, connection, **kwargs):
    """
    SQLite does not support autoincrement with BigInteger PKs.
    Swap BigInteger PK columns to Integer before table creation so that
    SQLite treats them as INTEGER (autoincrement-capable) while the
    production Postgres schema keeps BigInteger via Alembic.
    """
    for table in target.tables.values():
        for col in table.columns:
            if (
                col.primary_key
                and isinstance(col.type, BigInteger)
            ):
                col.type = Integer()


@pytest.fixture
def client():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    connection = engine.connect()

    # Apply BigInteger→Integer workaround for SQLite
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


def _create_user(client, role: str, username: str) -> tuple[int, str]:
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
    token = create_access_token(user.id, user.role)
    return user.id, token


def _setup_full_scenario(client) -> dict:
    """
    Create: process, station, defect category, defect type, plant, tank line,
    status, solution, and a solution_map entry. Return all IDs.
    """
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

    status = StatusDefinition(code="OPEN", name="Open", color="#FF0000", sort_order=1)
    db.add(status)
    db.flush()

    status2 = StatusDefinition(code="DONE", name="Done", color="#00FF00", sort_order=2)
    db.add(status2)
    db.flush()

    solution = Solution(
        defect_type_id=defect_type.id,
        station_id=station.id,
        name="Polish Surface",
        sort_order=1,
    )
    db.add(solution)
    db.flush()

    sm = SolutionMap(
        solution_id=solution.id,
        tank_line_id=tank_line.id,
        status_id=status.id,
        notes="Initial note",
        version=1,
    )
    db.add(sm)
    db.commit()
    db.refresh(sm)

    return {
        "process_id": process.id,
        "station_id": station.id,
        "category_id": category.id,
        "defect_type_id": defect_type.id,
        "plant_id": plant.id,
        "tank_line_id": tank_line.id,
        "status_id": status.id,
        "status2_id": status2.id,
        "solution_id": solution.id,
        "map_id": sm.id,
    }


def editor_headers(client) -> tuple[int, dict]:
    uid, token = _create_user(client, "editor", "editoruser")
    return uid, {"Authorization": f"Bearer {token}"}


def viewer_headers(client) -> dict:
    _, token = _create_user(client, "viewer", "vieweruser")
    return {"Authorization": f"Bearer {token}"}


# ─── Tests ────────────────────────────────────────────────────────────────────

def test_get_pivot_data_returns_solutions_with_statuses(client):
    uid, hdrs = editor_headers(client)
    ids = _setup_full_scenario(client)

    resp = client.get("/api/v1/solution-map", headers=hdrs)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True

    payload = data["data"]
    assert "solutions" in payload
    assert "lines" in payload
    assert "filters" in payload

    assert len(payload["solutions"]) == 1
    sol = payload["solutions"][0]
    assert sol["name"] == "Polish Surface"
    assert sol["station"] == "Dip Tank"
    assert sol["process"] == "Electrocoat"

    line_key = f"line_{ids['tank_line_id']}"
    assert line_key in sol["statuses"]
    assert sol["statuses"][line_key]["status_code"] == "OPEN"
    assert sol["statuses"][line_key]["version"] == 1

    assert len(payload["lines"]) == 1
    assert payload["lines"][0]["plant"] == "Main Factory"


def test_put_solution_map_correct_version(client):
    uid, hdrs = editor_headers(client)
    ids = _setup_full_scenario(client)

    resp = client.put(f"/api/v1/solution-map/{ids['map_id']}", json={
        "status_id": ids["status2_id"],
        "notes": "Updated note",
        "version": 1,
    }, headers=hdrs)

    assert resp.status_code == 200
    result = resp.json()["data"]
    assert result["status_id"] == ids["status2_id"]
    assert result["notes"] == "Updated note"
    assert result["version"] == 2


def test_put_solution_map_wrong_version_returns_409(client):
    uid, hdrs = editor_headers(client)
    ids = _setup_full_scenario(client)

    resp = client.put(f"/api/v1/solution-map/{ids['map_id']}", json={
        "status_id": ids["status2_id"],
        "notes": "Stale update",
        "version": 99,  # Wrong version
    }, headers=hdrs)

    assert resp.status_code == 409
    assert "Conflict" in resp.json()["detail"]


def test_put_solution_map_not_found(client):
    uid, hdrs = editor_headers(client)

    resp = client.put("/api/v1/solution-map/9999", json={
        "status_id": 1,
        "version": 1,
    }, headers=hdrs)

    assert resp.status_code == 404


def test_batch_upsert_creates_new_and_updates_existing(client):
    uid, hdrs = editor_headers(client)
    ids = _setup_full_scenario(client)

    # Create a second solution with no existing map entry
    db = next(app.dependency_overrides[get_db]())
    solution2 = Solution(
        defect_type_id=ids["defect_type_id"],
        station_id=ids["station_id"],
        name="Sand and Repaint",
        sort_order=2,
    )
    db.add(solution2)
    db.commit()
    db.refresh(solution2)

    resp = client.post("/api/v1/solution-map/batch", json={
        "updates": [
            # Update existing
            {
                "solution_id": ids["solution_id"],
                "tank_line_id": ids["tank_line_id"],
                "status_id": ids["status2_id"],
                "notes": "Batch updated",
            },
            # Create new
            {
                "solution_id": solution2.id,
                "tank_line_id": ids["tank_line_id"],
                "status_id": ids["status_id"],
                "notes": "Newly created via batch",
            },
        ]
    }, headers=hdrs)

    assert resp.status_code == 200
    result = resp.json()["data"]
    assert result["created"] == 1
    assert result["updated"] == 1
    assert result["failed"] == 0


def test_filter_by_process_id(client):
    uid, hdrs = editor_headers(client)
    ids = _setup_full_scenario(client)

    # Filter by the existing process — should return 1 solution
    resp = client.get(f"/api/v1/solution-map?process_id={ids['process_id']}", headers=hdrs)
    assert resp.status_code == 200
    assert len(resp.json()["data"]["solutions"]) == 1

    # Filter by a non-existent process — should return 0 solutions
    resp_empty = client.get("/api/v1/solution-map?process_id=9999", headers=hdrs)
    assert resp_empty.status_code == 200
    assert len(resp_empty.json()["data"]["solutions"]) == 0


def test_filter_by_plant_id(client):
    uid, hdrs = editor_headers(client)
    ids = _setup_full_scenario(client)

    # Filter by the existing plant — should return 1 line
    resp = client.get(f"/api/v1/solution-map?plant_id={ids['plant_id']}", headers=hdrs)
    assert resp.status_code == 200
    assert len(resp.json()["data"]["lines"]) == 1

    # Filter by a non-existent plant — should return 0 lines
    resp_empty = client.get("/api/v1/solution-map?plant_id=9999", headers=hdrs)
    assert resp_empty.status_code == 200
    assert len(resp_empty.json()["data"]["lines"]) == 0


def test_audit_log_created_on_update(client):
    uid, hdrs = editor_headers(client)
    ids = _setup_full_scenario(client)

    client.put(f"/api/v1/solution-map/{ids['map_id']}", json={
        "status_id": ids["status2_id"],
        "notes": "Audited change",
        "version": 1,
    }, headers=hdrs)

    # Check audit log was created
    db = next(app.dependency_overrides[get_db]())
    logs = db.query(AuditLog).filter(
        AuditLog.entity_type == "solution_map",
        AuditLog.entity_id == ids["map_id"],
        AuditLog.action == "UPDATE",
    ).all()

    assert len(logs) == 1
    assert logs[0].user_id == uid
