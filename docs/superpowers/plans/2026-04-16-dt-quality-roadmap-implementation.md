# D^t Quality Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web application that replaces the Power BI report `Dt_Solution_Map_for_QA` with a full-featured Solution Map management system including pivot table visualization, process map, CRUD operations, Sankey chart dashboard, Excel import/export, and role-based access control.

**Architecture:** FastAPI backend with SQLAlchemy 2.0 ORM connecting to MS SQL Server (SQLite for dev/test), serving a React 18 + TypeScript SPA. The core domain model centers on `solution_map` — a junction table mapping solutions to tank lines with deployment statuses. Authentication uses JWT access tokens + HttpOnly refresh token cookies.

**Tech Stack:** Python 3.11+, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2, React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, ECharts, TanStack Table, TanStack Query, Axios

**Spec:** `docs/superpowers/specs/2026-04-16-dt-quality-roadmap-design.md`

---

## File Structure

### Backend (`backend/`)

```
backend/
├── app/
│   ├── __init__.py                    # Package marker
│   ├── main.py                        # FastAPI app, CORS, router includes
│   ├── config.py                      # Pydantic Settings (env-based config)
│   ├── database.py                    # SQLAlchemy engine, SessionLocal, Base
│   ├── dependencies.py                # Shared FastAPI dependencies (get_db, get_current_user)
│   ├── models/
│   │   ├── __init__.py                # Re-export all models
│   │   ├── base.py                    # TimestampMixin, SoftDeleteMixin
│   │   ├── user.py                    # User model
│   │   ├── status_definition.py       # StatusDefinition model
│   │   ├── defect.py                  # DefectCategory, DefectType models
│   │   ├── process.py                 # Process, Station models
│   │   ├── plant.py                   # Plant, TankLine models
│   │   ├── solution.py                # Solution model
│   │   ├── solution_map.py            # SolutionMap model (core)
│   │   └── audit_log.py               # AuditLog model
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── common.py                  # ApiResponse, PaginationMeta, ErrorDetail
│   │   ├── auth.py                    # LoginRequest, RegisterRequest, TokenResponse
│   │   ├── user.py                    # UserResponse, UserApproveRequest
│   │   ├── status_definition.py       # StatusCreate, StatusResponse
│   │   ├── defect.py                  # DefectCategoryCreate/Response, DefectTypeCreate/Response
│   │   ├── process.py                 # ProcessCreate/Response, StationCreate/Response
│   │   ├── plant.py                   # PlantCreate/Response, TankLineCreate/Response
│   │   ├── solution.py                # SolutionCreate/Response
│   │   ├── solution_map.py            # SolutionMapUpdate, SolutionMapBatchUpsert, PivotResponse
│   │   ├── dashboard.py               # DashboardSummary, SankeyData
│   │   └── import_export.py           # ImportPreview, ImportConfirm, ExportRequest
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py                    # /auth/login, /auth/register, /auth/refresh, /auth/forgot-password, /auth/reset-password
│   │   ├── users.py                   # /users (admin CRUD, approve, reject, disable)
│   │   ├── statuses.py                # /statuses CRUD
│   │   ├── defects.py                 # /defect-categories, /defect-types CRUD
│   │   ├── processes.py               # /processes, /stations CRUD
│   │   ├── plants.py                  # /plants, /tank-lines CRUD
│   │   ├── solutions.py               # /solutions CRUD
│   │   ├── solution_map.py            # /solution-map (pivot GET, PUT, batch POST)
│   │   ├── dashboard.py               # /dashboard/summary, /dashboard/defect-analysis, /dashboard/process-analysis
│   │   └── import_export.py           # /import-export/import, /import-export/export, /import-export/template
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py            # Login, register, token refresh, password reset logic
│   │   ├── audit_service.py           # Create audit log entries
│   │   ├── solution_map_service.py    # Pivot query, batch upsert, optimistic lock
│   │   ├── dashboard_service.py       # KPI aggregation, Sankey data generation
│   │   └── import_export_service.py   # Excel parsing, validation, preview, confirm
│   └── utils/
│       ├── __init__.py
│       ├── security.py                # JWT create/verify, password hash/verify
│       └── excel.py                   # openpyxl helpers for matrix/list format
├── alembic/
│   ├── env.py
│   └── versions/                      # Migration files
├── tests/
│   ├── __init__.py
│   ├── conftest.py                    # SQLite test DB, test client, fixtures
│   ├── test_models.py                 # Model unit tests
│   ├── test_auth.py                   # Auth endpoint tests
│   ├── test_users.py                  # User management tests
│   ├── test_reference_data.py         # Statuses, defects, processes, plants CRUD tests
│   ├── test_solutions.py              # Solution CRUD tests
│   ├── test_solution_map.py           # Pivot query, update, batch upsert tests
│   ├── test_dashboard.py              # Dashboard aggregation tests
│   └── test_import_export.py          # Import/export flow tests
├── alembic.ini
├── pyproject.toml
├── requirements.txt
└── .env.example
```

### Frontend (`frontend/`)

```
frontend/
├── src/
│   ├── main.tsx                       # ReactDOM.createRoot entry
│   ├── App.tsx                        # Router + QueryClientProvider + AuthProvider
│   ├── components/
│   │   ├── ui/                        # shadcn/ui components (Button, Input, Dialog, etc.)
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx          # Sidebar + Header + main content slot
│   │   │   ├── Sidebar.tsx            # Collapsible nav with icons
│   │   │   └── Header.tsx             # Logo, app name, user dropdown
│   │   └── charts/
│   │       ├── SankeyChart.tsx         # ECharts Sankey wrapper
│   │       └── StatusBadge.tsx         # Color-coded status indicator
│   ├── features/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── ForgotPasswordPage.tsx
│   │   │   ├── ResetPasswordPage.tsx
│   │   │   └── AuthContext.tsx         # Auth provider + useAuth hook
│   │   ├── dashboard/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── KpiCards.tsx
│   │   │   └── PlantCoverageTable.tsx
│   │   ├── solution-map/
│   │   │   ├── SolutionMapPage.tsx
│   │   │   ├── PivotTable.tsx          # TanStack Table pivot
│   │   │   ├── FilterBar.tsx           # Multi-select filters
│   │   │   └── StatusCellEditor.tsx    # Inline status edit modal
│   │   ├── process-map/
│   │   │   └── ProcessMapPage.tsx      # ECharts process flow
│   │   ├── data-management/
│   │   │   ├── DataManagementPage.tsx  # Tab container
│   │   │   ├── SolutionTab.tsx
│   │   │   ├── DefectTypeTab.tsx
│   │   │   ├── StationTab.tsx
│   │   │   ├── TankLineTab.tsx
│   │   │   ├── ImportSection.tsx       # Drag-drop + preview
│   │   │   └── ExportSection.tsx
│   │   ├── analysis/
│   │   │   ├── DefectAnalysisPage.tsx
│   │   │   └── ProcessAnalysisPage.tsx
│   │   └── admin/
│   │       └── UserManagementPage.tsx
│   ├── hooks/
│   │   ├── useAuth.ts                  # Re-export from AuthContext
│   │   ├── useSolutionMap.ts           # TanStack Query hooks for solution-map
│   │   └── useReferenceData.ts         # TanStack Query hooks for ref data
│   ├── lib/
│   │   ├── api-client.ts              # Axios instance + interceptors
│   │   ├── api.ts                     # Typed API functions
│   │   └── query-client.ts            # TanStack Query client config
│   └── types/
│       ├── api.ts                     # ApiResponse<T>, PaginationMeta
│       ├── auth.ts                    # User, LoginRequest, TokenResponse
│       ├── solution-map.ts            # Solution, SolutionMap, PivotData
│       ├── reference-data.ts          # Status, DefectCategory, Process, Plant, etc.
│       └── dashboard.ts              # KpiData, SankeyNode, SankeyLink
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts
└── postcss.config.js
```

