# D^t Solution Roadmap AI Agent - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an AI Agent chat feature that lets users query system data via natural language, receive structured analysis and ECharts visualizations, strictly from internal data only.

**Architecture:** LangGraph ReAct Agent with 7 custom tools wrapping existing FastAPI services. Backend streams responses via SSE. Frontend provides a floating chat widget (expandable to full-screen page) using ECharts for visualization.

**Tech Stack:** FastAPI + LangGraph + langchain-openai (Corning AI Platform), React + ECharts + SSE, SQLite

---

## Task 1: Backend Dependencies & Configuration

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `backend/app/config.py`
- Create: `backend/.env.example` (update existing or create)

- [ ] **Step 1: Add LangGraph dependencies to requirements.txt**

Append these lines to `backend/requirements.txt`:

```
langchain==0.3.27
langchain-openai==0.3.28
langchain-core==0.3.72
langgraph==0.6.2
```

- [ ] **Step 2: Add agent config fields to config.py**

Add these fields to the `Settings` class in `backend/app/config.py`:

```python
corning_ai_api_key: str = ""
corning_ai_base_url: str = "https://ai-platform.corning.com"
agent_model: str = "us.anthropic.claude-sonnet-4-6"
agent_max_messages: int = 10
```

- [ ] **Step 3: Install dependencies**

Run:
```bash
cd backend && pip install langchain==0.3.27 langchain-openai==0.3.28 langchain-core==0.3.72 langgraph==0.6.2
```

- [ ] **Step 4: Verify import works**

Run:
```bash
cd backend && python -c "from langgraph.prebuilt import create_react_agent; print('OK')"
```

Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add backend/requirements.txt backend/app/config.py
git commit -m "feat(agent): add LangGraph dependencies and config"
```

---

## Task 2: Agent Conversation Model

**Files:**
- Create: `backend/app/models/agent.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1: Write test for conversation model**

Create `backend/tests/test_agent_model.py`:

```python
import json
import uuid

from app.models.agent import AgentConversation


def test_agent_conversation_create(db_session):
    conv = AgentConversation(
        id=str(uuid.uuid4()),
        user_id=1,
        title="Test conversation",
        messages=json.dumps([]),
    )
    db_session.add(conv)
    db_session.commit()
    db_session.refresh(conv)

    assert conv.id is not None
    assert conv.title == "Test conversation"
    assert conv.is_active is True
    assert conv.created_at is not None


def test_agent_conversation_messages_json(db_session):
    messages = [
        {"role": "user", "content": "hello"},
        {"role": "assistant", "content": "hi"},
    ]
    conv = AgentConversation(
        id=str(uuid.uuid4()),
        user_id=1,
        title="Chat",
        messages=json.dumps(messages),
    )
    db_session.add(conv)
    db_session.commit()
    db_session.refresh(conv)

    loaded = json.loads(conv.messages)
    assert len(loaded) == 2
    assert loaded[0]["role"] == "user"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_agent_model.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.models.agent'`

- [ ] **Step 3: Create the model**

Create `backend/app/models/agent.py`:

```python
from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class AgentConversation(TimestampMixin, Base):
    __tablename__ = "agent_conversation"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    messages: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
```

- [ ] **Step 4: Register model in __init__.py**

Add to `backend/app/models/__init__.py`:

```python
from app.models.agent import AgentConversation
```

And add `"AgentConversation"` to the `__all__` list.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_agent_model.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/models/agent.py backend/app/models/__init__.py backend/tests/test_agent_model.py
git commit -m "feat(agent): add AgentConversation model"
```

---

## Task 3: Agent Tools

**Files:**
- Create: `backend/app/services/agent_tools.py`
- Test: `backend/tests/test_agent_tools.py`

- [ ] **Step 1: Write tests for agent tools**

Create `backend/tests/test_agent_tools.py`:

```python
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
    status_mp = StatusDefinition(id=1, code="MP", label="Mass Production", color="#22c55e", sort_order=1)
    status_dev = StatusDefinition(id=2, code="DEVELOPING", label="Developing", color="#f59e0b", sort_order=2)
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

    tl = TankLine(id=1, name="TL-1", plant_id=1, sort_order=1)
    db.add(tl)

    sol = Solution(id=1, name="Sol-A", defect_type_id=1, station_id=1, sort_order=1, is_g_item=True)
    db.add(sol)

    sm = SolutionMap(id=1, solution_id=1, tank_line_id=1, status_id=1)
    db.add(sm)

    db.commit()


def test_query_dashboard_kpi(db_session):
    _seed_data(db_session)
    result = json.loads(query_dashboard_kpi(db_session))
    assert result["data"]["total_solutions"] >= 1
    assert "chart_config" in result


def test_query_plant_coverage(db_session):
    _seed_data(db_session)
    result = json.loads(query_plant_coverage(db_session))
    assert len(result["data"]) >= 1
    assert result["data"][0]["plant"] == "TPK"


