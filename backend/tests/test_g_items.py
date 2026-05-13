"""Tests for the G$ Management feature (schemas, service, router)."""
import pytest
from pydantic import ValidationError

from app.schemas.g_item import GItemUpdate


# ─── Schema tests ─────────────────────────────────────────────────────────────

def test_gitem_update_accepts_valid_reasons():
    for code in ("QI", "FMEA_H_RISK", "OTHER"):
        body = GItemUpdate(reason=code)
        assert body.reason == code


def test_gitem_update_rejects_bad_reason():
    with pytest.raises(ValidationError):
        GItemUpdate(reason="BOGUS")


def test_gitem_update_allows_null_reason_and_remark():
    body = GItemUpdate(reason=None, remark=None)
    assert body.reason is None
    assert body.remark is None


def test_gitem_update_rejects_overly_long_remark():
    with pytest.raises(ValidationError):
        GItemUpdate(remark="x" * 1001)


def test_gitem_update_accepts_empty_string_remark():
    body = GItemUpdate(remark="")
    assert body.remark == ""
# ─── Service tests: list_g_items ──────────────────────────────────────────────
from sqlalchemy import BigInteger, Integer, event, create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.defect import DefectCategory, DefectType
from app.models.plant import Plant, TankLine
from app.models.process import Process, Station
from app.models.solution import Solution
from app.models.solution_map import SolutionMap
from app.models.status_definition import StatusDefinition
from app.services.g_item_service import list_g_items


def _sqlite_bigint_workaround(target, connection, **kwargs):
    for table in target.tables.values():
        for col in table.columns:
            if col.primary_key and isinstance(col.type, BigInteger):
                col.type = Integer()


@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}
    )
    connection = engine.connect()
    event.listen(Base.metadata, "before_create", _sqlite_bigint_workaround)
    Base.metadata.create_all(bind=connection)
    event.remove(Base.metadata, "before_create", _sqlite_bigint_workaround)
    TestSession = sessionmaker(bind=connection)
    session = TestSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=connection)
        connection.close()


def _seed_minimal(db):
    """Create one G$ solution with one SolutionMap entry, plus one non-G$ solution."""
    proc = Process(name="Finishing", sort_order=1)
    db.add(proc); db.flush()
    sta = Station(process_id=proc.id, name="Coating", sort_order=1)
    db.add(sta); db.flush()
    cat = DefectCategory(name="Surface", sort_order=1)
    db.add(cat); db.flush()
    dt = DefectType(category_id=cat.id, name="Bubble", sort_order=1)
    db.add(dt); db.flush()
    plant = Plant(name="Plant Alpha", code="PA", sort_order=1)
    db.add(plant); db.flush()
    line = TankLine(plant_id=plant.id, name="Line A-1", code="LA1", sort_order=1)
    db.add(line); db.flush()
    status = StatusDefinition(code="MP", name="Mass Production", color="#28A745", sort_order=1)
    db.add(status); db.flush()

    g_sol = Solution(
        defect_type_id=dt.id, station_id=sta.id, name="Anti-Bubble Spray",
        quality_attribute="Bubble Control", is_g_item=True, reason="QI",
        remark="Critical quality issue",
    )
    non_g = Solution(
        defect_type_id=dt.id, station_id=sta.id, name="Plain Clean",
        is_g_item=False,
    )
    db.add_all([g_sol, non_g]); db.flush()

    sm = SolutionMap(
        solution_id=g_sol.id, tank_line_id=line.id, status_id=status.id, version=1,
    )
    db.add(sm)
    db.commit()
    return {
        "g_sol_id": g_sol.id, "plant_id": plant.id, "line_id": line.id,
        "status_id": status.id, "process_id": proc.id,
    }


def test_list_g_items_returns_only_g_items(db_session):
    _seed_minimal(db_session)
    items, total = list_g_items(db_session)
    assert total == 1
    assert len(items) == 1
    assert items[0]["name"] == "Anti-Bubble Spray"
    assert items[0]["reason"] == "QI"
    assert items[0]["remark"] == "Critical quality issue"


