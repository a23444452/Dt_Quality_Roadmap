# G$ Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new admin-visible "G$ Management" page that lists every Solution where `is_g_item=True`, lets Admins set a Reason (QI / FMEA H-risk / Other) and free-form Remark, and lets Admins/Editors inspect and edit each solution's per-plant × tank-line status without leaving the page.

**Architecture:** Backend adds two nullable columns (`reason`, `remark`) to the existing `solution` table and exposes a focused `/api/v1/g-items` router that returns solutions plus their Solution Map coverage in one call. Frontend adds a new `features/g-items/` module — page, filter bar, expandable table, edit dialog — that reuses the existing `StatusCellEditor` for in-place status edits via the unmodified `/solution-map/{id}` endpoint.

**Tech Stack:** FastAPI + SQLAlchemy 2.0 + Alembic + Pydantic v2 (backend); React 18 + TypeScript + TanStack Query + shadcn/ui (frontend); pytest for backend tests. Full design spec lives at `docs/superpowers/specs/2026-05-13-g-items-management-design.md`.

---

## File Structure

### Backend (new / modified)

| Path | Role |
|---|---|
| `backend/alembic/versions/20260513_add_reason_remark_to_solution.py` | New migration: add `reason`, `remark` columns |
| `backend/app/models/solution.py` | **Modify** — add `reason` + `remark` mapped columns |
| `backend/app/schemas/g_item.py` | New — `GItemUpdate`, `GItemSolutionMapEntry`, `GItemResponse` |
| `backend/app/services/g_item_service.py` | New — `list_g_items`, `update_g_item` with filters & validation |
| `backend/app/routers/g_items.py` | New — `GET /api/v1/g-items`, `PUT /api/v1/g-items/{solution_id}` |
| `backend/app/main.py` | **Modify** — include the new router |
| `backend/tests/test_g_items.py` | New — schema, service, router tests |

### Frontend (new / modified)

| Path | Role |
|---|---|
| `frontend/src/features/g-items/types.ts` | New — `GItemEntry`, `GItemSolutionMapEntry`, `GItemFilters`, `ReasonCode` |
| `frontend/src/features/g-items/useGItems.ts` | New — React Query hooks: list + update mutation |
| `frontend/src/features/g-items/GItemsFilterBar.tsx` | New — plants / processes / reasons multi-select + search |
| `frontend/src/features/g-items/GItemEditDialog.tsx` | New — admin-only dialog to edit reason + remark |
| `frontend/src/features/g-items/GItemRowExpanded.tsx` | New — pivot (plant × tank_line) with cell edit |
| `frontend/src/features/g-items/GItemsTable.tsx` | New — main table + expandable rows |
| `frontend/src/features/g-items/GItemsPage.tsx` | New — page shell composing the pieces |
| `frontend/src/App.tsx` | **Modify** — register `/admin/g-items` route |
| `frontend/src/components/layout/Sidebar.tsx` | **Modify** — insert "G$ Management" NavItem (admin + editor) |

---

## Task 1: Alembic migration for `reason` + `remark` columns

**Files:**
- Create: `backend/alembic/versions/20260513_add_reason_remark_to_solution.py`

- [ ] **Step 1: Confirm the current Alembic head**

Run (from `backend/`): `PYTHONUTF8=1 ./.venv/Scripts/python.exe -m alembic heads`
Expected: a single line ending `(head)`. Note this revision (at time of writing: `f9c5d7e1b2a3`). If the head differs, substitute that value into the `down_revision` below.

- [ ] **Step 2: Create the migration file**

Write `backend/alembic/versions/20260513_add_reason_remark_to_solution.py`:

```python
"""add reason and remark to solution

Revision ID: 20260513a1b2
Revises: f9c5d7e1b2a3
Create Date: 2026-05-13 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '20260513a1b2'
down_revision: Union[str, None] = 'f9c5d7e1b2a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('solution', sa.Column('reason', sa.String(length=20), nullable=True))
    op.add_column('solution', sa.Column('remark', sa.String(length=1000), nullable=True))


def downgrade() -> None:
    op.drop_column('solution', 'remark')
    op.drop_column('solution', 'reason')
```

- [ ] **Step 3: Apply the migration to the dev DB**

Run: `PYTHONUTF8=1 ./.venv/Scripts/python.exe -m alembic upgrade head`
Expected output contains: `Running upgrade f9c5d7e1b2a3 -> 20260513a1b2`

- [ ] **Step 4: Verify downgrade works then re-upgrade**

Run: `PYTHONUTF8=1 ./.venv/Scripts/python.exe -m alembic downgrade -1`
Expected: `Running downgrade 20260513a1b2 -> f9c5d7e1b2a3`
Run: `PYTHONUTF8=1 ./.venv/Scripts/python.exe -m alembic upgrade head`
Expected: upgrade runs cleanly again.

- [ ] **Step 5: Commit**

```bash
git add backend/alembic/versions/20260513_add_reason_remark_to_solution.py
git commit -m "feat(db): add reason and remark columns to solution"
```

---

## Task 2: Add `reason` and `remark` to the Solution model

**Files:**
- Modify: `backend/app/models/solution.py`

- [ ] **Step 1: Add the two mapped columns after `is_g_item`**

Open `backend/app/models/solution.py`. After the `is_g_item` line (currently line 21) insert two new fields so the class looks like:

```python
from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class Solution(TimestampMixin, Base):
    __tablename__ = "solution"
    __table_args__ = (UniqueConstraint("defect_type_id", "station_id", "name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    defect_type_id: Mapped[int] = mapped_column(ForeignKey("defect_type.id"), nullable=False)
    station_id: Mapped[int] = mapped_column(ForeignKey("station.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    quality_attribute: Mapped[str | None] = mapped_column(String(200), nullable=True)
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    document_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    document_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_g_item: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reason: Mapped[str | None] = mapped_column(String(20), nullable=True)
    remark: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    updated_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
```