def test_query_g_items(db_session):
    _seed_data(db_session)
    result = json.loads(query_g_items(db_session))
    assert result["data"]["total"] >= 1


def test_query_solutions_by_filter(db_session):
    _seed_data(db_session)
    result = json.loads(query_solutions_by_filter(db_session, process_id=1))
    assert len(result["data"]) >= 1


def test_query_process_analysis(db_session):
    _seed_data(db_session)
    result = json.loads(query_process_analysis(db_session))
    assert len(result["data"]) >= 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_agent_tools.py -v`
Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: Implement agent tools**

Create `backend/app/services/agent_tools.py`:

```python
"""Custom tools for the D^t Solution Roadmap AI Agent.

Each function queries the database using existing service logic and returns
a JSON string with data, chart_config, and summary fields.
"""
import json
from typing import Any

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
        {"monthly_targets": monthly, "plant_targets": data["plant_targets"],
         "complete_count": complete_count, "total_count": total_count},
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
    query = db.query(Solution, Station, Process, DefectType, DefectCategory).join(
        Station, Solution.station_id == Station.id
    ).join(
        Process, Station.process_id == Process.id
    ).join(
        DefectType, Solution.defect_type_id == DefectType.id
    ).join(
        DefectCategory, DefectType.category_id == DefectCategory.id
    ).filter(Solution.is_active == True)  # noqa: E712

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
    query = (
        db.query(StatusDefinition.label, StatusDefinition.code, StatusDefinition.color)
        .join(SolutionMap, SolutionMap.status_id == StatusDefinition.id)
        .join(Solution, SolutionMap.solution_id == Solution.id)
        .join(TankLine, SolutionMap.tank_line_id == TankLine.id)
    )

    if plant_id:
        query = query.join(Plant, TankLine.plant_id == Plant.id).filter(Plant.id == plant_id)
    if process_id:
        query = query.join(Station, Solution.station_id == Station.id).filter(
            Station.process_id == process_id
        )

    from sqlalchemy import func
    status_counts = (
        db.query(
            StatusDefinition.label,
            StatusDefinition.code,
            StatusDefinition.color,
            func.count(SolutionMap.id).label("count"),
        )
        .join(SolutionMap, SolutionMap.status_id == StatusDefinition.id)
        .join(Solution, SolutionMap.solution_id == Solution.id)
        .join(TankLine, SolutionMap.tank_line_id == TankLine.id)
    )
    if plant_id:
        status_counts = status_counts.join(Plant, TankLine.plant_id == Plant.id).filter(Plant.id == plant_id)
    if process_id:
        status_counts = status_counts.join(Station, Solution.station_id == Station.id).filter(
            Station.process_id == process_id
        )

    rows = status_counts.group_by(
        StatusDefinition.label, StatusDefinition.code, StatusDefinition.color
    ).all()

    data = [
        {"status": row.label, "code": row.code, "color": row.color, "count": row.count}
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
    result = _get_process_analysis(db, plant_id=plant_id)
    nodes = result["nodes"]
    data = [
        {"station": n["station"], "process": n["process"], "solution_count": n["solution_count"]}
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_agent_tools.py -v`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/agent_tools.py backend/tests/test_agent_tools.py
git commit -m "feat(agent): add 7 custom tools wrapping existing services"
```

---

## Task 4: Agent Service (LangGraph ReAct Agent)

**Files:**
- Create: `backend/app/services/agent_service.py`
- Test: `backend/tests/test_agent_service.py`

- [ ] **Step 1: Write test for agent service**

Create `backend/tests/test_agent_service.py`:

```python
"""Tests for agent service - mocks the LLM to test orchestration."""
import json
from unittest.mock import patch, MagicMock

from app.services.agent_service import build_agent_tools, SYSTEM_PROMPT


def test_system_prompt_contains_strict_rules():
    assert "NEVER make up data" in SYSTEM_PROMPT
    assert "目前系統中沒有相關資料" in SYSTEM_PROMPT


def test_build_agent_tools_returns_correct_count(db_session):
    tools = build_agent_tools(db_session)
    assert len(tools) == 7


def test_build_agent_tools_have_docstrings(db_session):
    tools = build_agent_tools(db_session)
    for tool in tools:
        assert tool.description, f"Tool {tool.name} missing description"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_agent_service.py -v`
Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: Implement agent service**

Create `backend/app/services/agent_service.py`:

```python
"""Agent service: builds and invokes the LangGraph ReAct agent."""
import json
import os
from collections.abc import AsyncGenerator

from langchain.tools import StructuredTool
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from sqlalchemy.orm import Session

from app.config import settings
from app.services.agent_tools import (
    query_dashboard_kpi,
    query_g_items,
    query_g_tracking,
    query_plant_coverage,
    query_process_analysis,
    query_solution_map_status,
    query_solutions_by_filter,
)

SYSTEM_PROMPT = (
    "You are the D^t Solution Roadmap Assistant at Corning Display Technology. "
    "You help users analyze quality solution deployment data.\n\n"
    "STRICT RULES:\n"
    "1. You can ONLY answer questions using data from your available tools.\n"
    "2. If a tool returns no data or you cannot find the answer, say \"目前系統中沒有相關資料\" honestly.\n"
    "3. NEVER make up data, statistics, or percentages.\n"
    "4. NEVER reference external sources or your training data for domain-specific answers.\n"
    "5. When suggesting actions, prefix with \"建議：\" and clarify you cannot execute them.\n"
    "6. Respond in Traditional Chinese (Taiwan) unless the user writes in English.\n"
    "7. When data supports visualization, include a JSON block with key \"chart\" containing "
    "the chart_config from the tool response so the frontend can render it.\n"
    "8. Keep responses concise and data-driven.\n"
    "9. For questions about terminology: MP=Mass Production, G$=G-dollar quality improvement items, "
    "D^t=Defect Type solution.\n"
)


def build_agent_tools(db: Session) -> list[StructuredTool]:
    """Build the 7 LangChain tools bound to a DB session."""

    def _kpi(plant_id: int | None = None) -> str:
        """Get overall KPI summary: total solutions, MP count/percentage, developing/planned/initiation/resource counts. Use when users ask about overall progress, completion rates, or status distribution."""
        return query_dashboard_kpi(db, plant_id=plant_id)

    def _plant_coverage() -> str:
        """Get MP coverage percentage for each plant/factory. Use when users ask which plant has highest/lowest coverage, or factory performance rankings."""
        return query_plant_coverage(db)

    def _g_items(
        plant_ids: str | None = None,
        process_ids: str | None = None,
        reasons: str | None = None,
        search: str | None = None,
    ) -> str:
        """Get G$ items list with deployment status. Use when users ask about G$ projects, their reasons, or specific G$ items. plant_ids/process_ids are comma-separated IDs. reasons can be: GQI, GQE, UNSPECIFIED."""
        p_ids = [int(x) for x in plant_ids.split(",")] if plant_ids else None
        pr_ids = [int(x) for x in process_ids.split(",")] if process_ids else None
        r_list = reasons.split(",") if reasons else None
        return query_g_items(db, plant_ids=p_ids, process_ids=pr_ids, reasons=r_list, search=search)

    def _g_tracking(year: int | None = None) -> str:
        """Get G$ tracking monthly progress vs budget/stretch targets. Use when users ask about G$ completion trends, whether on track, or year-to-date performance."""
        return query_g_tracking(db, year=year)

    def _solutions(
        process_id: int | None = None,
        station_id: int | None = None,
        defect_type_id: int | None = None,
        is_g_item: bool | None = None,
    ) -> str:
        """Get solutions filtered by process, station, defect type, or G$ flag. Use when users ask what solutions exist for a specific area."""
        return query_solutions_by_filter(
            db, process_id=process_id, station_id=station_id,
            defect_type_id=defect_type_id, is_g_item=is_g_item,
        )

    def _solution_map(plant_id: int | None = None, process_id: int | None = None) -> str:
        """Get solution map deployment status distribution. Use when users ask about how many solutions are in MP/Developing/Planned per plant or process."""
        return query_solution_map_status(db, plant_id=plant_id, process_id=process_id)

    def _process_analysis(plant_id: int | None = None) -> str:
        """Get solution count per station in production flow order. Use when users ask which stations have the most/fewest solutions or production flow analysis."""
        return query_process_analysis(db, plant_id=plant_id)

    tools = [
        StructuredTool.from_function(_kpi, name="get_dashboard_kpi"),
        StructuredTool.from_function(_plant_coverage, name="get_plant_coverage"),
        StructuredTool.from_function(_g_items, name="get_g_items"),
        StructuredTool.from_function(_g_tracking, name="get_g_tracking"),
        StructuredTool.from_function(_solutions, name="get_solutions_by_filter"),
        StructuredTool.from_function(_solution_map, name="get_solution_map_status"),
        StructuredTool.from_function(_process_analysis, name="get_process_analysis"),
    ]
    return tools


def get_llm():
    """Create the ChatOpenAI instance pointing to Corning AI Platform."""
    return ChatOpenAI(
        openai_api_base=settings.corning_ai_base_url,
        model=settings.agent_model,
        api_key=settings.corning_ai_api_key,
        temperature=0.1,
        streaming=True,
    )


def invoke_agent(db: Session, messages: list[dict]) -> str:
    """Invoke the agent synchronously and return the final response text."""
    llm = get_llm()
    tools = build_agent_tools(db)
    agent = create_react_agent(model=llm, tools=tools, prompt=SYSTEM_PROMPT)

    result = agent.invoke({"messages": messages})
    return result["messages"][-1].content


async def stream_agent(db: Session, messages: list[dict]) -> AsyncGenerator[str, None]:
    """Stream agent response token by token via SSE-compatible yields."""
    llm = get_llm()
    tools = build_agent_tools(db)
    agent = create_react_agent(model=llm, tools=tools, prompt=SYSTEM_PROMPT)

    async for event in agent.astream_events(
        {"messages": messages}, version="v2"
    ):
        kind = event["event"]
        if kind == "on_chat_model_stream":
            content = event["data"]["chunk"].content
            if content:
                yield json.dumps({"type": "token", "content": content}) + "\n"
        elif kind == "on_tool_end":
            try:
                tool_output = json.loads(event["data"]["output"])
                if tool_output.get("chart_config"):
                    yield json.dumps({
                        "type": "chart",
                        "chart_config": tool_output["chart_config"],
                        "data": tool_output["data"],
                    }) + "\n"
            except (json.JSONDecodeError, TypeError):
                pass

    yield json.dumps({"type": "done"}) + "\n"
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_agent_service.py -v`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/agent_service.py backend/tests/test_agent_service.py
git commit -m "feat(agent): implement LangGraph ReAct agent service with streaming"
```

---

## Task 5: Agent Router (API Endpoints)

**Files:**
- Create: `backend/app/routers/agent.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_agent_router.py`

- [ ] **Step 1: Write test for agent router**

Create `backend/tests/test_agent_router.py`:

```python
"""Tests for agent router endpoints."""
import json
from unittest.mock import patch, AsyncMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.dependencies import get_db, get_current_user
from app.main import app
from app.models.user import User


@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)


@pytest.fixture
def test_user(test_db):
    user = User(
        id=1,
        username="testuser",
        email="test@corning.com",
        password_hash="fakehash",
        role="viewer",
        status="active",
    )
    test_db.add(user)
    test_db.commit()
    return user


@pytest.fixture
def client(test_db, test_user):
    app.dependency_overrides[get_db] = lambda: test_db
    app.dependency_overrides[get_current_user] = lambda: test_user
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_chat_endpoint_rejects_empty_message(client):
    resp = client.post("/api/v1/agent/chat", json={"message": ""})
    assert resp.status_code == 422 or resp.status_code == 400


def test_chat_endpoint_rejects_too_long_message(client):
    resp = client.post("/api/v1/agent/chat", json={"message": "x" * 2001})
    assert resp.status_code == 400


def test_conversations_list_empty(client):
    resp = client.get("/api/v1/agent/conversations")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["data"] == []


@patch("app.routers.agent.stream_agent", new_callable=AsyncMock)
def test_chat_endpoint_streams_response(mock_stream, client):
    async def fake_stream(*args, **kwargs):
        yield json.dumps({"type": "token", "content": "Hello"}) + "\n"
        yield json.dumps({"type": "done"}) + "\n"

    mock_stream.return_value = fake_stream()

    resp = client.post(
        "/api/v1/agent/chat",
        json={"message": "test question"},
        headers={"Accept": "text/event-stream"},
    )
    assert resp.status_code == 200
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_agent_router.py -v`
Expected: FAIL with import errors

- [ ] **Step 3: Implement agent router**

Create `backend/app/routers/agent.py`:

```python
"""Agent chat API endpoints with SSE streaming."""
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models.agent import AgentConversation
from app.models.user import User
from app.schemas.common import ok
from app.services.agent_service import stream_agent

router = APIRouter(prefix="/api/v1/agent", tags=["agent"])


class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None

    @field_validator("message")
    @classmethod
    def message_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Message cannot be empty")
        return v.strip()


@router.post("/chat")
async def chat(
    body: ChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if len(body.message) > 2000:
        raise HTTPException(status_code=400, detail="Message too long (max 2000 chars)")

    # Load or create conversation
    conversation = None
    if body.conversation_id:
        conversation = (
            db.query(AgentConversation)
            .filter(
                AgentConversation.id == body.conversation_id,
                AgentConversation.user_id == user.id,
                AgentConversation.is_active == True,  # noqa: E712
            )
            .first()
        )

    if conversation is None:
        conversation = AgentConversation(
            id=str(uuid.uuid4()),
            user_id=user.id,
            title=body.message[:100],
            messages="[]",
        )
        db.add(conversation)
        db.commit()

    # Build messages for agent (last N pairs from history)
    from app.config import settings
    history = json.loads(conversation.messages)
    history.append({"role": "user", "content": body.message})

    max_msgs = settings.agent_max_messages * 2
    context_messages = history[-max_msgs:]

    async def event_stream():
        full_response = ""
        async for chunk in stream_agent(db, context_messages):
            parsed = json.loads(chunk.strip())
            if parsed["type"] == "token":
                full_response += parsed["content"]
            yield f"data: {chunk}\n\n"

        # Save conversation after streaming completes
        history.append({"role": "assistant", "content": full_response})
        conversation.messages = json.dumps(history, ensure_ascii=False)
        db.commit()

        # Send conversation_id in done event
        yield f"data: {json.dumps({'type': 'meta', 'conversation_id': conversation.id})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/conversations")
def list_conversations(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = (
        db.query(AgentConversation)
        .filter(
            AgentConversation.user_id == user.id,
            AgentConversation.is_active == True,  # noqa: E712
        )
        .order_by(AgentConversation.updated_at.desc())
        .limit(50)
        .all()
    )
    data = [
        {
            "id": r.id,
            "title": r.title,
            "created_at": r.created_at.isoformat(),
            "message_count": len(json.loads(r.messages)),
        }
        for r in rows
    ]
    return ok(data)


@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    conv = (
        db.query(AgentConversation)
        .filter(
            AgentConversation.id == conversation_id,
            AgentConversation.user_id == user.id,
        )
        .first()
    )
    if conv is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv.is_active = False
    db.commit()
    return ok(None)
```

- [ ] **Step 4: Register router in main.py**

Add to `backend/app/main.py` imports:

```python
from app.routers.agent import router as agent_router
```

Add after the g_tracking_router include:

```python
app.include_router(agent_router)
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_agent_router.py -v`
Expected: PASS (at least conversations list and validation tests)

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/agent.py backend/app/main.py backend/tests/test_agent_router.py
git commit -m "feat(agent): add agent router with SSE streaming chat endpoint"
```

---

## Task 6: Frontend - Chat Types & API Client

**Files:**
- Create: `frontend/src/features/agent/types.ts`
- Create: `frontend/src/features/agent/useAgentChat.ts`

- [ ] **Step 1: Create TypeScript types**

Create `frontend/src/features/agent/types.ts`:

```typescript
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  charts?: ChartData[]
  timestamp: string
}

export interface ChartData {
  type: 'bar' | 'pie' | 'line' | 'table'
  title: string
  data: Record<string, unknown>[]
  config: ChartConfig
}

export interface ChartConfig {
  type: string
  title: string
  x_field?: string
  y_field?: string
  y_fields?: string[]
  series_field?: string
  value_field?: string
}

export interface Conversation {
  id: string
  title: string
  created_at: string
  message_count: number
}

export interface SSEEvent {
  type: 'token' | 'chart' | 'done' | 'meta' | 'error'
  content?: string
  chart_config?: ChartConfig
  data?: Record<string, unknown>[]
  conversation_id?: string
  message?: string
}
```

- [ ] **Step 2: Create useAgentChat hook**

Create `frontend/src/features/agent/useAgentChat.ts`:

```typescript
import { useState, useCallback, useRef } from 'react'
import type { ChatMessage, ChartData, SSEEvent } from './types'

export function useAgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setIsStreaming(true)

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      charts: [],
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, assistantMessage])

    try {
      abortRef.current = new AbortController()
      const token = localStorage.getItem('access_token')

      const response = await fetch('/api/v1/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: content,
          conversation_id: conversationId,
        }),
        signal: abortRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const dataLine = line.replace(/^data: /, '').trim()
          if (!dataLine) continue

          try {
            const event: SSEEvent = JSON.parse(dataLine)

            if (event.type === 'token' && event.content) {
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + event.content,
                  }
                }
                return updated
              })
            } else if (event.type === 'chart' && event.chart_config) {
              const chart: ChartData = {
                type: event.chart_config.type as ChartData['type'],
                title: event.chart_config.title,
                data: (event.data as Record<string, unknown>[]) || [],
                config: event.chart_config,
              }
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    charts: [...(last.charts || []), chart],
                  }
                }
                return updated
              })
            } else if (event.type === 'meta' && event.conversation_id) {
              setConversationId(event.conversation_id)
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last.role === 'assistant' && !last.content) {
            updated[updated.length - 1] = {
              ...last,
              content: 'AI 服務暫時無法使用，請稍後再試。',
            }
          }
          return updated
        })
      }
    } finally {
      setIsStreaming(false)
    }
  }, [conversationId])

  const clearChat = useCallback(() => {
    setMessages([])
    setConversationId(null)
  }, [])

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
    setIsStreaming(false)
  }, [])

  return { messages, isStreaming, sendMessage, clearChat, stopStreaming, conversationId }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/agent/types.ts frontend/src/features/agent/useAgentChat.ts
git commit -m "feat(agent): add frontend types and useAgentChat hook with SSE streaming"
```

---

## Task 7: Frontend - Agent Chart Component

**Files:**
- Create: `frontend/src/features/agent/AgentChart.tsx`

- [ ] **Step 1: Create AgentChart component**

Create `frontend/src/features/agent/AgentChart.tsx`:

```tsx
import ReactECharts from 'echarts-for-react'
import type { ChartData } from './types'

interface AgentChartProps {
  chart: ChartData
}

export function AgentChart({ chart }: AgentChartProps) {
  const option = buildChartOption(chart)

  if (chart.type === 'table') {
    return <AgentTable chart={chart} />
  }

  return (
    <div className="my-3 rounded-lg border bg-white p-3">
      <ReactECharts option={option} style={{ height: 280 }} />
    </div>
  )
}

function buildChartOption(chart: ChartData): Record<string, unknown> {
  const { type, config, data, title } = chart

  if (type === 'bar') {
    const xField = config.x_field || 'name'
    const yField = config.y_field || 'value'
    return {
      title: { text: title, left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: data.map(d => String(d[xField] ?? '')),
        axisLabel: { rotate: data.length > 6 ? 30 : 0, fontSize: 11 },
      },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: data.map(d => d[yField]), itemStyle: { color: '#3b82f6' } }],
      grid: { bottom: 60, left: 50, right: 20 },
    }
  }

  if (type === 'pie') {
    const seriesField = config.series_field || 'name'
    const valueField = config.value_field || 'value'
    return {
      title: { text: title, left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      series: [{
        type: 'pie',
        radius: ['30%', '65%'],
        data: data.map(d => ({ name: String(d[seriesField] ?? ''), value: d[valueField] })),
        label: { fontSize: 11 },
      }],
    }
  }

  if (type === 'line') {
    const xField = config.x_field || 'month'
    const yFields = config.y_fields || [config.y_field || 'value']
    const colors = ['#3b82f6', '#f59e0b', '#22c55e', '#ef4444']
    return {
      title: { text: title, left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, data: yFields },
      xAxis: {
        type: 'category',
        data: data.map(d => String(d[xField] ?? '')),
      },
      yAxis: { type: 'value' },
      series: yFields.map((field, i) => ({
        name: field,
        type: 'line',
        data: data.map(d => d[field]),
        itemStyle: { color: colors[i % colors.length] },
      })),
      grid: { bottom: 60, left: 50, right: 20 },
    }
  }

  return {}
}

function AgentTable({ chart }: { chart: ChartData }) {
  const { data, title } = chart
  if (!data.length) return <p className="text-sm text-gray-500">No data</p>

  const columns = Object.keys(data[0])

  return (
    <div className="my-3 overflow-x-auto rounded-lg border">
      <p className="bg-gray-50 px-3 py-2 text-sm font-medium">{title}</p>
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-100">
          <tr>
            {columns.map(col => (
              <th key={col} className="px-3 py-2 font-medium">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 20).map((row, i) => (
            <tr key={i} className="border-t">
              {columns.map(col => (
                <td key={col} className="px-3 py-1.5">{String(row[col] ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 20 && (
        <p className="px-3 py-2 text-xs text-gray-500">Showing 20 of {data.length} rows</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/agent/AgentChart.tsx
git commit -m "feat(agent): add AgentChart component supporting bar/pie/line/table"
```

---

## Task 8: Frontend - Chat Widget Component

**Files:**
- Create: `frontend/src/features/agent/ChatWidget.tsx`
- Modify: `frontend/src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Create ChatWidget component**

Create `frontend/src/features/agent/ChatWidget.tsx`:

```tsx
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, X, Send, Maximize2, Trash2, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAgentChat } from './useAgentChat'
import { AgentChart } from './AgentChart'

const QUICKSTART_PROMPTS = [
  '目前整體 MP 達成率是多少？',
  '哪個工廠的覆蓋率最低？',
  'G$ 項目今年的進度如何？',
  'Melting 製程有哪些 solutions？',
  '各狀態的 solution 數量分佈？',
]

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const { messages, isStreaming, sendMessage, clearChat, stopStreaming } = useAgentChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return
    setInput('')
    sendMessage(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors"
        aria-label="Open AI Assistant"
      >
        <MessageCircle size={24} />
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[500px] w-[400px] flex-col rounded-xl border bg-white shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-blue-600 px-4 py-3 rounded-t-xl">
        <h3 className="text-sm font-semibold text-white">D^t AI Assistant</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate('/agent')}
            className="rounded p-1 text-blue-100 hover:bg-blue-700 hover:text-white"
            title="Open full page"
          >
            <Maximize2 size={16} />
          </button>
          <button
            onClick={clearChat}
            className="rounded p-1 text-blue-100 hover:bg-blue-700 hover:text-white"
            title="Clear chat"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded p-1 text-blue-100 hover:bg-blue-700 hover:text-white"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-500">Hi! 我可以幫你分析 D^t Solution Roadmap 的資料。試試以下問題：</p>
            <div className="flex flex-wrap gap-2">
              {QUICKSTART_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="rounded-full border px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.charts?.map((chart, i) => (
                <AgentChart key={i} chart={chart} />
              ))}
            </div>
          </div>
        ))}

        {isStreaming && messages[messages.length - 1]?.content === '' && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-gray-100 px-3 py-2">
              <span className="animate-pulse text-sm text-gray-500">思考中...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t p-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="輸入問題..."
            className="flex-1 rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            disabled={isStreaming}
            maxLength={2000}
          />
          {isStreaming ? (
            <Button size="sm" variant="outline" onClick={stopStreaming}>
              <Square size={16} />
            </Button>
          ) : (
            <Button size="sm" onClick={handleSend} disabled={!input.trim()}>
              <Send size={16} />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add ChatWidget to AppLayout**

Read `frontend/src/components/layout/AppLayout.tsx` and add the ChatWidget. Add import at top:

```tsx
import { ChatWidget } from '@/features/agent/ChatWidget'
```

Add `<ChatWidget />` at the end of the layout JSX, before the closing fragment/div.

- [ ] **Step 3: Verify in browser**

Run: `cd frontend && npm run dev`

Open browser, verify:
- Blue chat bubble appears bottom-right
- Clicking opens the chat panel
- Can type and see quickstart prompts

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/agent/ChatWidget.tsx frontend/src/components/layout/AppLayout.tsx
git commit -m "feat(agent): add floating ChatWidget component to AppLayout"
```

---

## Task 9: Frontend - Full-Screen Agent Page

**Files:**
- Create: `frontend/src/features/agent/AgentPage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Create AgentPage component**

Create `frontend/src/features/agent/AgentPage.tsx`:

```tsx
import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Send, Plus, Trash2, Square, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import apiClient from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'
import { useAgentChat } from './useAgentChat'
import { AgentChart } from './AgentChart'
import type { Conversation } from './types'

const QUICKSTART_PROMPTS = [
  '目前整體 MP 達成率是多少？',
  '哪個工廠的覆蓋率最低？',
  'G$ 項目今年的進度如何？',
  'Melting 製程有哪些 solutions？',
  '各狀態的 solution 數量分佈？',
  '哪些 station 的 solution 最多？',
]

export function AgentPage() {
  const [input, setInput] = useState('')
  const { messages, isStreaming, sendMessage, clearChat, stopStreaming } = useAgentChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()

  const { data: conversations } = useQuery({
    queryKey: ['agent-conversations'],
    queryFn: async () => {
      const resp = await apiClient.get<ApiResponse<Conversation[]>>('/agent/conversations')
      return resp.data.data ?? []
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return
    setInput('')
    sendMessage(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleDeleteConversation = async (id: string) => {
    await apiClient.delete(`/agent/conversations/${id}`)
    qc.invalidateQueries({ queryKey: ['agent-conversations'] })
  }

  return (
    <div className="flex h-full">
      {/* Sidebar - Conversation History */}
      <div className="w-64 border-r bg-gray-50 flex flex-col">
        <div className="p-3 border-b">
          <Button size="sm" className="w-full" onClick={clearChat}>
            <Plus size={16} className="mr-1" /> New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations?.map((conv) => (
            <div
              key={conv.id}
              className="group flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-200"
            >
              <span className="truncate flex-1">{conv.title}</span>
              <button
                onClick={() => handleDeleteConversation(conv.id)}
                className="hidden group-hover:block text-gray-400 hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full space-y-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <Bot size={32} className="text-blue-600" />
              </div>
              <div className="text-center">
                <h2 className="text-lg font-semibold">D^t AI Assistant</h2>
                <p className="text-sm text-gray-500 mt-1">
                  我可以幫你分析品質解決方案的部署資料、G$ 追蹤進度等
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 max-w-lg">
                {QUICKSTART_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="rounded-lg border px-3 py-2 text-sm text-left text-gray-700 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                {msg.charts?.map((chart, i) => (
                  <AgentChart key={i} chart={chart} />
                ))}
              </div>
            </div>
          ))}

          {isStreaming && messages[messages.length - 1]?.content === '' && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-gray-100 px-4 py-3">
                <span className="animate-pulse text-sm text-gray-500">思考中...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t p-4">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="輸入問題...（例如：哪個工廠的 MP 比例最高？）"
              className="flex-1 rounded-lg border px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              disabled={isStreaming}
              maxLength={2000}
            />
            {isStreaming ? (
              <Button onClick={stopStreaming} variant="outline">
                <Square size={18} />
              </Button>
            ) : (
              <Button onClick={handleSend} disabled={!input.trim()}>
                <Send size={18} />
              </Button>
            )}
          </div>
          <p className="mt-2 text-center text-xs text-gray-400">
            AI 僅根據系統內部資料回答，不會產生或引用外部資訊
          </p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add route to App.tsx**

Add import to `frontend/src/App.tsx`:

```tsx
import { AgentPage } from '@/features/agent/AgentPage'
```

Add route inside the protected `<Route path="/">` children, after g-tracking:

```tsx
<Route path="agent" element={<AgentPage />} />
```

- [ ] **Step 3: Add navigation link to Sidebar**

In `frontend/src/components/layout/Sidebar.tsx`:

Add `Bot` to the lucide-react import:

```tsx
import { ..., Bot } from 'lucide-react'
```

Add a new entry to `mainNavItems`:

```tsx
{ label: 'AI Assistant', icon: Bot, to: '/agent' },
```

- [ ] **Step 4: Verify in browser**

Run: `cd frontend && npm run dev`

Check:
- Sidebar shows "AI Assistant" nav item
- Clicking navigates to `/agent` page
- Full-screen chat interface renders with quickstart prompts

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/agent/AgentPage.tsx frontend/src/App.tsx frontend/src/components/layout/Sidebar.tsx
git commit -m "feat(agent): add full-screen Agent page with conversation history"
```

---

## Task 10: Database Migration & Integration Test

**Files:**
- Modify: `backend/app/main.py` (ensure table creation)
- Create: `backend/tests/test_agent_integration.py`

- [ ] **Step 1: Ensure agent_conversation table is created on startup**

The project uses SQLAlchemy with `Base.metadata.create_all(engine)` pattern. Since `AgentConversation` is now imported in `models/__init__.py`, it will be auto-created when the app starts (SQLAlchemy's `create_all` is idempotent).

Verify by checking if the project has an alembic migration setup. If yes, create a migration:

```bash
cd backend && alembic revision --autogenerate -m "add agent_conversation table"
cd backend && alembic upgrade head
```

If alembic is not configured for auto-generation, the table will be created on first access via SQLAlchemy's create_all.

- [ ] **Step 2: Write integration test**

Create `backend/tests/test_agent_integration.py`:

```python
"""Integration test: verify the full agent flow with mocked LLM."""
import json
from unittest.mock import patch, AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.dependencies import get_db, get_current_user
from app.main import app
from app.models.user import User
from app.models.agent import AgentConversation


@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)


@pytest.fixture
def test_user(test_db):
    user = User(
        id=1,
        username="agent_user",
        email="agent@corning.com",
        password_hash="fakehash",
        role="viewer",
        status="active",
    )
    test_db.add(user)
    test_db.commit()
    return user


@pytest.fixture
def client(test_db, test_user):
    app.dependency_overrides[get_db] = lambda: test_db
    app.dependency_overrides[get_current_user] = lambda: test_user
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_full_conversation_lifecycle(client, test_db):
    # List conversations - empty
    resp = client.get("/api/v1/agent/conversations")
    assert resp.status_code == 200
    assert resp.json()["data"] == []

    # Create conversation via chat (mocked streaming)
    with patch("app.routers.agent.stream_agent") as mock_stream:
        async def fake_stream(db, msgs):
            yield json.dumps({"type": "token", "content": "Hello from agent"}) + "\n"
            yield json.dumps({"type": "done"}) + "\n"

        mock_stream.return_value = fake_stream(None, None)

        resp = client.post(
            "/api/v1/agent/chat",
            json={"message": "test query"},
        )
        assert resp.status_code == 200

    # Verify conversation was created
    convs = test_db.query(AgentConversation).all()
    assert len(convs) == 1
    assert convs[0].title == "test query"

    # List conversations - one result
    resp = client.get("/api/v1/agent/conversations")
    assert resp.status_code == 200
    assert len(resp.json()["data"]) == 1

    # Delete conversation
    conv_id = convs[0].id
    resp = client.delete(f"/api/v1/agent/conversations/{conv_id}")
    assert resp.status_code == 200

    # Verify soft-deleted
    conv = test_db.query(AgentConversation).filter(AgentConversation.id == conv_id).first()
    assert conv.is_active is False
```

- [ ] **Step 3: Run integration test**

Run: `cd backend && python -m pytest tests/test_agent_integration.py -v`
Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git add backend/tests/test_agent_integration.py
git commit -m "test(agent): add integration test for full conversation lifecycle"
```

---

## Task 11: End-to-End Verification

- [ ] **Step 1: Start backend**

```bash
cd backend && uvicorn app.main:app --reload --port 8000
```

Verify: No import errors, health check responds at `http://localhost:8000/api/v1/health`

- [ ] **Step 2: Start frontend**

```bash
cd frontend && npm run dev
```

- [ ] **Step 3: Test chat widget**

1. Log in to the app
2. Click the blue chat bubble (bottom-right)
3. Click a quickstart prompt
4. Verify the agent responds with data from the system
5. Verify charts render (if agent returns chart data)

- [ ] **Step 4: Test full-screen page**

1. Navigate to `/agent` via sidebar
2. Ask: "目前整體 MP 達成率是多少？"
3. Verify response contains actual numbers from the database
4. Ask: "哪個工廠的覆蓋率最低？"
5. Verify a bar chart renders

- [ ] **Step 5: Test error handling**

1. Set an invalid `CORNING_AI_API_KEY` in `.env`
2. Send a message
3. Verify error message appears: "AI 服務暫時無法使用，請稍後再試"

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat(agent): complete AI Agent feature with chat widget and full-screen page"
```