def test_list_g_items_returns_solution_map_entries(db_session):
    ids = _seed_minimal(db_session)
    items, _ = list_g_items(db_session)
    sm = items[0]["solution_map"]
    assert len(sm) == 1
    assert sm[0]["plant_id"] == ids["plant_id"]
    assert sm[0]["tank_line_id"] == ids["line_id"]
    assert sm[0]["status_code"] == "MP"
    assert sm[0]["status_color"] == "#28A745"
    assert sm[0]["version"] == 1


def test_list_g_items_solution_without_map_has_empty_array(db_session):
    _seed_minimal(db_session)
    # Add a second G$ solution with NO solution_map row
    dt = db_session.query(DefectType).first()
    sta = db_session.query(Station).first()
    extra = Solution(
        defect_type_id=dt.id, station_id=sta.id, name="Lonely G",
        is_g_item=True,
    )
    db_session.add(extra); db_session.commit()

    items, total = list_g_items(db_session)
    assert total == 2
    lonely = next(i for i in items if i["name"] == "Lonely G")
    assert lonely["solution_map"] == []


def test_list_g_items_filters_inactive_solutions(db_session):
    _seed_minimal(db_session)
    sol = db_session.query(Solution).filter(Solution.name == "Anti-Bubble Spray").first()
    sol.is_active = False
    db_session.commit()
    items, total = list_g_items(db_session)
    assert total == 0
    assert items == []


def test_list_g_items_filters_by_plant(db_session):
    ids = _seed_minimal(db_session)
    # Matching plant filter
    items, total = list_g_items(db_session, plant_ids=[ids["plant_id"]])
    assert total == 1
    # Non-matching plant filter
    items, total = list_g_items(db_session, plant_ids=[9999])
    assert total == 0


def test_list_g_items_filters_by_process(db_session):
    ids = _seed_minimal(db_session)
    items, total = list_g_items(db_session, process_ids=[ids["process_id"]])
    assert total == 1
    items, total = list_g_items(db_session, process_ids=[9999])
    assert total == 0


def test_list_g_items_filters_by_reason(db_session):
    _seed_minimal(db_session)  # only row has reason=QI
    items, total = list_g_items(db_session, reasons=["QI"])
    assert total == 1
    items, total = list_g_items(db_session, reasons=["FMEA_H_RISK"])
    assert total == 0


def test_list_g_items_filters_by_unspecified_reason(db_session):
    _seed_minimal(db_session)
    # Add a G$ solution with no reason
    dt = db_session.query(DefectType).first()
    sta = db_session.query(Station).first()
    db_session.add(Solution(
        defect_type_id=dt.id, station_id=sta.id, name="No-Reason G",
        is_g_item=True,
    ))
    db_session.commit()
    items, total = list_g_items(db_session, reasons=["UNSPECIFIED"])
    assert total == 1
    assert items[0]["name"] == "No-Reason G"


def test_list_g_items_search_is_case_insensitive(db_session):
    _seed_minimal(db_session)
    items, total = list_g_items(db_session, search="anti-bubble")
    assert total == 1


def test_list_g_items_pagination(db_session):
    _seed_minimal(db_session)
    # Add 2 more G$ solutions
    dt = db_session.query(DefectType).first()
    sta = db_session.query(Station).first()
    db_session.add(Solution(defect_type_id=dt.id, station_id=sta.id,
                            name="Extra A", is_g_item=True))
    db_session.add(Solution(defect_type_id=dt.id, station_id=sta.id,
                            name="Extra B", is_g_item=True))
    db_session.commit()
    items, total = list_g_items(db_session, page=1, limit=2)
    assert total == 3
    assert len(items) == 2
    items, total = list_g_items(db_session, page=2, limit=2)
    assert total == 3
    assert len(items) == 1


