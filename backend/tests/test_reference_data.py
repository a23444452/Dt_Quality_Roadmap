import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.dependencies import get_db
from app.main import app
from app.models.user import User
from app.utils.security import hash_password, create_access_token


@pytest.fixture
def client():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    connection = engine.connect()
    Base.metadata.create_all(bind=connection)
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
    """Create a user in the DB and return a JWT token."""
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
    return token


def admin_headers(client) -> dict:
    token = _create_user(client, "admin", "adminuser")
    return {"Authorization": f"Bearer {token}"}


def viewer_headers(client) -> dict:
    token = _create_user(client, "viewer", "vieweruser")
    return {"Authorization": f"Bearer {token}"}


# ─── Statuses ────────────────────────────────────────────────────────────────

def test_list_statuses_authenticated(client):
    headers = viewer_headers(client)
    resp = client.get("/api/v1/statuses", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert isinstance(data["data"], list)


def test_create_status_as_admin(client):
    headers = admin_headers(client)
    resp = client.post("/api/v1/statuses", json={
        "code": "OPEN",
        "name": "Open",
        "color": "#FF0000",
        "sort_order": 1,
    }, headers=headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["success"] is True
    assert data["data"]["code"] == "OPEN"


def test_create_status_as_viewer_forbidden(client):
    # Must create admin first (shares same in-memory DB)
    admin_headers(client)
    headers = viewer_headers(client)
    resp = client.post("/api/v1/statuses", json={
        "code": "OPEN",
        "name": "Open",
        "color": "#FF0000",
    }, headers=headers)
    assert resp.status_code == 403


def test_update_status_as_admin(client):
    headers = admin_headers(client)
    create_resp = client.post("/api/v1/statuses", json={
        "code": "OPEN",
        "name": "Open",
        "color": "#FF0000",
    }, headers=headers)
    item_id = create_resp.json()["data"]["id"]

    update_resp = client.put(f"/api/v1/statuses/{item_id}", json={
        "name": "Open Updated",
    }, headers=headers)
    assert update_resp.status_code == 200
    assert update_resp.json()["data"]["name"] == "Open Updated"


def test_get_single_status(client):
    headers = admin_headers(client)
    create_resp = client.post("/api/v1/statuses", json={
        "code": "DONE",
        "name": "Done",
        "color": "#00FF00",
    }, headers=headers)
    item_id = create_resp.json()["data"]["id"]

    get_resp = client.get(f"/api/v1/statuses/{item_id}", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["data"]["code"] == "DONE"


def test_filter_statuses_by_is_active(client):
    headers = admin_headers(client)
    client.post("/api/v1/statuses", json={"code": "A", "name": "Active", "color": "#AAA"}, headers=headers)
    item_resp = client.post("/api/v1/statuses", json={"code": "B", "name": "Inactive", "color": "#BBB"}, headers=headers)
    item_id = item_resp.json()["data"]["id"]
    client.put(f"/api/v1/statuses/{item_id}", json={"is_active": False}, headers=headers)

    resp = client.get("/api/v1/statuses?is_active=true", headers=headers)
    assert resp.status_code == 200
    results = resp.json()["data"]
    assert all(r["is_active"] for r in results)

    resp_inactive = client.get("/api/v1/statuses?is_active=false", headers=headers)
    assert resp_inactive.status_code == 200
    inactive_results = resp_inactive.json()["data"]
    assert all(not r["is_active"] for r in inactive_results)


def test_get_status_not_found(client):
    headers = viewer_headers(client)
    resp = client.get("/api/v1/statuses/9999", headers=headers)
    assert resp.status_code == 404


# ─── Defects hierarchy ───────────────────────────────────────────────────────

def test_defect_category_and_type_hierarchy(client):
    headers = admin_headers(client)

    # Create category
    cat_resp = client.post("/api/v1/defect-categories", json={
        "name": "Surface Defects",
        "description": "Visible surface issues",
        "sort_order": 1,
    }, headers=headers)
    assert cat_resp.status_code == 201
    cat_id = cat_resp.json()["data"]["id"]

    # Create type under category
    type_resp = client.post("/api/v1/defect-types", json={
        "category_id": cat_id,
        "name": "Scratch",
        "description": "Surface scratch",
        "sort_order": 1,
    }, headers=headers)
    assert type_resp.status_code == 201
    type_data = type_resp.json()["data"]
    assert type_data["category_id"] == cat_id
    assert type_data["name"] == "Scratch"

    # List types filtered by category
    list_resp = client.get(f"/api/v1/defect-types?category_id={cat_id}", headers=headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()["data"]) == 1


def test_create_defect_type_invalid_category(client):
    headers = admin_headers(client)
    resp = client.post("/api/v1/defect-types", json={
        "category_id": 9999,
        "name": "Ghost Type",
    }, headers=headers)
    assert resp.status_code == 404


# ─── Processes hierarchy ─────────────────────────────────────────────────────

def test_process_and_station_hierarchy(client):
    headers = admin_headers(client)

    # Create process
    proc_resp = client.post("/api/v1/processes", json={
        "name": "Electrocoat",
        "description": "E-coat process",
        "sort_order": 1,
    }, headers=headers)
    assert proc_resp.status_code == 201
    proc_id = proc_resp.json()["data"]["id"]

    # Create station under process
    station_resp = client.post("/api/v1/stations", json={
        "process_id": proc_id,
        "name": "Dip Tank",
        "description": "Initial dip",
        "sort_order": 1,
    }, headers=headers)
    assert station_resp.status_code == 201
    station_data = station_resp.json()["data"]
    assert station_data["process_id"] == proc_id
    assert station_data["name"] == "Dip Tank"

    # List stations filtered by process
    list_resp = client.get(f"/api/v1/stations?process_id={proc_id}", headers=headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()["data"]) == 1


def test_create_station_invalid_process(client):
    headers = admin_headers(client)
    resp = client.post("/api/v1/stations", json={
        "process_id": 9999,
        "name": "Ghost Station",
    }, headers=headers)
    assert resp.status_code == 404


# ─── Plants hierarchy ────────────────────────────────────────────────────────

def test_plant_and_tank_line_hierarchy(client):
    headers = admin_headers(client)

    # Create plant
    plant_resp = client.post("/api/v1/plants", json={
        "name": "Main Factory",
        "code": "MF01",
        "sort_order": 1,
    }, headers=headers)
    assert plant_resp.status_code == 201
    plant_id = plant_resp.json()["data"]["id"]

    # Create tank line under plant
    tl_resp = client.post("/api/v1/tank-lines", json={
        "plant_id": plant_id,
        "name": "Line A",
        "code": "LA",
        "sort_order": 1,
    }, headers=headers)
    assert tl_resp.status_code == 201
    tl_data = tl_resp.json()["data"]
    assert tl_data["plant_id"] == plant_id
    assert tl_data["code"] == "LA"

    # List tank lines filtered by plant
    list_resp = client.get(f"/api/v1/tank-lines?plant_id={plant_id}", headers=headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()["data"]) == 1


def test_create_tank_line_invalid_plant(client):
    headers = admin_headers(client)
    resp = client.post("/api/v1/tank-lines", json={
        "plant_id": 9999,
        "name": "Ghost Line",
        "code": "GL",
    }, headers=headers)
    assert resp.status_code == 404


def test_unauthenticated_access_denied(client):
    resp = client.get("/api/v1/statuses")
    assert resp.status_code == 403
