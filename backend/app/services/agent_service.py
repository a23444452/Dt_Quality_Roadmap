"""Agent service: builds and invokes the LangGraph ReAct agent."""
import json
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


def get_llm() -> ChatOpenAI:
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