# ─── Service tests: update_g_item ─────────────────────────────────────────────
from app.services.g_item_service import update_g_item, NotGItemError


def test_update_g_item_sets_reason_and_remark(db_session):
    ids = _seed_minimal(db_session)
    updated = update_g_item(
        db_session, solution_id=ids["g_sol_id"], actor_id=1,
        fields={"reason": "FMEA_H_RISK", "remark": "changed"},
    )
    assert updated["reason"] == "FMEA_H_RISK"
    assert updated["remark"] == "changed"


def test_update_g_item_partial_leaves_other_field_alone(db_session):
    ids = _seed_minimal(db_session)
    # seed had reason=QI, remark="Critical quality issue"
    updated = update_g_item(
        db_session, solution_id=ids["g_sol_id"], actor_id=1,
        fields={"remark": "new remark only"},
    )
    assert updated["reason"] == "QI"  # untouched
    assert updated["remark"] == "new remark only"


def test_update_g_item_clears_fields_on_null(db_session):
    ids = _seed_minimal(db_session)
    updated = update_g_item(
        db_session, solution_id=ids["g_sol_id"], actor_id=1,
        fields={"reason": None, "remark": None},
    )
    assert updated["reason"] is None
    assert updated["remark"] is None


def test_update_g_item_empty_string_remark_becomes_null(db_session):
    ids = _seed_minimal(db_session)
    updated = update_g_item(
        db_session, solution_id=ids["g_sol_id"], actor_id=1,
        fields={"remark": ""},
    )
    assert updated["remark"] is None


def test_update_g_item_raises_not_found(db_session):
    _seed_minimal(db_session)
    with pytest.raises(LookupError):
        update_g_item(db_session, solution_id=99999, actor_id=1, fields={})


def test_update_g_item_raises_when_not_g_item(db_session):
    _seed_minimal(db_session)
    non_g = db_session.query(Solution).filter(Solution.name == "Plain Clean").first()
    with pytest.raises(NotGItemError):
        update_g_item(db_session, solution_id=non_g.id, actor_id=1, fields={})


def test_update_g_item_sets_updated_by(db_session):
    ids = _seed_minimal(db_session)
    update_g_item(
        db_session, solution_id=ids["g_sol_id"], actor_id=42,
        fields={"remark": "touched"},
    )
    sol = db_session.query(Solution).filter(Solution.id == ids["g_sol_id"]).first()
    assert sol.updated_by == 42


def test_update_g_item_on_inactive_solution_still_returns_response(db_session):
    """Regression: _serialize_g_item must return even for is_active=False, otherwise
    admin would get a 500 after a successful DB write."""
    ids = _seed_minimal(db_session)
    sol = db_session.query(Solution).filter(Solution.id == ids["g_sol_id"]).first()
    sol.is_active = False
    db_session.commit()

    updated = update_g_item(
        db_session, solution_id=ids["g_sol_id"], actor_id=1,
        fields={"remark": "still updatable?"},
    )
    assert updated["remark"] == "still updatable?"
    assert updated["name"] == "Anti-Bubble Spray"


def test_update_g_item_empty_fields_still_stamps_updated_by(db_session):
    ids = _seed_minimal(db_session)
    result = update_g_item(
        db_session, solution_id=ids["g_sol_id"], actor_id=7, fields={},
    )
    assert result["reason"] == "QI"   # unchanged
    assert result["remark"] == "Critical quality issue"
    sol = db_session.query(Solution).filter(Solution.id == ids["g_sol_id"]).first()
    assert sol.updated_by == 7


def test_update_g_item_reason_only(db_session):
    ids = _seed_minimal(db_session)
    updated = update_g_item(
        db_session, solution_id=ids["g_sol_id"], actor_id=1,
        fields={"reason": "OTHER"},
    )
    assert updated["reason"] == "OTHER"
    assert updated["remark"] == "Critical quality issue"  # untouched