---

## Task 1: Backend Project Scaffolding

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/requirements.txt`
- Create: `backend/.env.example`
- Create: `backend/app/__init__.py`
- Create: `backend/app/config.py`
- Create: `backend/app/database.py`
- Create: `backend/app/main.py`
- Create: `backend/app/dependencies.py`

- [ ] **Step 1: Create `backend/pyproject.toml`**

```toml
[project]
name = "dt-quality-roadmap"
version = "0.1.0"
description = "D^t Quality Roadmap Backend"
requires-python = ">=3.11"

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
```

- [ ] **Step 2: Create `backend/requirements.txt`**

```
fastapi==0.115.*
uvicorn[standard]==0.34.*
sqlalchemy==2.0.*
alembic==1.14.*
pydantic-settings==2.7.*
python-jose[cryptography]==3.3.*
passlib[bcrypt]==1.7.*
python-multipart==0.0.*
openpyxl==3.1.*
pymssql==2.3.*
httpx==0.28.*
pytest==8.3.*
pytest-asyncio==0.25.*
```

- [ ] **Step 3: Create `backend/.env.example`**

```env
DATABASE_URL=sqlite:///./dev.db
JWT_SECRET=change-me-to-random-64-chars
JWT_EXPIRY_HOURS=8
CORS_ORIGINS=http://localhost:5173
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
```

- [ ] **Step 4: Create `backend/app/__init__.py`**

Empty file.

- [ ] **Step 5: Create `backend/app/config.py`**

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./dev.db"
    jwt_secret: str = "change-me"
    jwt_expiry_hours: int = 8
    jwt_refresh_expiry_days: int = 7
    cors_origins: str = "http://localhost:5173"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
```

- [ ] **Step 6: Create `backend/app/database.py`**

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

connect_args = {}
if settings.database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass
```

- [ ] **Step 7: Create `backend/app/dependencies.py`**

```python
from collections.abc import Generator

from sqlalchemy.orm import Session

from app.database import SessionLocal


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 8: Create `backend/app/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

app = FastAPI(title="D^t Quality Roadmap", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/v1/health")
def health_check():
    return {"status": "ok"}
```

- [ ] **Step 9: Verify the server starts**

Run:
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --port 8000
```
Expected: Server starts, `GET /api/v1/health` returns `{"status": "ok"}`

- [ ] **Step 10: Commit**

```bash
git add backend/
git commit -m "feat: scaffold backend project with FastAPI, config, and database setup"
```

---

## Task 2: Database Models

**Files:**
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/base.py`
- Create: `backend/app/models/status_definition.py`
- Create: `backend/app/models/user.py`
- Create: `backend/app/models/defect.py`
- Create: `backend/app/models/process.py`
- Create: `backend/app/models/plant.py`
- Create: `backend/app/models/solution.py`
- Create: `backend/app/models/solution_map.py`
- Create: `backend/app/models/audit_log.py`
- Test: `backend/tests/test_models.py`

- [ ] **Step 1: Create `backend/app/models/base.py` with TimestampMixin**

```python
from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.orm import Mapped, mapped_column


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )
```

- [ ] **Step 2: Create `backend/app/models/status_definition.py`**

```python
from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class StatusDefinition(TimestampMixin, Base):
    __tablename__ = "status_definition"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    color: Mapped[str] = mapped_column(String(7), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
```

- [ ] **Step 3: Create `backend/app/models/user.py`**

```python
from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="viewer", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    reset_token: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reset_token_expires: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
```

- [ ] **Step 4: Create `backend/app/models/defect.py`**

```python
from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class DefectCategory(TimestampMixin, Base):
    __tablename__ = "defect_category"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    types: Mapped[list["DefectType"]] = relationship(back_populates="category")


class DefectType(TimestampMixin, Base):
    __tablename__ = "defect_type"
    __table_args__ = (UniqueConstraint("category_id", "name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("defect_category.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    category: Mapped["DefectCategory"] = relationship(back_populates="types")
```

- [ ] **Step 5: Create `backend/app/models/process.py`**

```python
from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class Process(TimestampMixin, Base):
    __tablename__ = "process"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    stations: Mapped[list["Station"]] = relationship(back_populates="process")


class Station(TimestampMixin, Base):
    __tablename__ = "station"
    __table_args__ = (UniqueConstraint("process_id", "name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    process_id: Mapped[int] = mapped_column(ForeignKey("process.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    process: Mapped["Process"] = relationship(back_populates="stations")
```

- [ ] **Step 6: Create `backend/app/models/plant.py`**

```python
from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class Plant(TimestampMixin, Base):
    __tablename__ = "plant"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    tank_lines: Mapped[list["TankLine"]] = relationship(back_populates="plant")


class TankLine(TimestampMixin, Base):
    __tablename__ = "tank_line"
    __table_args__ = (UniqueConstraint("plant_id", "code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    plant_id: Mapped[int] = mapped_column(ForeignKey("plant.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    plant: Mapped["Plant"] = relationship(back_populates="tank_lines")
```

- [ ] **Step 7: Create `backend/app/models/solution.py`**

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
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    updated_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
```

- [ ] **Step 8: Create `backend/app/models/solution_map.py`**

```python
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SolutionMap(Base):
    __tablename__ = "solution_map"
    __table_args__ = (
        UniqueConstraint("solution_id", "tank_line_id"),
        Index("ix_solution_map_solution", "solution_id"),
        Index("ix_solution_map_tank_line", "tank_line_id"),
        Index("ix_solution_map_status", "status_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    solution_id: Mapped[int] = mapped_column(ForeignKey("solution.id"), nullable=False)
    tank_line_id: Mapped[int] = mapped_column(ForeignKey("tank_line.id"), nullable=False)
    status_id: Mapped[int] = mapped_column(ForeignKey("status_definition.id"), nullable=False)
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )
    updated_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
```

- [ ] **Step 9: Create `backend/app/models/audit_log.py`**

```python
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False)
    old_values: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_values: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
```

- [ ] **Step 10: Create `backend/app/models/__init__.py`**

```python
from app.models.audit_log import AuditLog
from app.models.defect import DefectCategory, DefectType
from app.models.plant import Plant, TankLine
from app.models.process import Process, Station
from app.models.solution import Solution
from app.models.solution_map import SolutionMap
from app.models.status_definition import StatusDefinition
from app.models.user import User

__all__ = [
    "AuditLog",
    "DefectCategory",
    "DefectType",
    "Plant",
    "Process",
    "Solution",
    "SolutionMap",
    "Station",
    "StatusDefinition",
    "TankLine",
    "User",
]
```

- [ ] **Step 11: Write model tests**

Create `backend/tests/__init__.py` (empty) and `backend/tests/conftest.py`:

```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)
```

Create `backend/tests/test_models.py`:

```python
from app.models import (
    DefectCategory,
    DefectType,
    Plant,
    Process,
    Solution,
    SolutionMap,
    Station,
    StatusDefinition,
    TankLine,
    User,
)


def test_create_status_definition(db_session):
    status = StatusDefinition(code="MP", name="Mass Production", color="#28A745")
    db_session.add(status)
    db_session.commit()

    result = db_session.query(StatusDefinition).filter_by(code="MP").first()
    assert result is not None
    assert result.name == "Mass Production"
    assert result.is_active is True


def test_create_user(db_session):
    user = User(
        username="testuser",
        email="test@example.com",
        password_hash="hashed",
        display_name="Test User",
    )
    db_session.add(user)
    db_session.commit()

    result = db_session.query(User).filter_by(username="testuser").first()
    assert result is not None
    assert result.status == "pending"
    assert result.role == "viewer"