- [ ] **Step 2: Syntax check the model**

Run: `PYTHONUTF8=1 ./.venv/Scripts/python.exe -c "from app.models.solution import Solution; print(Solution.__table__.columns.keys())"`
Expected output contains both `'reason'` and `'remark'`.

- [ ] **Step 3: Commit**

```bash
git add backend/app/models/solution.py
git commit -m "feat(models): add reason and remark to Solution"
```

---

## Task 3: Pydantic schemas for G$ Management

**Files:**
- Create: `backend/app/schemas/g_item.py`
- Create: `backend/tests/test_g_items.py`

- [ ] **Step 1: Write the failing schema tests**

Write `backend/tests/test_g_items.py`:

```python
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
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run (from `backend/`): `PYTHONUTF8=1 ./.venv/Scripts/python.exe -m pytest tests/test_g_items.py -v`
Expected: every test collects and fails with `ModuleNotFoundError: No module named 'app.schemas.g_item'`.

- [ ] **Step 3: Create the schema module**

Write `backend/app/schemas/g_item.py`:

```python
"""Pydantic schemas for the G$ Management feature."""
from typing import Literal

from pydantic import BaseModel, Field

ReasonCode = Literal["QI", "FMEA_H_RISK", "OTHER"]


class GItemUpdate(BaseModel):
    """Admin request body for PUT /api/v1/g-items/{id}."""

    reason: ReasonCode | None = None
    remark: str | None = Field(default=None, max_length=1000)


class GItemSolutionMapEntry(BaseModel):
    """One plant × tank-line status cell in the expanded sub-table."""

    plant_id: int
    plant_name: str
    tank_line_id: int
    tank_line_name: str
    status_id: int
    status_code: str
    status_color: str
    solution_map_id: int
    version: int


class GItemResponse(BaseModel):
    """One row returned by GET /api/v1/g-items."""

    id: int
    name: str
    process: str
    station: str
    quality_attribute: str | None = None
    reason: ReasonCode | None = None
    remark: str | None = None
    solution_map: list[GItemSolutionMapEntry] = []
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `PYTHONUTF8=1 ./.venv/Scripts/python.exe -m pytest tests/test_g_items.py -v`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/g_item.py backend/tests/test_g_items.py
git commit -m "feat(schemas): add G$ Management Pydantic schemas"
```

---

## Task 4: Service layer — `list_g_items`

**Files:**
- Create: `backend/app/services/g_item_service.py`
- Modify: `backend/tests/test_g_items.py`

- [ ] **Step 1: Add the test fixtures and first list test**

Append to `backend/tests/test_g_items.py`:

```python
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
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `PYTHONUTF8=1 ./.venv/Scripts/python.exe -m pytest tests/test_g_items.py -v`
Expected: schema tests still pass; new service tests fail with `ModuleNotFoundError: No module named 'app.services.g_item_service'`.

- [ ] **Step 3: Create the service module**

Write `backend/app/services/g_item_service.py`:

```python
"""Business logic for the G$ Management feature."""
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.defect import DefectType  # noqa: F401 — imported for relationship resolution
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
            .subquery()
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
            from sqlalchemy import or_
            query = query.filter(or_(*reason_clauses))

    if search:
        query = query.filter(func.lower(Solution.name).like(f"%{search.lower()}%"))

    query = query.order_by(Solution.name)

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
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `PYTHONUTF8=1 ./.venv/Scripts/python.exe -m pytest tests/test_g_items.py -v`
Expected: all list tests pass (≈15 tests passing so far).

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/g_item_service.py backend/tests/test_g_items.py
git commit -m "feat(services): add list_g_items with filters and pagination"
```

---

## Task 5: Service layer — `update_g_item`

**Files:**
- Modify: `backend/app/services/g_item_service.py`
- Modify: `backend/tests/test_g_items.py`

- [ ] **Step 1: Add the failing update tests**

Append to `backend/tests/test_g_items.py`:

```python
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
```

- [ ] **Step 2: Run to confirm they fail**

Run: `PYTHONUTF8=1 ./.venv/Scripts/python.exe -m pytest tests/test_g_items.py -v`
Expected: new tests fail with `ImportError: cannot import name 'update_g_item'` (and `NotGItemError`).

- [ ] **Step 3: Implement `update_g_item`**

Append to `backend/app/services/g_item_service.py` (below `list_g_items`):

```python
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

    items, _ = list_g_items(db, search=sol.name)
    # list_g_items uses LIKE on lower(name); pick the exact match to avoid
    # collisions when one name is a prefix of another.
    return next(i for i in items if i["id"] == sol.id)
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `PYTHONUTF8=1 ./.venv/Scripts/python.exe -m pytest tests/test_g_items.py -v`
Expected: all service tests now pass (≈22 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/g_item_service.py backend/tests/test_g_items.py
git commit -m "feat(services): add update_g_item with validation"
```

---

## Task 6: Router — endpoints and wiring

**Files:**
- Create: `backend/app/routers/g_items.py`
- Modify: `backend/app/main.py`
- Modify: `backend/tests/test_g_items.py`

- [ ] **Step 1: Add the failing router-level integration tests**

Append to `backend/tests/test_g_items.py`:

