"""Tests for agent service - verifies structure without calling LLM."""
from app.services.agent_service import build_agent_tools, SYSTEM_PROMPT


def test_system_prompt_contains_strict_rules():
    assert "NEVER make up data" in SYSTEM_PROMPT
    assert "目前系統中沒有相關資料" in SYSTEM_PROMPT


def test_build_agent_tools_returns_correct_count(db_session):
    tools = build_agent_tools(db_session)
    assert len(tools) == 7


def test_build_agent_tools_have_descriptions(db_session):
    tools = build_agent_tools(db_session)
    for tool in tools:
        assert tool.description, f"Tool {tool.name} missing description"
        assert len(tool.description) > 20, f"Tool {tool.name} description too short"


def test_build_agent_tools_names(db_session):
    tools = build_agent_tools(db_session)
    names = {t.name for t in tools}
    expected = {
        "get_dashboard_kpi",
        "get_plant_coverage",
        "get_g_items",
        "get_g_tracking",
        "get_solutions_by_filter",
        "get_solution_map_status",
        "get_process_analysis",
    }
    assert names == expected