def test_defect_category_type_relationship(db_session):
    category = DefectCategory(name="Surface")
    db_session.add(category)
    db_session.flush()

    defect_type = DefectType(category_id=category.id, name="Bubble")
    db_session.add(defect_type)
    db_session.commit()

    result = db_session.query(DefectCategory).first()
    assert len(result.types) == 1
    assert result.types[0].name == "Bubble"


def test_solution_map_unique_constraint(db_session):
    # Set up required reference data
    status = StatusDefinition(code="MP", name="Mass Production", color="#28A745")
    user = User(username="u", email="u@e.com", password_hash="h", display_name="U")
    category = DefectCategory(name="Surface")
    db_session.add_all([status, user, category])
    db_session.flush()

    defect_type = DefectType(category_id=category.id, name="Bubble")
    process = Process(name="Finishing")
    db_session.add_all([defect_type, process])
    db_session.flush()

    station = Station(process_id=process.id, name="Coating")
    plant = Plant(name="Plant1", code="P1")
    db_session.add_all([station, plant])
    db_session.flush()

    tank_line = TankLine(plant_id=plant.id, name="Line A", code="LA")
    solution = Solution(
        defect_type_id=defect_type.id, station_id=station.id, name="Sol A"
    )
    db_session.add_all([tank_line, solution])
    db_session.flush()

    sm = SolutionMap(
        solution_id=solution.id,
        tank_line_id=tank_line.id,
        status_id=status.id,
    )
    db_session.add(sm)
    db_session.commit()

    assert sm.version == 1
    assert sm.id is not None
```

- [ ] **Step 12: Run tests to verify they pass**

Run: `cd backend && pytest tests/test_models.py -v`
Expected: All 4 tests PASS

- [ ] **Step 13: Commit**

```bash
git add backend/app/models/ backend/tests/
git commit -m "feat: add all SQLAlchemy models with relationships and constraints"
```

---

## Task 3: Alembic Migrations Setup

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/script.py.mako`

- [ ] **Step 1: Initialize Alembic**

Run: `cd backend && alembic init alembic`

- [ ] **Step 2: Edit `backend/alembic/env.py`**

Replace target_metadata with:
```python
from app.database import Base
from app.models import *  # noqa: F401,F403  - ensure all models registered

target_metadata = Base.metadata
```

Update `alembic.ini` sqlalchemy.url to empty string (we'll set from env).

- [ ] **Step 3: Generate initial migration**

Run: `cd backend && alembic revision --autogenerate -m "initial schema"`

- [ ] **Step 4: Apply migration**

Run: `cd backend && alembic upgrade head`

- [ ] **Step 5: Commit**

```bash
git add backend/alembic/ backend/alembic.ini
git commit -m "feat: add Alembic migrations with initial schema"
```

---

## Task 4: Shared Schemas & Security Utils

**Files:**
- Create: `backend/app/schemas/__init__.py`
- Create: `backend/app/schemas/common.py`
- Create: `backend/app/utils/__init__.py`
- Create: `backend/app/utils/security.py`

- [ ] **Step 1: Create `backend/app/schemas/common.py`**

```python
from typing import Any, Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class PaginationMeta(BaseModel):
    total: int
    page: int
    limit: int


class ErrorDetail(BaseModel):
    field: str | None = None
    message: str


class ErrorBody(BaseModel):
    code: str
    message: str
    details: list[ErrorDetail] = []


class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    data: T | None = None
    meta: PaginationMeta | None = None
    error: ErrorBody | None = None


def ok(data: Any, meta: PaginationMeta | None = None) -> dict:
    return {"success": True, "data": data, "meta": meta}


def fail(code: str, message: str, details: list[dict] | None = None) -> dict:
    return {
        "success": False,
        "error": {"code": code, "message": message, "details": details or []},
    }
```

- [ ] **Step 2: Create `backend/app/utils/security.py`**

```python
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: int, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expiry_hours)
    payload = {"sub": str(user_id), "role": role, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def create_refresh_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_expiry_days)
    payload = {"sub": str(user_id), "type": "refresh", "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
    except JWTError:
        return None
```

- [ ] **Step 3: Create `backend/app/utils/__init__.py` and `backend/app/schemas/__init__.py`**

Both empty files.

- [ ] **Step 4: Write security util tests**

Add to `backend/tests/test_security.py`:

```python
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_password_hash_and_verify():
    hashed = hash_password("MyPassword123")
    assert verify_password("MyPassword123", hashed)
    assert not verify_password("WrongPassword", hashed)


def test_create_and_decode_access_token():
    token = create_access_token(user_id=1, role="editor")
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == "1"
    assert payload["role"] == "editor"


def test_create_and_decode_refresh_token():
    token = create_refresh_token(user_id=1)
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == "1"
    assert payload["type"] == "refresh"


def test_decode_invalid_token():
    result = decode_token("invalid.token.here")
    assert result is None
```

- [ ] **Step 5: Run tests**

Run: `cd backend && pytest tests/test_security.py -v`
Expected: All 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/schemas/ backend/app/utils/ backend/tests/test_security.py
git commit -m "feat: add shared API schemas and JWT/password security utils"
```

---

## Task 5: Auth Endpoints (Login, Register, Refresh, Password Reset)

**Files:**
- Create: `backend/app/schemas/auth.py`
- Create: `backend/app/schemas/user.py`
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/auth_service.py`
- Create: `backend/app/routers/__init__.py`
- Create: `backend/app/routers/auth.py`
- Modify: `backend/app/dependencies.py` — add `get_current_user`
- Modify: `backend/app/main.py` — include auth router
- Test: `backend/tests/test_auth.py`

- [ ] **Step 1: Create `backend/app/schemas/auth.py`**

```python
from pydantic import BaseModel, EmailStr, field_validator


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    display_name: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain a digit")
        return v


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class UserInfo(BaseModel):
    id: int
    username: str
    display_name: str
    role: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserInfo


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
```

- [ ] **Step 2: Create `backend/app/services/auth_service.py`**

```python
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.user import User
from app.utils.security import hash_password, verify_password


def authenticate_user(db: Session, username: str, password: str) -> User | None:
    user = db.query(User).filter(User.username == username).first()
    if user is None or not verify_password(password, user.password_hash):
        return None
    if user.status != "active":
        return None
    return user


def register_user(
    db: Session, username: str, email: str, password: str, display_name: str
) -> User:
    user = User(
        username=username,
        email=email,
        password_hash=hash_password(password),
        display_name=display_name,
        role="viewer",
        status="pending",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_reset_token(db: Session, email: str) -> str | None:
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        return None
    token = str(uuid.uuid4())
    user.reset_token = token
    user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=24)
    db.commit()
    return token


def reset_password(db: Session, token: str, new_password: str) -> bool:
    user = db.query(User).filter(User.reset_token == token).first()
    if user is None:
        return False
    if user.reset_token_expires and user.reset_token_expires < datetime.now(timezone.utc):
        return False
    user.password_hash = hash_password(new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
    return True
```

- [ ] **Step 3: Create `backend/app/routers/auth.py`**

```python
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.config import settings
from app.dependencies import get_db
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    ResetPasswordRequest,
    UserInfo,
)
from app.schemas.common import ok
from app.services.auth_service import (
    authenticate_user,
    create_reset_token,
    register_user,
    reset_password,
)
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login")
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = authenticate_user(db, body.username, body.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid credentials or inactive account")

    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="strict",
        max_age=settings.jwt_refresh_expiry_days * 86400,
    )

    return ok(
        LoginResponse(
            access_token=access_token,
            expires_in=settings.jwt_expiry_hours * 3600,
            user=UserInfo(
                id=user.id,
                username=user.username,
                display_name=user.display_name,
                role=user.role,
            ),
        ).model_dump()
    )


@router.post("/register", status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    from sqlalchemy.exc import IntegrityError

    try:
        user = register_user(db, body.username, body.email, body.password, body.display_name)
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Username or email already exists")

    return ok(
        {
            "id": user.id,
            "username": user.username,
            "status": user.status,
            "message": "Registration submitted. Awaiting admin approval.",
        }
    )


@router.post("/refresh")
def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
):
    if refresh_token is None:
        raise HTTPException(status_code=401, detail="No refresh token")

    payload = decode_token(refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = int(payload["sub"])
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or user.status != "active":
        raise HTTPException(status_code=401, detail="User not found or inactive")

    access_token = create_access_token(user.id, user.role)

    return ok(
        {
            "access_token": access_token,
            "expires_in": settings.jwt_expiry_hours * 3600,
        }
    )


@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    create_reset_token(db, body.email)
    # Always return success to avoid email enumeration
    return ok({"message": "If the email exists, a reset link has been sent."})


@router.post("/reset-password")
def reset_password_endpoint(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    success = reset_password(db, body.token, body.new_password)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    return ok({"message": "Password reset successfully."})
```

- [ ] **Step 4: Add `get_current_user` to `backend/app/dependencies.py`**

Append to the existing file:

```python
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.models.user import User
from app.utils.security import decode_token

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    payload = decode_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if user is None or user.status != "active":
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


def require_role(*roles: str):
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return checker
```

- [ ] **Step 5: Include auth router in `backend/app/main.py`**

Add after CORS middleware:
```python
from app.routers import auth
app.include_router(auth.router)
```

- [ ] **Step 6: Write auth endpoint tests**

Create `backend/tests/test_auth.py`:

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.dependencies import get_db
from app.main import app
from app.models.user import User
from app.utils.security import hash_password


@pytest.fixture
def client():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine)

    def override_get_db():
        session = TestSession()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)