```python
# ─── Router tests ─────────────────────────────────────────────────────────────
from fastapi.testclient import TestClient

from app.dependencies import get_db
from app.main import app
from app.models.user import User
from app.utils.security import create_access_token, hash_password


@pytest.fixture
def client():
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}
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


def _mk_user(client, *, role: str) -> dict:
    db = next(app.dependency_overrides[get_db]())
    u = User(
        username=f"{role}u",
        email=f"{role}@example.com",
        password_hash=hash_password("TestPass123"),
        display_name=role.title(),
        role=role,
        status="active",
    )
    db.add(u); db.commit(); db.refresh(u)
    return {"Authorization": f"Bearer {create_access_token(u.id, u.role)}"}


def _seed_via_session(client):
    """Use the override-get_db session to seed minimal data."""
    db = next(app.dependency_overrides[get_db]())
    return _seed_minimal(db)


def test_get_g_items_as_admin(client):
    _seed_via_session(client)
    hdrs = _mk_user(client, role="admin")
    resp = client.get("/api/v1/g-items", headers=hdrs)
    assert resp.status_code == 200
    body = resp.json()
    assert body["meta"]["total"] == 1
    assert body["data"][0]["reason"] == "QI"


def test_get_g_items_as_editor(client):
    _seed_via_session(client)
    hdrs = _mk_user(client, role="editor")
    resp = client.get("/api/v1/g-items", headers=hdrs)
    assert resp.status_code == 200


def test_get_g_items_rejects_viewer(client):
    _seed_via_session(client)
    hdrs = _mk_user(client, role="viewer")
    resp = client.get("/api/v1/g-items", headers=hdrs)
    assert resp.status_code == 403


def test_get_g_items_reasons_unspecified_filter(client):
    ids = _seed_via_session(client)
    # Add a G$ row with no reason
    db = next(app.dependency_overrides[get_db]())
    dt = db.query(DefectType).first()
    sta = db.query(Station).first()
    db.add(Solution(defect_type_id=dt.id, station_id=sta.id,
                    name="NoReasonG", is_g_item=True))
    db.commit()
    hdrs = _mk_user(client, role="admin")
    resp = client.get("/api/v1/g-items?reasons=UNSPECIFIED", headers=hdrs)
    assert resp.status_code == 200
    assert {r["name"] for r in resp.json()["data"]} == {"NoReasonG"}


def test_put_g_item_as_admin(client):
    ids = _seed_via_session(client)
    hdrs = _mk_user(client, role="admin")
    resp = client.put(
        f"/api/v1/g-items/{ids['g_sol_id']}",
        json={"reason": "FMEA_H_RISK", "remark": "updated"},
        headers=hdrs,
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["reason"] == "FMEA_H_RISK"


def test_put_g_item_rejects_editor(client):
    ids = _seed_via_session(client)
    hdrs = _mk_user(client, role="editor")
    resp = client.put(
        f"/api/v1/g-items/{ids['g_sol_id']}",
        json={"reason": "QI"},
        headers=hdrs,
    )
    assert resp.status_code == 403


def test_put_g_item_404_when_missing(client):
    _seed_via_session(client)
    hdrs = _mk_user(client, role="admin")
    resp = client.put("/api/v1/g-items/99999", json={"reason": "QI"}, headers=hdrs)
    assert resp.status_code == 404


def test_put_g_item_400_when_not_g(client):
    _seed_via_session(client)
    db = next(app.dependency_overrides[get_db]())
    non_g = db.query(Solution).filter(Solution.name == "Plain Clean").first()
    hdrs = _mk_user(client, role="admin")
    resp = client.put(f"/api/v1/g-items/{non_g.id}",
                      json={"reason": "QI"}, headers=hdrs)
    assert resp.status_code == 400
    assert "not a G$ item" in resp.json()["detail"]


def test_put_g_item_422_on_bad_reason(client):
    ids = _seed_via_session(client)
    hdrs = _mk_user(client, role="admin")
    resp = client.put(f"/api/v1/g-items/{ids['g_sol_id']}",
                      json={"reason": "BOGUS"}, headers=hdrs)
    assert resp.status_code == 422


def test_put_g_item_partial_update(client):
    ids = _seed_via_session(client)
    hdrs = _mk_user(client, role="admin")
    # send only reason
    resp = client.put(f"/api/v1/g-items/{ids['g_sol_id']}",
                      json={"reason": "OTHER"}, headers=hdrs)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["reason"] == "OTHER"
    assert data["remark"] == "Critical quality issue"  # preserved from seed
```

- [ ] **Step 2: Run to confirm they fail**

Run: `PYTHONUTF8=1 ./.venv/Scripts/python.exe -m pytest tests/test_g_items.py -v`
Expected: router tests all fail with 404 (route not registered).

- [ ] **Step 3: Create the router**

Write `backend/app/routers/g_items.py`:

```python
"""HTTP endpoints for the G$ Management feature."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.dependencies import get_db, require_role
from app.schemas.common import PaginationMeta, ok
from app.schemas.g_item import GItemUpdate
from app.services.g_item_service import (
    NotGItemError,
    list_g_items,
    update_g_item,
)

router = APIRouter(prefix="/api/v1/g-items", tags=["g-items"])


@router.get("")
def list_endpoint(
    plant_ids: list[int] = Query(default_factory=list),
    process_ids: list[int] = Query(default_factory=list),
    reasons: list[str] = Query(default_factory=list),
    search: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    _=Depends(require_role("editor", "admin")),
):
    allowed_reasons = {"QI", "FMEA_H_RISK", "OTHER", "UNSPECIFIED"}
    for r in reasons:
        if r not in allowed_reasons:
            raise HTTPException(status_code=422, detail=f"Invalid reason: {r}")

    items, total = list_g_items(
        db,
        plant_ids=plant_ids or None,
        process_ids=process_ids or None,
        reasons=reasons or None,
        search=search,
        page=page,
        limit=limit,
    )
    return ok(items, meta=PaginationMeta(total=total, page=page, limit=limit))


@router.put("/{solution_id}")
def update_endpoint(
    solution_id: int,
    body: GItemUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_role("admin")),
):
    fields = body.model_dump(exclude_unset=True)
    try:
        updated = update_g_item(
            db, solution_id=solution_id, actor_id=user.id, fields=fields,
        )
    except LookupError:
        raise HTTPException(status_code=404, detail="Solution not found")
    except NotGItemError:
        raise HTTPException(status_code=400, detail="Solution is not a G$ item")
    return ok(updated)
```

