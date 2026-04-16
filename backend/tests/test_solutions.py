import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.dependencies import get_db
from app.main import app
from app.models.defect import DefectCategory, DefectType
from app.models.plant import Plant, TankLine
from app.models.process import Process, Station
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


def _setup_reference_data(client) -> dict:
    """Create the minimum reference data needed for solutions."""
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
    db.commit()
    db.refresh(station)
    db.refresh(defect_type)

    return {"station_id": station.id, "defect_type_id": defect_type.id}


def editor_headers(client) -> dict:
    token = _create_user(client, "editor", "editoruser")
    return {"Authorization": f"Bearer {token}"}


def viewer_headers(client) -> dict:
    token = _create_user(client, "viewer", "vieweruser")
    return {"Authorization": f"Bearer {token}"}


def admin_headers(client) -> dict:
    token = _create_user(client, "admin", "adminuser")
    return {"Authorization": f"Bearer {token}"}


# ─── Tests ────────────────────────────────────────────────────────────────────

def test_create_solution_as_editor(client):
    headers = editor_headers(client)
    ref = _setup_reference_data(client)

    resp = client.post("/api/v1/solutions", json={
        "defect_type_id": ref["defect_type_id"],
        "station_id": ref["station_id"],
        "name": "Polish and wax",
        "description": "Use fine polish then wax",
    }, headers=headers)

    assert resp.status_code == 201
    data = resp.json()
    assert data["success"] is True
    assert data["data"]["name"] == "Polish and wax"
    assert data["data"]["is_active"] is True


def test_create_solution_as_viewer_forbidden(client):
    editor_headers(client)  # Create editor first so DB has at least one user
    headers = viewer_headers(client)
    ref = _setup_reference_data(client)

    resp = client.post("/api/v1/solutions", json={
        "defect_type_id": ref["defect_type_id"],
        "station_id": ref["station_id"],
        "name": "Some Solution",
    }, headers=headers)

    assert resp.status_code == 403


def test_list_solutions(client):
    headers = editor_headers(client)
    ref = _setup_reference_data(client)

    client.post("/api/v1/solutions", json={
        "defect_type_id": ref["defect_type_id"],
        "station_id": ref["station_id"],
        "name": "Solution A",
    }, headers=headers)
    client.post("/api/v1/solutions", json={
        "defect_type_id": ref["defect_type_id"],
        "station_id": ref["station_id"],
        "name": "Solution B",
    }, headers=headers)

    resp = client.get("/api/v1/solutions", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert len(data["data"]) == 2


def test_get_single_solution(client):
    headers = editor_headers(client)
    ref = _setup_reference_data(client)

    create_resp = client.post("/api/v1/solutions", json={
        "defect_type_id": ref["defect_type_id"],
        "station_id": ref["station_id"],
        "name": "Single Solution",
    }, headers=headers)
    item_id = create_resp.json()["data"]["id"]

    get_resp = client.get(f"/api/v1/solutions/{item_id}", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["data"]["name"] == "Single Solution"


def test_update_solution(client):
    headers = editor_headers(client)
    ref = _setup_reference_data(client)

    create_resp = client.post("/api/v1/solutions", json={
        "defect_type_id": ref["defect_type_id"],
        "station_id": ref["station_id"],
        "name": "Original Name",
    }, headers=headers)
    item_id = create_resp.json()["data"]["id"]

    update_resp = client.put(f"/api/v1/solutions/{item_id}", json={
        "name": "Updated Name",
    }, headers=headers)
    assert update_resp.status_code == 200
    assert update_resp.json()["data"]["name"] == "Updated Name"


def test_soft_delete_as_admin(client):
    editor_tok = _create_user(client, "editor", "editoruser")
    editor_hdrs = {"Authorization": f"Bearer {editor_tok}"}
    ref = _setup_reference_data(client)

    create_resp = client.post("/api/v1/solutions", json={
        "defect_type_id": ref["defect_type_id"],
        "station_id": ref["station_id"],
        "name": "To Be Deleted",
    }, headers=editor_hdrs)
    item_id = create_resp.json()["data"]["id"]

    # Delete as admin
    admin_tok = _create_user(client, "admin", "adminuser")
    admin_hdrs = {"Authorization": f"Bearer {admin_tok}"}
    del_resp = client.delete(f"/api/v1/solutions/{item_id}", headers=admin_hdrs)
    assert del_resp.status_code == 200
    assert del_resp.json()["data"]["is_active"] is False

    # Confirm the item is now inactive
    get_resp = client.get(f"/api/v1/solutions/{item_id}", headers=admin_hdrs)
    assert get_resp.json()["data"]["is_active"] is False


def test_soft_delete_as_editor_forbidden(client):
    headers = editor_headers(client)
    ref = _setup_reference_data(client)

    create_resp = client.post("/api/v1/solutions", json={
        "defect_type_id": ref["defect_type_id"],
        "station_id": ref["station_id"],
        "name": "Delete Attempt",
    }, headers=headers)
    item_id = create_resp.json()["data"]["id"]

    del_resp = client.delete(f"/api/v1/solutions/{item_id}", headers=headers)
    assert del_resp.status_code == 403


def test_get_solution_not_found(client):
    headers = viewer_headers(client)
    resp = client.get("/api/v1/solutions/9999", headers=headers)
    assert resp.status_code == 404