@pytest.fixture
def active_user(client):
    """Create an active user directly in DB."""
    db = next(app.dependency_overrides[get_db]())
    user = User(
        username="testuser",
        email="test@example.com",
        password_hash=hash_password("TestPass123"),
        display_name="Test User",
        role="editor",
        status="active",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_register_success(client):
    resp = client.post("/api/v1/auth/register", json={
        "username": "newuser",
        "email": "new@example.com",
        "password": "SecurePass1",
        "display_name": "New User",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["success"] is True
    assert data["data"]["status"] == "pending"


def test_register_weak_password(client):
    resp = client.post("/api/v1/auth/register", json={
        "username": "newuser",
        "email": "new@example.com",
        "password": "weak",
        "display_name": "New User",
    })
    assert resp.status_code == 422


def test_login_success(client, active_user):
    resp = client.post("/api/v1/auth/login", json={
        "username": "testuser",
        "password": "TestPass123",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "access_token" in data["data"]
    assert data["data"]["user"]["role"] == "editor"
    assert "refresh_token" in resp.cookies


def test_login_wrong_password(client, active_user):
    resp = client.post("/api/v1/auth/login", json={
        "username": "testuser",
        "password": "WrongPass1",
    })
    assert resp.status_code == 401


def test_login_pending_user(client):
    # Register creates pending user
    client.post("/api/v1/auth/register", json={
        "username": "pending",
        "email": "p@e.com",
        "password": "SecurePass1",
        "display_name": "Pending",
    })
    resp = client.post("/api/v1/auth/login", json={
        "username": "pending",
        "password": "SecurePass1",
    })
    assert resp.status_code == 401
```

- [ ] **Step 7: Run tests**

Run: `cd backend && pytest tests/test_auth.py -v`
Expected: All 5 tests PASS

- [ ] **Step 8: Commit**

```bash
git add backend/app/schemas/auth.py backend/app/services/ backend/app/routers/ backend/app/dependencies.py backend/app/main.py backend/tests/test_auth.py
git commit -m "feat: add auth endpoints (login, register, refresh, password reset)"
```

---

## Task 6: Reference Data CRUD APIs

**Files:**
- Create: `backend/app/schemas/status_definition.py`
- Create: `backend/app/schemas/defect.py`
- Create: `backend/app/schemas/process.py`
- Create: `backend/app/schemas/plant.py`
- Create: `backend/app/routers/statuses.py`
- Create: `backend/app/routers/defects.py`
- Create: `backend/app/routers/processes.py`
- Create: `backend/app/routers/plants.py`
- Modify: `backend/app/main.py` — include routers
- Test: `backend/tests/test_reference_data.py`

- [ ] **Step 1: Create Pydantic schemas for all reference data**

Create `backend/app/schemas/status_definition.py`:
```python
from pydantic import BaseModel


class StatusCreate(BaseModel):
    code: str
    name: str
    color: str
    sort_order: int = 0


class StatusUpdate(BaseModel):
    name: str | None = None
    color: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class StatusResponse(BaseModel):
    id: int
    code: str
    name: str
    color: str
    sort_order: int
    is_active: bool

    model_config = {"from_attributes": True}
```

Create similar schemas for `defect.py`, `process.py`, `plant.py` following the same pattern with their respective fields from the spec.

- [ ] **Step 2: Create generic CRUD router pattern**

Each reference data router follows the same structure:

```python
# Example: backend/app/routers/statuses.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db, require_role
from app.models.status_definition import StatusDefinition
from app.schemas.common import ok
from app.schemas.status_definition import StatusCreate, StatusResponse, StatusUpdate

router = APIRouter(prefix="/api/v1/statuses", tags=["statuses"])


@router.get("")
def list_statuses(
    is_active: bool | None = None,
    sort: str = "sort_order",
    order: str = "asc",
    db: Session = Depends(get_db),
):
    query = db.query(StatusDefinition)
    if is_active is not None:
        query = query.filter(StatusDefinition.is_active == is_active)

    order_col = getattr(StatusDefinition, sort, StatusDefinition.sort_order)
    query = query.order_by(order_col.asc() if order == "asc" else order_col.desc())

    items = query.all()
    return ok([StatusResponse.model_validate(i).model_dump() for i in items])


@router.get("/{item_id}")
def get_status(item_id: int, db: Session = Depends(get_db)):
    item = db.query(StatusDefinition).filter(StatusDefinition.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")
    return ok(StatusResponse.model_validate(item).model_dump())


@router.post("", status_code=201)
def create_status(
    body: StatusCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    item = StatusDefinition(**body.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return ok(StatusResponse.model_validate(item).model_dump())


@router.put("/{item_id}")
def update_status(
    item_id: int,
    body: StatusUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    item = db.query(StatusDefinition).filter(StatusDefinition.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return ok(StatusResponse.model_validate(item).model_dump())
```

Create routers for defects (categories + types), processes (+ stations), plants (+ tank-lines) following the same pattern.

- [ ] **Step 3: Include all routers in `main.py`**

```python
from app.routers import auth, statuses, defects, processes, plants
app.include_router(auth.router)
app.include_router(statuses.router)
app.include_router(defects.router)
app.include_router(processes.router)
app.include_router(plants.router)
```

- [ ] **Step 4: Write reference data tests**

Create `backend/tests/test_reference_data.py` with tests for:
- List statuses (GET)
- Create status as admin (POST, 201)
- Create status as non-admin (POST, 403)
- Update status (PUT)
- Filter by is_active
- DefectCategory + DefectType hierarchy CRUD
- Process + Station hierarchy CRUD
- Plant + TankLine hierarchy CRUD

- [ ] **Step 5: Run tests**

Run: `cd backend && pytest tests/test_reference_data.py -v`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/schemas/ backend/app/routers/ backend/app/main.py backend/tests/test_reference_data.py
git commit -m "feat: add reference data CRUD APIs (statuses, defects, processes, plants)"
```

---

## Task 7: Solution CRUD & Solution Map Core APIs

**Files:**
- Create: `backend/app/schemas/solution.py`
- Create: `backend/app/schemas/solution_map.py`
- Create: `backend/app/services/solution_map_service.py`
- Create: `backend/app/services/audit_service.py`
- Create: `backend/app/routers/solutions.py`
- Create: `backend/app/routers/solution_map.py`
- Modify: `backend/app/main.py` — include routers
- Test: `backend/tests/test_solutions.py`
- Test: `backend/tests/test_solution_map.py`

- [ ] **Step 1: Create `backend/app/schemas/solution.py`**

```python
from pydantic import BaseModel


class SolutionCreate(BaseModel):
    defect_type_id: int
    station_id: int
    name: str
    description: str | None = None


class SolutionUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None


class SolutionResponse(BaseModel):
    id: int
    defect_type_id: int
    station_id: int
    name: str
    description: str | None
    is_active: bool

    model_config = {"from_attributes": True}
```

- [ ] **Step 2: Create `backend/app/schemas/solution_map.py`**

```python
from pydantic import BaseModel


class SolutionMapUpdate(BaseModel):
    status_id: int
    notes: str | None = None
    version: int  # optimistic lock


class BatchUpsertItem(BaseModel):
    solution_id: int
    tank_line_id: int
    status_id: int
    notes: str | None = None


class SolutionMapBatchUpsert(BaseModel):
    updates: list[BatchUpsertItem]
```

- [ ] **Step 3: Create `backend/app/services/audit_service.py`**

```python
import json

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def log_audit(
    db: Session,
    user_id: int,
    action: str,
    entity_type: str,
    entity_id: int,
    old_values: dict | None = None,
    new_values: dict | None = None,
    ip_address: str | None = None,
) -> None:
    entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_values=json.dumps(old_values) if old_values else None,
        new_values=json.dumps(new_values) if new_values else None,
        ip_address=ip_address,
    )
    db.add(entry)
```

- [ ] **Step 4: Create `backend/app/services/solution_map_service.py`**

```python
from sqlalchemy.orm import Session

from app.models.defect import DefectCategory, DefectType
from app.models.plant import Plant, TankLine
from app.models.process import Process, Station
from app.models.solution import Solution
from app.models.solution_map import SolutionMap
from app.models.status_definition import StatusDefinition


def get_pivot_data(
    db: Session,
    process_id: int | None = None,
    station_id: int | None = None,
    defect_category_id: int | None = None,
    plant_id: int | None = None,
    status_id: int | None = None,
) -> dict:
    # Build solution query with joins
    query = (
        db.query(Solution, DefectType, DefectCategory, Station, Process)
        .join(DefectType, Solution.defect_type_id == DefectType.id)
        .join(DefectCategory, DefectType.category_id == DefectCategory.id)
        .join(Station, Solution.station_id == Station.id)
        .join(Process, Station.process_id == Process.id)
        .filter(Solution.is_active == True)  # noqa: E712
    )

    if process_id:
        query = query.filter(Process.id == process_id)
    if station_id:
        query = query.filter(Station.id == station_id)
    if defect_category_id:
        query = query.filter(DefectCategory.id == defect_category_id)

    solutions = query.all()

    # Get lines
    line_query = (
        db.query(TankLine, Plant)
        .join(Plant, TankLine.plant_id == Plant.id)
        .filter(TankLine.is_active == True)  # noqa: E712
    )
    if plant_id:
        line_query = line_query.filter(Plant.id == plant_id)
    lines = line_query.order_by(Plant.sort_order, TankLine.sort_order).all()

    # Get solution_map entries
    solution_ids = [s[0].id for s in solutions]
    line_ids = [l[0].id for l in lines]

    maps = {}
    if solution_ids and line_ids:
        map_query = db.query(SolutionMap).filter(
            SolutionMap.solution_id.in_(solution_ids),
            SolutionMap.tank_line_id.in_(line_ids),
        )
        if status_id:
            map_query = map_query.filter(SolutionMap.status_id == status_id)

        for m in map_query.all():
            maps[(m.solution_id, m.tank_line_id)] = m

    # Get statuses for lookup
    statuses = {s.id: s for s in db.query(StatusDefinition).all()}

    # Build response
    result_solutions = []
    for sol, dtype, dcat, sta, proc in solutions:
        sol_statuses = {}
        for tl, plt in lines:
            key = f"line_{tl.id}"
            sm = maps.get((sol.id, tl.id))
            if sm:
                st = statuses.get(sm.status_id)
                sol_statuses[key] = {
                    "map_id": sm.id,
                    "status_id": sm.status_id,
                    "status_code": st.code if st else None,
                    "notes": sm.notes,
                    "version": sm.version,
                }
            else:
                sol_statuses[key] = None

        result_solutions.append({
            "id": sol.id,
            "name": sol.name,
            "defect_type": dtype.name,
            "defect_category": dcat.name,
            "station": sta.name,
            "process": proc.name,
            "statuses": sol_statuses,
        })

    result_lines = [
        {"id": tl.id, "key": f"line_{tl.id}", "name": tl.name, "plant": plt.name}
        for tl, plt in lines
    ]

    # Build filter options for dropdowns
    filters = {
        "processes": [{"id": p.id, "name": p.name} for p in db.query(Process).filter(Process.is_active == True).order_by(Process.sort_order).all()],  # noqa: E712
        "stations": [{"id": s.id, "name": s.name, "process_id": s.process_id} for s in db.query(Station).filter(Station.is_active == True).order_by(Station.sort_order).all()],  # noqa: E712
        "defect_categories": [{"id": c.id, "name": c.name} for c in db.query(DefectCategory).filter(DefectCategory.is_active == True).order_by(DefectCategory.sort_order).all()],  # noqa: E712
        "plants": [{"id": p.id, "name": p.name} for p in db.query(Plant).filter(Plant.is_active == True).order_by(Plant.sort_order).all()],  # noqa: E712
        "statuses": [{"id": s.id, "code": s.code, "name": s.name, "color": s.color} for s in db.query(StatusDefinition).filter(StatusDefinition.is_active == True).order_by(StatusDefinition.sort_order).all()],  # noqa: E712
    }

    return {"solutions": result_solutions, "lines": result_lines, "filters": filters}
```

- [ ] **Step 5: Create `backend/app/routers/solutions.py`**

Standard CRUD router for Solution. POST/PUT require Editor+, DELETE requires Admin.

- [ ] **Step 6: Create `backend/app/routers/solution_map.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user, require_role
from app.models.solution_map import SolutionMap
from app.models.user import User
from app.schemas.common import ok
from app.schemas.solution_map import SolutionMapUpdate, SolutionMapBatchUpsert
from app.services.audit_service import log_audit
from app.services.solution_map_service import get_pivot_data

router = APIRouter(prefix="/api/v1/solution-map", tags=["solution-map"])


@router.get("")
def get_solution_map(
    process_id: int | None = None,
    station_id: int | None = None,
    defect_category_id: int | None = None,
    plant_id: int | None = None,
    status_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    data = get_pivot_data(db, process_id, station_id, defect_category_id, plant_id, status_id)
    return ok(data)


@router.put("/{map_id}")
def update_solution_map(
    map_id: int,
    body: SolutionMapUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("editor", "admin")),
):
    sm = db.query(SolutionMap).filter(SolutionMap.id == map_id).first()
    if sm is None:
        raise HTTPException(status_code=404, detail="Not found")

    # Optimistic lock check
    if sm.version != body.version:
        raise HTTPException(
            status_code=409,
            detail="Conflict: record was modified by another user. Please refresh.",
        )

    old_status = sm.status_id
    sm.status_id = body.status_id
    sm.notes = body.notes
    sm.version += 1
    sm.updated_by = user.id

    log_audit(
        db, user.id, "UPDATE", "solution_map", sm.id,
        old_values={"status_id": old_status},
        new_values={"status_id": body.status_id},
    )

    db.commit()
    db.refresh(sm)
    return ok({
        "id": sm.id,
        "solution_id": sm.solution_id,
        "tank_line_id": sm.tank_line_id,
        "status_id": sm.status_id,
        "notes": sm.notes,
        "version": sm.version,
        "updated_at": sm.updated_at.isoformat() if sm.updated_at else None,
        "updated_by": {"id": user.id, "display_name": user.display_name},
    })


@router.post("/batch")
def batch_upsert(
    body: SolutionMapBatchUpsert,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("editor", "admin")),
):
    created = 0
    updated = 0
    for item in body.updates:
        existing = db.query(SolutionMap).filter(
            SolutionMap.solution_id == item.solution_id,
            SolutionMap.tank_line_id == item.tank_line_id,
        ).first()

        if existing:
            existing.status_id = item.status_id
            existing.notes = item.notes
            existing.version += 1
            existing.updated_by = user.id
            updated += 1
        else:
            new_sm = SolutionMap(
                solution_id=item.solution_id,
                tank_line_id=item.tank_line_id,
                status_id=item.status_id,
                notes=item.notes,
                created_by=user.id,
                updated_by=user.id,
            )
            db.add(new_sm)
            created += 1

    db.commit()
    return ok({"created": created, "updated": updated, "failed": 0})
```

- [ ] **Step 7: Include routers in `main.py`**

- [ ] **Step 8: Write tests for solution CRUD and solution-map pivot/update/batch**

- [ ] **Step 9: Run tests**

Run: `cd backend && pytest tests/test_solutions.py tests/test_solution_map.py -v`
Expected: All tests PASS

- [ ] **Step 10: Commit**

```bash
git add backend/app/schemas/solution.py backend/app/schemas/solution_map.py backend/app/services/ backend/app/routers/solutions.py backend/app/routers/solution_map.py backend/app/main.py backend/tests/test_solutions.py backend/tests/test_solution_map.py
git commit -m "feat: add solution CRUD and solution-map pivot/update/batch APIs with optimistic lock"
```

---

## Task 8: Dashboard & Analysis APIs

**Files:**
- Create: `backend/app/schemas/dashboard.py`
- Create: `backend/app/services/dashboard_service.py`
- Create: `backend/app/routers/dashboard.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_dashboard.py`

- [ ] **Step 1: Create `backend/app/schemas/dashboard.py`**

```python
from pydantic import BaseModel


class SankeyNode(BaseModel):
    id: str
    name: str
    layer: str


class SankeyLink(BaseModel):
    source: str
    target: str
    value: int


class PlantCoverage(BaseModel):
    plant: str
    mp_percentage: float
    total: int


class KpiData(BaseModel):
    total_solutions: int
    mp_count: int
    mp_percentage: float
    developing_count: int
    planned_count: int
    coverage_by_plant: list[PlantCoverage]


class SankeyData(BaseModel):
    nodes: list[SankeyNode]
    links: list[SankeyLink]


class DashboardSummary(BaseModel):
    kpi: KpiData
    sankey: SankeyData
```

- [ ] **Step 2: Create `backend/app/services/dashboard_service.py`**

```python
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.defect import DefectCategory, DefectType
from app.models.plant import Plant, TankLine
from app.models.process import Process, Station
from app.models.solution import Solution
from app.models.solution_map import SolutionMap
from app.models.status_definition import StatusDefinition


def get_summary(db: Session) -> dict:
    # --- KPI ---
    statuses = {s.id: s for s in db.query(StatusDefinition).all()}
    mp_status = next((s for s in statuses.values() if s.code == "MP"), None)
    dev_status = next((s for s in statuses.values() if s.code == "DEV"), None)
    plan_status = next((s for s in statuses.values() if s.code == "PLAN"), None)

    total = db.query(func.count(SolutionMap.id)).scalar() or 0
    mp_count = (
        db.query(func.count(SolutionMap.id))
        .filter(SolutionMap.status_id == mp_status.id)
        .scalar()
        if mp_status
        else 0
    ) or 0
    dev_count = (
        db.query(func.count(SolutionMap.id))
        .filter(SolutionMap.status_id == dev_status.id)
        .scalar()
        if dev_status
        else 0
    ) or 0
    plan_count = (
        db.query(func.count(SolutionMap.id))
        .filter(SolutionMap.status_id == plan_status.id)
        .scalar()
        if plan_status
        else 0
    ) or 0

    # Coverage by plant
    coverage_rows = (
        db.query(
            Plant.name,
            func.count(SolutionMap.id).label("total"),
            func.sum(
                func.case((SolutionMap.status_id == mp_status.id, 1), else_=0)
            ).label("mp")
            if mp_status
            else func.literal(0).label("mp"),
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

    # --- Sankey ---
    # Query: DefectCategory → DefectType → Station → Status flow
    flow_rows = (
        db.query(
            DefectCategory.id,
            DefectCategory.name,
            DefectType.id,
            DefectType.name,
            Station.id,
            Station.name,
            StatusDefinition.id,
            StatusDefinition.name,
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
        # Add nodes
        cat_key = f"cat_{cat_id}"
        dt_key = f"type_{dt_id}"
        sta_key = f"sta_{sta_id}"
        st_key = f"status_{st_id}"

        nodes_set[cat_key] = {"id": cat_key, "name": cat_name, "layer": "defect_category"}
        nodes_set[dt_key] = {"id": dt_key, "name": dt_name, "layer": "defect_type"}
        nodes_set[sta_key] = {"id": sta_key, "name": sta_name, "layer": "station"}
        nodes_set[st_key] = {"id": st_key, "name": st_name, "layer": "status"}

        # Aggregate links
        for src, tgt in [(cat_key, dt_key), (dt_key, sta_key), (sta_key, st_key)]:
            pair = (src, tgt)
            links_map[pair] = links_map.get(pair, 0) + count

    sankey = {
        "nodes": list(nodes_set.values()),
        "links": [
            {"source": src, "target": tgt, "value": val}
            for (src, tgt), val in links_map.items()
        ],
    }

    return {"kpi": kpi, "sankey": sankey}
```

- [ ] **Step 3: Create `backend/app/routers/dashboard.py`**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.common import ok
from app.services.dashboard_service import get_summary

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


@router.get("/summary")
def dashboard_summary(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    data = get_summary(db)
    return ok(data)


@router.get("/defect-analysis")
def defect_analysis(
    process_id: int | None = None,
    plant_id: int | None = None,
    group_by: str = "defect_category",
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    # Group solution_map counts by defect_category or defect_type
    # Implementation follows same pattern as get_summary aggregation
    return ok({"group_by": group_by, "data": []})  # TODO: implement in step


@router.get("/process-analysis")
def process_analysis(
    plant_id: int | None = None,
    group_by: str = "station",
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return ok({"group_by": group_by, "data": []})  # TODO: implement in step
```

- [ ] **Step 4: Write dashboard tests**

Create `backend/tests/test_dashboard.py` with fixtures that seed reference data + solution_map entries, then test:
- `GET /summary` returns correct KPI counts
- `GET /summary` returns Sankey nodes with id/layer
- Coverage by plant percentages are accurate

- [ ] **Step 5: Run tests**

Run: `cd backend && pytest tests/test_dashboard.py -v`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: add dashboard APIs (KPI summary, Sankey data, analysis)"
```

---

## Task 9: Import/Export APIs

**Files:**
- Create: `backend/app/schemas/import_export.py`
- Create: `backend/app/services/import_export_service.py`
- Create: `backend/app/utils/excel.py`
- Create: `backend/app/routers/import_export.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_import_export.py`

- [ ] **Step 1: Create `backend/app/utils/excel.py`**

Excel parsing helpers using openpyxl:
- `parse_matrix_format(workbook)` → list of dicts
- `parse_list_format(workbook)` → list of dicts
- `generate_matrix_export(data, lines)` → Workbook
- `generate_list_export(data)` → Workbook
- `generate_template(format)` → Workbook

- [ ] **Step 2: Create `backend/app/services/import_export_service.py`**

- `preview_import(db, file, format)` → ImportPreview + import_id
- `confirm_import(db, import_id, user_id)` → ImportResult
- `generate_export(db, format, filters)` → bytes (xlsx)
- Temp file storage with 15-min TTL

- [ ] **Step 3: Create import/export router**

- `POST /import` (multipart, Editor+)
- `POST /import/confirm` (Editor+)
- `GET /export` (Viewer+)
- `GET /template`

- [ ] **Step 4: Write import/export tests**

Test with small in-memory Excel files:
- Parse matrix format correctly
- Parse list format correctly
- Preview shows correct counts
- Confirm executes import
- Export generates valid xlsx

- [ ] **Step 5: Run tests and commit**

```bash
git commit -m "feat: add import/export APIs with matrix/list Excel formats"
```

---

## Task 10: User Management API (Admin)

**Files:**
- Create: `backend/app/schemas/user.py`
- Create: `backend/app/routers/users.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_users.py`

- [ ] **Step 1: Create schemas and router**

Admin-only endpoints:
- `GET /users` (list with filters)
- `PUT /users/{id}/approve` (set status=active, assign role)
- `PUT /users/{id}/reject`
- `PUT /users/{id}/disable`
- `PUT /users/{id}/reset-password` (generate temp password)

- [ ] **Step 2: Write tests**

- [ ] **Step 3: Run tests and commit**

```bash
git commit -m "feat: add user management APIs (approve, reject, disable, reset-password)"
```

---

## Task 11: Frontend Project Scaffolding

**Files:**
- Create: `frontend/` via Vite
- Create: `frontend/src/lib/api-client.ts`
- Create: `frontend/src/lib/query-client.ts`
- Create: `frontend/src/types/api.ts`

- [ ] **Step 1: Create Vite React-TS project**

```bash
cd Dt_Quality_Roadmap
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

- [ ] **Step 2: Install dependencies**

```bash
npm install axios @tanstack/react-query @tanstack/react-table
npm install echarts echarts-for-react
npm install react-router-dom
npm install tailwindcss @tailwindcss/vite
npx shadcn@latest init
```

- [ ] **Step 3: Create `frontend/src/types/api.ts`**

```typescript
export interface PaginationMeta {
  total: number
  page: number
  limit: number
}

export interface ApiError {
  code: string
  message: string
  details: Array<{ field?: string; message: string }>
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  meta?: PaginationMeta
  error?: ApiError
}
```

- [ ] **Step 4: Create `frontend/src/lib/api-client.ts`**

Axios instance with JWT interceptor and 401 handling (per spec section 5.5).

- [ ] **Step 5: Create `frontend/src/lib/query-client.ts`**

```typescript
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})
```

- [ ] **Step 6: Verify dev server starts**

Run: `cd frontend && npm run dev`
Expected: Vite dev server starts on `http://localhost:5173`

- [ ] **Step 7: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold frontend with Vite, React, TypeScript, Tailwind, shadcn/ui"
```

---

## Task 12: Auth Context & Login/Register Pages

**Files:**
- Create: `frontend/src/features/auth/AuthContext.tsx`
- Create: `frontend/src/features/auth/LoginPage.tsx`
- Create: `frontend/src/features/auth/RegisterPage.tsx`
- Create: `frontend/src/features/auth/ForgotPasswordPage.tsx`
- Create: `frontend/src/features/auth/ResetPasswordPage.tsx`
- Create: `frontend/src/types/auth.ts`
- Modify: `frontend/src/App.tsx` — add routing

- [ ] **Step 1: Create auth types**

```typescript
// frontend/src/types/auth.ts
export interface User {
  id: number
  username: string
  display_name: string
  role: 'viewer' | 'editor' | 'admin'
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  display_name: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: User
}
```

- [ ] **Step 2: Create AuthContext with silent refresh**

- [ ] **Step 3: Create Login page with form (shadcn/ui Input, Button)**

- [ ] **Step 4: Create Register page**

- [ ] **Step 5: Create ForgotPassword and ResetPassword pages**

- [ ] **Step 6: Set up App.tsx with React Router**

Protected routes via AuthContext. Public routes: /login, /register, /forgot-password, /reset-password.

- [ ] **Step 7: Test login flow in browser**

Start backend + frontend, register → login → verify token stored.

- [ ] **Step 8: Commit**

```bash
git commit -m "feat: add auth pages (login, register, password reset) with JWT context"
```

---

## Task 13: Layout (Sidebar + Header)

**Files:**
- Create: `frontend/src/components/layout/AppLayout.tsx`
- Create: `frontend/src/components/layout/Sidebar.tsx`
- Create: `frontend/src/components/layout/Header.tsx`
- Modify: `frontend/src/App.tsx` — wrap protected routes with AppLayout

- [ ] **Step 1: Create Sidebar** — Collapsible nav with icons per spec 5.2

- [ ] **Step 2: Create Header** — Logo, app name, user dropdown

- [ ] **Step 3: Create AppLayout** — Sidebar + Header + `<Outlet />`

- [ ] **Step 4: Verify in browser** — Navigate between pages

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add app layout with collapsible sidebar and header"
```

---

## Task 14: Dashboard Page (KPI + Sankey)

**Files:**
- Create: `frontend/src/features/dashboard/DashboardPage.tsx`
- Create: `frontend/src/features/dashboard/KpiCards.tsx`
- Create: `frontend/src/features/dashboard/PlantCoverageTable.tsx`
- Create: `frontend/src/components/charts/SankeyChart.tsx`
- Create: `frontend/src/types/dashboard.ts`

- [ ] **Step 1: Create dashboard types**

- [ ] **Step 2: Create KpiCards** — 4 cards (Total, MP%, Developing, Planned) with shadcn Card

- [ ] **Step 3: Create SankeyChart** — ECharts wrapper with node id/layer mapping

- [ ] **Step 4: Create PlantCoverageTable** — shadcn Table

- [ ] **Step 5: Create DashboardPage** — Compose KPI + Sankey + Coverage table

- [ ] **Step 6: Add API hooks** — `useDashboardSummary()` with TanStack Query

- [ ] **Step 7: Test in browser with backend running**

- [ ] **Step 8: Commit**

```bash
git commit -m "feat: add dashboard page with KPI cards, Sankey chart, plant coverage"
```

---

## Task 15: Solution Map Page (Pivot Table)

**Files:**
- Create: `frontend/src/features/solution-map/SolutionMapPage.tsx`
- Create: `frontend/src/features/solution-map/PivotTable.tsx`
- Create: `frontend/src/features/solution-map/FilterBar.tsx`
- Create: `frontend/src/features/solution-map/StatusCellEditor.tsx`
- Create: `frontend/src/components/charts/StatusBadge.tsx`
- Create: `frontend/src/types/solution-map.ts`
- Create: `frontend/src/hooks/useSolutionMap.ts`

- [ ] **Step 1: Create types and API hooks**

- [ ] **Step 2: Create StatusBadge** — Color-coded badge (MP=green, DEV=yellow, etc.)

- [ ] **Step 3: Create FilterBar** — Multi-select dropdowns for Process, Station, Plant, Category, Status

- [ ] **Step 4: Create PivotTable** — TanStack Table with grouped rows (Category → Type → Station → Solution) and Line columns. Cell renders StatusBadge.

- [ ] **Step 5: Create StatusCellEditor** — Modal/popover triggered by cell click (Editor+ only). Status dropdown + notes input + version for optimistic lock.

- [ ] **Step 6: Handle 409 Conflict** — Show "modified by another user" toast + refresh.

- [ ] **Step 7: Create SolutionMapPage** — Compose FilterBar + PivotTable

- [ ] **Step 8: Test in browser** — Filter, click cells to edit, verify optimistic lock

- [ ] **Step 9: Commit**

```bash
git commit -m "feat: add solution map page with pivot table, filters, and inline status editing"
```

---

## Task 16: Process Map Page

**Files:**
- Create: `frontend/src/features/process-map/ProcessMapPage.tsx`

- [ ] **Step 1: Create ProcessMapPage** — ECharts flow diagram: System → Melting → Finishing with station nodes

- [ ] **Step 2: Add station detail expand** — Click station to see solutions list

- [ ] **Step 3: Test in browser**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add process map page with flow visualization"
```

---

## Task 17: Data Management Page (CRUD + Import/Export)

**Files:**
- Create: `frontend/src/features/data-management/DataManagementPage.tsx`
- Create: `frontend/src/features/data-management/SolutionTab.tsx`
- Create: `frontend/src/features/data-management/DefectTypeTab.tsx`
- Create: `frontend/src/features/data-management/StationTab.tsx`
- Create: `frontend/src/features/data-management/TankLineTab.tsx`
- Create: `frontend/src/features/data-management/ImportSection.tsx`
- Create: `frontend/src/features/data-management/ExportSection.tsx`

- [ ] **Step 1: Create tab container** — shadcn Tabs

- [ ] **Step 2: Create SolutionTab** — Table + Add/Edit/Delete + search

- [ ] **Step 3: Create other tabs** — DefectType, Station, TankLine (similar pattern)

- [ ] **Step 4: Create ImportSection** — Drag-drop upload, format select, preview, confirm

- [ ] **Step 5: Create ExportSection** — Format select, filter options, download button

- [ ] **Step 6: Test import/export flow in browser**

- [ ] **Step 7: Commit**

```bash
git commit -m "feat: add data management page with CRUD tabs and import/export"
```

---

## Task 18: Analysis Pages

**Files:**
- Create: `frontend/src/features/analysis/DefectAnalysisPage.tsx`
- Create: `frontend/src/features/analysis/ProcessAnalysisPage.tsx`

- [ ] **Step 1: Create DefectAnalysisPage** — Bar charts (defect distribution, plant coverage)

- [ ] **Step 2: Create ProcessAnalysisPage** — Station heatmap, radar chart

- [ ] **Step 3: Test in browser**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add analysis pages (defect analysis, process analysis)"
```

---

## Task 19: Admin Pages (User Management + Settings)

**Files:**
- Create: `frontend/src/features/admin/UserManagementPage.tsx`
- Create: `frontend/src/features/admin/AdminSettingsPage.tsx`

- [ ] **Step 1: Create UserManagementPage** — User table with status/role filters, approve/reject/disable actions

- [ ] **Step 2: Create AdminSettingsPage** — System settings (status definitions, default role, etc.)

- [ ] **Step 3: Add `/admin/settings` route to App.tsx**

- [ ] **Step 4: Test approve/reject flow and settings page in browser**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add admin pages (user management, system settings)"
```

---

## Task 20: Rate Limiting & Import Cleanup Scheduler

**Files:**
- Modify: `backend/app/main.py` — add rate limiting middleware and startup scheduler
- Create: `backend/app/middleware/rate_limit.py`

- [ ] **Step 1: Install slowapi**

Add to `requirements.txt`: `slowapi==0.1.*`

- [ ] **Step 2: Create `backend/app/middleware/rate_limit.py`**

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
```

- [ ] **Step 3: Apply rate limits in `main.py`**

```python
from app.middleware.rate_limit import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

Apply `@limiter.limit("5/minute")` to login endpoint, `@limiter.limit("100/minute")` to other API endpoints.

- [ ] **Step 4: Add import preview cleanup scheduler**

```python
import asyncio
import os
import time
from pathlib import Path

IMPORT_TEMP_DIR = Path("tmp/imports")
IMPORT_TTL_SECONDS = 15 * 60  # 15 minutes


async def cleanup_expired_imports():
    """Background task to clean up expired import preview files."""
    while True:
        if IMPORT_TEMP_DIR.exists():
            now = time.time()
            for f in IMPORT_TEMP_DIR.iterdir():
                if now - f.stat().st_mtime > IMPORT_TTL_SECONDS:
                    f.unlink(missing_ok=True)
        await asyncio.sleep(300)  # Every 5 minutes


@app.on_event("startup")
async def start_cleanup_scheduler():
    IMPORT_TEMP_DIR.mkdir(parents=True, exist_ok=True)
    asyncio.create_task(cleanup_expired_imports())
```

- [ ] **Step 5: Write rate limit test**

Test that login returns 429 after 5 requests.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: add rate limiting and import preview cleanup scheduler"
```

---

## Task 21: Seed Data & Integration Test (renumbered from 20)

**Files:**
- Create: `backend/app/seed.py`
- Create: `backend/tests/test_integration.py`

- [ ] **Step 1: Create seed script** — Populate StatusDefinition (5 statuses), sample DefectCategories, Processes, Plants, Solutions, SolutionMap entries, and admin user.

- [ ] **Step 2: Run seed and test full flow** — Register → Admin approves → Login → View dashboard → Edit solution map → Import Excel → Export

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add seed data script and integration test"
```

---

## Task 22: Production Build & Deployment Config

**Files:**
- Create: `docker-compose.yml`
- Create: `nginx.conf`
- Create: `Dockerfile.backend`
- Create: `Dockerfile.frontend`

- [ ] **Step 1: Create Dockerfiles** — Backend (uvicorn), Frontend (nginx serving build)

- [ ] **Step 2: Create docker-compose.yml** — backend + frontend + nginx proxy

- [ ] **Step 3: Create nginx.conf** — `/` → frontend, `/api/` → backend

- [ ] **Step 4: Test docker-compose up**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add Docker and nginx deployment configuration"
```

---

## Summary

| Task | Description | Dependencies |
|------|-------------|-------------|
| 1 | Backend scaffolding | None |
| 2 | Database models | Task 1 |
| 3 | Alembic migrations | Task 2 |
| 4 | Shared schemas & security | Task 1 |
| 5 | Auth endpoints | Task 2, 4 |
| 6 | Reference data CRUD | Task 2, 4, 5 |
| 7 | Solution & Solution Map APIs | Task 6 |
| 8 | Dashboard APIs | Task 7 |
| 9 | Import/Export APIs | Task 7 |
| 10 | User Management API | Task 5 |
| 11 | Frontend scaffolding | None |
| 12 | Auth pages | Task 11 |
| 13 | Layout | Task 12 |
| 14 | Dashboard page | Task 13 |
| 15 | Solution Map page | Task 13 |
| 16 | Process Map page | Task 13 |
| 17 | Data Management page | Task 13 |
| 18 | Analysis pages | Task 13 |
| 19 | Admin pages (Users + Settings) | Task 13 |
| 20 | Rate limiting & import cleanup | Task 5, 9 |
| 21 | Seed data & integration test | Task 1-10 |
| 22 | Deployment config | All |

**Parallelizable groups:**
- Tasks 1-4 (backend foundation) can run partially in parallel
- Tasks 6, 10 can run in parallel after Task 5
- Tasks 8, 9 can run in parallel after Task 7
- Tasks 11-13 (frontend foundation) independent of backend
- Tasks 14-19 (frontend pages) can run in parallel after Task 13
- Task 20 can run in parallel with frontend tasks