- [ ] **Step 4: Wire the router in `main.py`**

Open `backend/app/main.py`. Add an import line and an `include_router` call. After the existing `from app.routers.import_export import router as import_export_router` line, insert:

```python
from app.routers.g_items import router as g_items_router
```

Then after `app.include_router(import_export_router)`, insert:

```python
app.include_router(g_items_router)
```

- [ ] **Step 5: Run the full test file**

Run: `PYTHONUTF8=1 ./.venv/Scripts/python.exe -m pytest tests/test_g_items.py -v`
Expected: all tests in the file pass.

- [ ] **Step 6: Run the entire backend test suite to catch regressions**

Run: `PYTHONUTF8=1 ./.venv/Scripts/python.exe -m pytest -v`
Expected: no new failures vs. the previous baseline. (Any pre-existing failure like `test_template_list_format_download` is unrelated and may still fail — that's fine.)

- [ ] **Step 7: Commit**

```bash
git add backend/app/routers/g_items.py backend/app/main.py backend/tests/test_g_items.py
git commit -m "feat(api): add /api/v1/g-items endpoints with permission gating"
```

---

## Task 7: Frontend — types module

**Files:**
- Create: `frontend/src/features/g-items/types.ts`

- [ ] **Step 1: Write the types file**

Write `frontend/src/features/g-items/types.ts`:

```typescript
export type ReasonCode = 'QI' | 'FMEA_H_RISK' | 'OTHER'

export interface GItemSolutionMapEntry {
  plant_id: number
  plant_name: string
  tank_line_id: number
  tank_line_name: string
  status_id: number
  status_code: string
  status_color: string
  solution_map_id: number
  version: number
}

export interface GItemEntry {
  id: number
  name: string
  process: string
  station: string
  quality_attribute: string | null
  reason: ReasonCode | null
  remark: string | null
  solution_map: GItemSolutionMapEntry[]
}

export interface GItemFilters {
  plant_ids?: number[]
  process_ids?: number[]
  /** Include 'UNSPECIFIED' to match NULL reason. */
  reasons?: (ReasonCode | 'UNSPECIFIED')[]
  search?: string
  page?: number
  limit?: number
}

export interface GItemUpdatePayload {
  reason?: ReasonCode | null
  remark?: string | null
}

export const REASON_LABELS: Record<ReasonCode | 'UNSPECIFIED', string> = {
  QI: 'QI',
  FMEA_H_RISK: 'FMEA H-risk',
  OTHER: 'Other',
  UNSPECIFIED: 'Unspecified',
}
```

- [ ] **Step 2: TypeScript check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: no output (clean).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/g-items/types.ts
git commit -m "feat(g-items): add TypeScript types"
```

---

## Task 8: Frontend — `useGItems` hook

**Files:**
- Create: `frontend/src/features/g-items/useGItems.ts`

- [ ] **Step 1: Write the hook file**

Write `frontend/src/features/g-items/useGItems.ts`:

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'
import type { GItemEntry, GItemFilters, GItemUpdatePayload } from './types'

export function useGItems(filters: GItemFilters) {
  return useQuery({
    queryKey: ['g-items', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      filters.plant_ids?.forEach((id) => params.append('plant_ids', String(id)))
      filters.process_ids?.forEach((id) => params.append('process_ids', String(id)))
      filters.reasons?.forEach((r) => params.append('reasons', r))
      if (filters.search) params.set('search', filters.search)
      params.set('page', String(filters.page ?? 1))
      params.set('limit', String(filters.limit ?? 50))

      const resp = await apiClient.get<ApiResponse<GItemEntry[]>>(
        `/g-items?${params.toString()}`,
      )
      return {
        items: resp.data.data ?? [],
        total: resp.data.meta?.total ?? 0,
        page: resp.data.meta?.page ?? 1,
        limit: resp.data.meta?.limit ?? 50,
      }
    },
  })
}

export function useUpdateGItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      solutionId,
      payload,
    }: {
      solutionId: number
      payload: GItemUpdatePayload
    }) => {
      const resp = await apiClient.put<ApiResponse<GItemEntry>>(
        `/g-items/${solutionId}`,
        payload,
      )
      return resp.data.data!
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['g-items'] })
    },
  })
}
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/g-items/useGItems.ts
git commit -m "feat(g-items): add React Query hooks for list and update"
```

---

## Task 9: Frontend — `GItemEditDialog`

**Files:**
- Create: `frontend/src/features/g-items/GItemEditDialog.tsx`

- [ ] **Step 1: Write the component**

Write `frontend/src/features/g-items/GItemEditDialog.tsx`:

```typescript
import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUpdateGItem } from './useGItems'
import type { GItemEntry, ReasonCode } from './types'

const REASON_OPTIONS: { value: ReasonCode | 'UNSPECIFIED'; label: string }[] = [
  { value: 'UNSPECIFIED', label: 'Unspecified' },
  { value: 'QI', label: 'QI' },
  { value: 'FMEA_H_RISK', label: 'FMEA H-risk' },
  { value: 'OTHER', label: 'Other' },
]

interface Props {
  open: boolean
  item: GItemEntry | null
  onClose: () => void
}

export function GItemEditDialog({ open, item, onClose }: Props) {
  const [reason, setReason] = useState<ReasonCode | 'UNSPECIFIED'>('UNSPECIFIED')
  const [remark, setRemark] = useState('')
  const [error, setError] = useState<string | null>(null)
  const mutation = useUpdateGItem()

  useEffect(() => {
    if (open && item) {
      setReason(item.reason ?? 'UNSPECIFIED')
      setRemark(item.remark ?? '')
      setError(null)
    }
  }, [open, item])

  async function handleSave() {
    if (!item) return
    setError(null)
    try {
      await mutation.mutateAsync({
        solutionId: item.id,
        payload: {
          reason: reason === 'UNSPECIFIED' ? null : reason,
          remark: remark.trim() === '' ? null : remark,
        },
      })
      onClose()
    } catch {
      setError('Save failed. Please try again.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Edit G$ Item{item ? ` — ${item.name}` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as ReasonCode | 'UNSPECIFIED')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Remark</Label>
            <textarea
              className="w-full border rounded px-3 py-2 text-sm resize-none"
              rows={4}
              maxLength={1000}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Optional notes for this G$ item..."
            />
            <p className="text-xs text-muted-foreground text-right">
              {remark.length} / 1000
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/g-items/GItemEditDialog.tsx
git commit -m "feat(g-items): add admin-only edit dialog for reason/remark"
```

---

## Task 10: Frontend — `GItemRowExpanded` (pivot sub-table)

**Files:**
- Create: `frontend/src/features/g-items/GItemRowExpanded.tsx`

- [ ] **Step 1: Write the component**

Write `frontend/src/features/g-items/GItemRowExpanded.tsx`:

```typescript
import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import type { GItemEntry, GItemSolutionMapEntry } from './types'
import type { User } from '@/types/auth'

interface Props {
  item: GItemEntry
  user: User | null
  /** Fetched once at page level — lookup of status_id → color. */
  statusColors: Record<number, string>
  /** All status options available to change to (for the editor). */
  statuses: { id: number; code: string; name: string; color: string }[]
}

type CellCoord = { plantId: number; lineId: number }

export function GItemRowExpanded({ item, user, statuses }: Props) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<CellCoord | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Build unique plants and lines for this solution
  const { plants, lines, cellMap, processId } = useMemo(() => {
    const plantIds = new Set<number>()
    const lineIds = new Set<number>()
    const cm = new Map<string, GItemSolutionMapEntry>()
    for (const sm of item.solution_map) {
      plantIds.add(sm.plant_id)
      lineIds.add(sm.tank_line_id)
      cm.set(`${sm.plant_id}:${sm.tank_line_id}`, sm)
    }
    const plantList = Array.from(plantIds).map((id) => {
      const first = item.solution_map.find((sm) => sm.plant_id === id)!
      return { id, name: first.plant_name }
    })
    const lineList = Array.from(lineIds).map((id) => {
      const first = item.solution_map.find((sm) => sm.tank_line_id === id)!
      return { id, name: first.tank_line_name, plant_id: first.plant_id }
    })
    // processId needed for Editor cell scope; derive from any line via stations lookup if available.
    // In practice we only have item.process as a name, not id — the editor-scope check here is best-
    // effort by plant; the backend will reject anything out-of-scope with 403 anyway.
    return { plants: plantList, lines: lineList, cellMap: cm, processId: null as number | null }
  }, [item])

  function canEditCell(plantId: number): boolean {
    if (!user) return false
    if (user.role === 'admin') return true
    if (user.role !== 'editor') return false
    const plantMatch = user.plants?.some((p) => p.id === plantId) ?? false
    // Process name match is an approximation; the backend enforces precise scope.
    const processMatch = user.processes?.some((p) => p.name === item.process) ?? false
    return plantMatch && processMatch
  }

  async function saveCell(newStatusId: number) {
    if (!editing) return
    const cell = cellMap.get(`${editing.plantId}:${editing.lineId}`)
    if (!cell) return
    setError(null)
    try {
      await apiClient.put(`/solution-map/${cell.solution_map_id}`, {
        status_id: newStatusId,
        version: cell.version,
      })
      qc.invalidateQueries({ queryKey: ['g-items'] })
      qc.invalidateQueries({ queryKey: ['solution-map'] })
      setEditing(null)
    } catch (err) {
      const axiosErr = err as { response?: { status?: number } }
      if (axiosErr?.response?.status === 409) {
        setError('Someone else updated this cell. Refresh and try again.')
      } else if (axiosErr?.response?.status === 403) {
        setError('Out of your permission scope.')
      } else {
        setError('Save failed. Please try again.')
      }
    }
  }

  if (item.solution_map.length === 0) {
    return (
      <div className="px-6 py-4 bg-gray-50 text-sm text-muted-foreground">
        No solution map entries yet for this solution.
      </div>
    )
  }

  // Group lines under their plant to render plant rows
  const linesByPlant = new Map<number, typeof lines>()
  for (const ln of lines) {
    const arr = linesByPlant.get(ln.plant_id) ?? []
    arr.push(ln)
    linesByPlant.set(ln.plant_id, arr)
  }

  return (
    <div className="px-6 py-4 bg-gray-50">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-2">
          {error}
        </div>
      )}
      <table className="text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left px-2 py-1 text-xs font-semibold text-gray-600 border">Plant</th>
            {lines.map((ln) => (
              <th key={ln.id} className="px-2 py-1 text-xs font-semibold text-gray-600 border whitespace-nowrap">
                {ln.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {plants.map((p) => (
            <tr key={p.id}>
              <td className="px-2 py-1 border font-medium whitespace-nowrap">{p.name}</td>
              {lines.map((ln) => {
                const cell = cellMap.get(`${p.id}:${ln.id}`)
                if (!cell) {
                  return <td key={ln.id} className="px-2 py-1 border text-center text-gray-300">—</td>
                }
                const editable = canEditCell(p.id)
                return (
                  <td
                    key={ln.id}
                    className={`px-2 py-1 border text-center ${editable ? 'cursor-pointer hover:opacity-80' : ''}`}
                    style={{ backgroundColor: cell.status_color, color: '#fff' }}
                    title={editable ? 'Click to edit' : 'Out of your permission scope'}
                    onClick={() => editable && setEditing({ plantId: p.id, lineId: ln.id })}
                  >
                    {cell.status_code}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm">Change to:</span>
          {statuses.map((s) => (
            <button
              key={s.id}
              onClick={() => saveCell(s.id)}
              className="px-2 py-1 rounded text-xs text-white"
              style={{ backgroundColor: s.color }}
            >
              {s.code}
            </button>
          ))}
          <button onClick={() => setEditing(null)} className="text-xs text-gray-500 hover:underline">
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/g-items/GItemRowExpanded.tsx
git commit -m "feat(g-items): add expandable pivot sub-table with status editing"
```

---

## Task 11: Frontend — `GItemsFilterBar`

**Files:**
- Create: `frontend/src/features/g-items/GItemsFilterBar.tsx`

- [ ] **Step 1: Write the component**

Write `frontend/src/features/g-items/GItemsFilterBar.tsx`:

```typescript
import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ChevronDown, Search, X } from 'lucide-react'
import type { GItemFilters, ReasonCode } from './types'
import { REASON_LABELS } from './types'

interface Option {
  id: number
  name: string
}

interface Props {
  plants: Option[]
  processes: Option[]
  filters: GItemFilters
  onChange: (next: GItemFilters) => void
}

const REASON_VALUES: (ReasonCode | 'UNSPECIFIED')[] = [
  'QI',
  'FMEA_H_RISK',
  'OTHER',
  'UNSPECIFIED',
]

export function GItemsFilterBar({ plants, processes, filters, onChange }: Props) {
  const [searchDraft, setSearchDraft] = useState(filters.search ?? '')

  // Debounce search
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchDraft !== (filters.search ?? '')) {
        onChange({ ...filters, search: searchDraft || undefined, page: 1 })
      }
    }, 300)
    return () => clearTimeout(handle)
  }, [searchDraft]) // eslint-disable-line react-hooks/exhaustive-deps

  function togglePlant(id: number) {
    const cur = new Set(filters.plant_ids ?? [])
    cur.has(id) ? cur.delete(id) : cur.add(id)
    onChange({ ...filters, plant_ids: Array.from(cur), page: 1 })
  }

  function toggleProcess(id: number) {
    const cur = new Set(filters.process_ids ?? [])
    cur.has(id) ? cur.delete(id) : cur.add(id)
    onChange({ ...filters, process_ids: Array.from(cur), page: 1 })
  }

  function toggleReason(r: ReasonCode | 'UNSPECIFIED') {
    const cur = new Set(filters.reasons ?? [])
    cur.has(r) ? cur.delete(r) : cur.add(r)
    onChange({ ...filters, reasons: Array.from(cur), page: 1 })
  }

  const selectedPlantCount = filters.plant_ids?.length ?? 0
  const selectedProcessCount = filters.process_ids?.length ?? 0
  const selectedReasonCount = filters.reasons?.length ?? 0

  const hasAnyFilter =
    !!filters.search || selectedPlantCount + selectedProcessCount + selectedReasonCount > 0

  function clearAll() {
    setSearchDraft('')
    onChange({ page: 1, limit: filters.limit })
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-b bg-white">
      {/* Plants */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            Plants{selectedPlantCount > 0 ? ` (${selectedPlantCount})` : ''}
            <ChevronDown size={14} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          {plants.length === 0 ? (
            <p className="text-xs text-muted-foreground">No plants</p>
          ) : (
            plants.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                <Checkbox
                  checked={filters.plant_ids?.includes(p.id) ?? false}
                  onCheckedChange={() => togglePlant(p.id)}
                />
                {p.name}
              </label>
            ))
          )}
        </PopoverContent>
      </Popover>

      {/* Processes */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            Processes{selectedProcessCount > 0 ? ` (${selectedProcessCount})` : ''}
            <ChevronDown size={14} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          {processes.length === 0 ? (
            <p className="text-xs text-muted-foreground">No processes</p>
          ) : (
            processes.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                <Checkbox
                  checked={filters.process_ids?.includes(p.id) ?? false}
                  onCheckedChange={() => toggleProcess(p.id)}
                />
                {p.name}
              </label>
            ))
          )}
        </PopoverContent>
      </Popover>

      {/* Reasons */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            Reason{selectedReasonCount > 0 ? ` (${selectedReasonCount})` : ''}
            <ChevronDown size={14} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          {REASON_VALUES.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
              <Checkbox
                checked={filters.reasons?.includes(r) ?? false}
                onCheckedChange={() => toggleReason(r)}
              />
              {REASON_LABELS[r]}
            </label>
          ))}
        </PopoverContent>
      </Popover>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search solution name..."
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          className="pl-7 h-8 w-56 text-sm"
        />
      </div>

      {hasAnyFilter && (
        <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1">
          <X size={12} /> Clear
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/g-items/GItemsFilterBar.tsx
git commit -m "feat(g-items): add filter bar with plants/processes/reason/search"
```

---

## Task 12: Frontend — `GItemsTable`

**Files:**
- Create: `frontend/src/features/g-items/GItemsTable.tsx`

- [ ] **Step 1: Write the component**

Write `frontend/src/features/g-items/GItemsTable.tsx`:

```typescript
import { useState } from 'react'
import { ChevronDown, ChevronRight, Pencil } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GItemRowExpanded } from './GItemRowExpanded'
import type { GItemEntry } from './types'
import { REASON_LABELS } from './types'
import type { User } from '@/types/auth'

interface Props {
  items: GItemEntry[]
  user: User | null
  statuses: { id: number; code: string; name: string; color: string }[]
  onEdit: (item: GItemEntry) => void
}

export function GItemsTable({ items, user, statuses, onEdit }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const isAdmin = user?.role === 'admin'
  const statusColors = Object.fromEntries(statuses.map((s) => [s.id, s.color]))

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (items.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-sm text-muted-foreground">
        No G$ items match the current filters.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8" />
          <TableHead>Solution</TableHead>
          <TableHead>Process</TableHead>
          <TableHead>Station</TableHead>
          <TableHead>Quality Attribute</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Remark</TableHead>
          {isAdmin && <TableHead className="w-20">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((it) => {
          const isOpen = expanded.has(it.id)
          return (
            <>
              <TableRow key={it.id} className="hover:bg-gray-50">
                <TableCell>
                  <button
                    onClick={() => toggle(it.id)}
                    className="p-1 rounded hover:bg-gray-200"
                    aria-label={isOpen ? 'Collapse' : 'Expand'}
                  >
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                </TableCell>
                <TableCell className="font-medium">{it.name}</TableCell>
                <TableCell>{it.process}</TableCell>
                <TableCell>{it.station}</TableCell>
                <TableCell>{it.quality_attribute ?? '—'}</TableCell>
                <TableCell>
                  {it.reason ? (
                    <Badge variant="outline">{REASON_LABELS[it.reason]}</Badge>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </TableCell>
                <TableCell className="max-w-xs truncate" title={it.remark ?? ''}>
                  {it.remark ?? <span className="text-gray-400">—</span>}
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1"
                      onClick={() => onEdit(it)}
                    >
                      <Pencil size={12} /> Edit
                    </Button>
                  </TableCell>
                )}
              </TableRow>
              {isOpen && (
                <TableRow key={`${it.id}-expanded`}>
                  <TableCell colSpan={isAdmin ? 8 : 7} className="p-0">
                    <GItemRowExpanded
                      item={it}
                      user={user}
                      statusColors={statusColors}
                      statuses={statuses}
                    />
                  </TableCell>
                </TableRow>
              )}
            </>
          )
        })}
      </TableBody>
    </Table>
  )
}
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/g-items/GItemsTable.tsx
git commit -m "feat(g-items): add main table with expandable rows"
```

---

## Task 13: Frontend — `GItemsPage`

**Files:**
- Create: `frontend/src/features/g-items/GItemsPage.tsx`

- [ ] **Step 1: Write the page**

Write `frontend/src/features/g-items/GItemsPage.tsx`:

```typescript
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { useAuth } from '@/features/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { GItemsFilterBar } from './GItemsFilterBar'
import { GItemsTable } from './GItemsTable'
import { GItemEditDialog } from './GItemEditDialog'
import { useGItems } from './useGItems'
import type { GItemEntry, GItemFilters } from './types'
import type { ApiResponse } from '@/types/api'

interface ReferenceOption {
  id: number
  name: string
}

interface ReferenceOptions {
  plants: ReferenceOption[]
  processes: ReferenceOption[]
}

interface StatusOption {
  id: number
  code: string
  name: string
  color: string
}

export function GItemsPage() {
  const { user } = useAuth()
  const [filters, setFilters] = useState<GItemFilters>({ page: 1, limit: 50 })
  const [editing, setEditing] = useState<GItemEntry | null>(null)

  const { data: refOptions } = useQuery({
    queryKey: ['reference-options'],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<ReferenceOptions>>('/reference/options')
      return resp.data.data ?? { plants: [], processes: [] }
    },
  })

  const { data: statuses } = useQuery({
    queryKey: ['statuses'],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<StatusOption[]>>('/statuses')
      return resp.data.data ?? []
    },
  })

  const { data, isLoading, isError } = useGItems(filters)
  const items = data?.items ?? []
  const total = data?.total ?? 0
  const page = data?.page ?? 1
  const limit = data?.limit ?? 50
  const pageCount = Math.max(1, Math.ceil(total / limit))

  function setPage(next: number) {
    setFilters((f) => ({ ...f, page: next }))
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b bg-white">
        <h1 className="text-xl font-semibold">G$ Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage G-dollar items, their reason/remark, and coverage
        </p>
      </div>

      <GItemsFilterBar
        plants={refOptions?.plants ?? []}
        processes={refOptions?.processes ?? []}
        filters={filters}
        onChange={setFilters}
      />

      <div className="flex-1 overflow-auto">
        {isLoading && (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
        )}
        {isError && (
          <div className="py-12 text-center text-sm text-red-600">
            Failed to load G$ items.
          </div>
        )}
        {!isLoading && !isError && (
          <GItemsTable
            items={items}
            user={user}
            statuses={statuses ?? []}
            onEdit={setEditing}
          />
        )}
      </div>

      {total > 0 && (
        <div className="border-t bg-white px-6 py-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {total} G$ item{total === 1 ? '' : 's'} · Page {page} of {pageCount}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pageCount}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <GItemEditDialog
        open={!!editing}
        item={editing}
        onClose={() => setEditing(null)}
      />
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/g-items/GItemsPage.tsx
git commit -m "feat(g-items): add GItemsPage composition with pagination"
```

---

## Task 14: Route registration + Sidebar nav item

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Register the route in `App.tsx`**

Open `frontend/src/App.tsx`. Add the import:

```typescript
import { GItemsPage } from '@/features/g-items/GItemsPage'
```

Inside the `<Route path="/" ...>` children block, below the existing `<Route path="admin/users" ...>` line, add:

```typescript
<Route path="admin/g-items" element={<GItemsPage />} />
```

- [ ] **Step 2: Add Sidebar nav item below "Data Management"**

Open `frontend/src/components/layout/Sidebar.tsx`.

Add `DollarSign` to the lucide-react import (top of file):

```typescript
import {
  LayoutDashboard,
  Grid3X3,
  GitBranch,
  Database,
  Activity,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Mail,
  DollarSign,
} from 'lucide-react'
```

Below the `mainNavItems` constant, add an admin/editor-only nav list:

```typescript
const managementNavItems: NavItem[] = [
  { label: 'G$ Management', icon: DollarSign, to: '/admin/g-items' },
]
```

Inside the `Sidebar` component body, near the other role flags:

```typescript
const isAdminOrEditor = user?.role === 'admin' || user?.role === 'editor'
```

Inside the `<nav>` block, **between** the `mainNavItems.map(...)` block and the admin section `{isAdmin && ...}`, insert:

```tsx
{isAdminOrEditor &&
  managementNavItems.map((item) => (
    <SidebarNavItem key={item.to} item={item} collapsed={collapsed} />
  ))}
```

- [ ] **Step 3: TypeScript check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/layout/Sidebar.tsx
git commit -m "feat(g-items): register route and add sidebar entry below Data Management"
```

---

## Task 15: Full-stack smoke + manual verification

**Files:** (no code changes — verification only)

- [ ] **Step 1: Confirm backend starts**

Run (from `backend/`): `PYTHONUTF8=1 ./.venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000`
Expected: server starts without errors, `/docs` lists a `g-items` section.
Leave it running for the rest of this task; `Ctrl+C` when done.

- [ ] **Step 2: Confirm frontend builds and runs**

In a second terminal, from `frontend/`: `npm run dev`
Expected: Vite starts, http://localhost:5173 loads, no console errors at startup.

- [ ] **Step 3: Manual scenario 1 — membership toggle**

As an admin user:
1. Data Management → Solutions tab → check the G$ Item checkbox on one solution.
2. Navigate to G$ Management from the sidebar. Confirm that solution appears.
3. Uncheck the G$ Item box on the same row. Navigate back to G$ Management and confirm the row disappears.

- [ ] **Step 4: Manual scenario 2 — reason/remark preservation**

As admin:
1. Check G$ Item on a solution, go to G$ Management, click Edit, set Reason=`QI`, Remark=`preserved test`, Save. The row updates.
2. Go back to Data Management and un-check G$ Item. The row vanishes from G$ Management.
3. In a database console (`sqlite3 backend/dev.db`): `SELECT reason, remark FROM solution WHERE name = '<that name>';` — confirm the values are still there.
4. Re-check G$ Item. The row reappears on G$ Management with Reason=QI and the original Remark.

- [ ] **Step 5: Manual scenario 3 — editor read-only**

Log in as an editor user:
1. Sidebar shows "G$ Management".
2. Open the page — data loads.
3. Expand a row — cells within the editor's plant/process scope are clickable; out-of-scope cells show a tooltip.
4. The Actions column / Edit button does NOT appear.

- [ ] **Step 6: Manual scenario 4 — status editing syncs with Solution Map**

As admin:
1. Expand a row in G$ Management. Click a cell → choose a new status.
2. Navigate to Solution Map (same session). The same solution × tank/line cell reflects the new status.

- [ ] **Step 7: Manual scenario 5 — filters**

As admin:
1. Apply a Plants filter — only solutions with coverage in those plants remain.
2. Apply Reason=`Unspecified` — only solutions without a reason remain.
3. Type in search — results narrow after ~300ms.
4. Click "Clear" — everything resets.

- [ ] **Step 8: Manual scenario 6 — optimistic lock**

As admin, open two browser tabs on G$ Management:
1. Tab A: change the status of a cell; success.
2. Tab B (without reloading): change the same cell. Expected: toast "Someone else updated this cell. Refresh and try again."

- [ ] **Step 9: Final commit (if any tweaks needed)**

If the manual runs surfaced no changes, skip. If tweaks were needed during verification, commit them:

```bash
git add <changed files>
git commit -m "fix(g-items): <what was corrected>"
```

- [ ] **Step 10: Push the branch**

```bash
git push origin HEAD
```

---

## Self-Review

- **Spec coverage**
  - §1 Data Model → Tasks 1, 2 ✓
  - §2 Backend API → Tasks 3, 4, 5, 6 ✓
  - §3 Frontend UI → Tasks 7–14 ✓
  - §4 Permissions → Task 6 (router guards), Task 9 (admin-only Edit dialog), Task 10 (cell scope), Task 12 (Actions hidden for non-admin), Task 14 (sidebar admin/editor gating) ✓
  - §5 Testing → Tasks 3/4/5/6 (backend unit+integration) and Task 15 (manual scenarios) ✓
- **Placeholder scan:** no TBD/TODO. Every step has concrete code or command.
- **Type consistency:** `ReasonCode` values (`QI`, `FMEA_H_RISK`, `OTHER`) and the `UNSPECIFIED` sentinel are identical across spec, Pydantic `Literal`, TypeScript union, filter bar options, API query handler, and service filter logic. `GItemEntry` / `GItemSolutionMapEntry` TypeScript shapes mirror the Pydantic response shapes. Hook mutation input matches router body schema.
- **Known caveat:** `GItemRowExpanded`'s Editor cell-scope check is best-effort (approximate via `process` name match) because the list endpoint returns `process` as a name; the backend `/solution-map/{id}` is authoritative and will 403 anything truly out of scope. Documented inline. No spec requirement is violated — the design already states "前端各自守門" with backend as final authority.
