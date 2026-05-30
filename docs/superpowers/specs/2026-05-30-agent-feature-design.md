# D^t Solution Roadmap AI Agent - Design Spec

## Overview

Add an AI Agent to the D^t Solution Roadmap system that allows users to query system data using natural language, receive data analysis and charts. The Agent strictly answers based on internal system data only — no hallucinations, no external data. When unsure, it responds honestly.

## Architecture

### Mode: ReAct Agent + Custom Tools

Using LangGraph `create_react_agent` with custom Python tools that wrap existing service layer functions. This ensures the Agent can only return real system data.

```
Frontend (React)
├── Chat Widget (floating, bottom-right)
└── Full-screen Agent Page (/agent)
        │
        ▼ POST /api/v1/agent/chat (SSE stream)
        │
Backend (FastAPI)
├── Agent Router
├── LangGraph ReAct Agent (claude-sonnet-4-6 via Corning AI Platform)
└── Custom Tools (wrap existing services)
    ├── get_dashboard_kpi
    ├── get_plant_coverage
    ├── get_g_items_list
    ├── get_g_tracking_progress
    ├── get_solutions_by_filter
    ├── get_solution_map_status
    └── get_process_analysis
```

### AI Engine

- Platform: Corning AI Platform (`https://ai-platform.corning.com`)
- Model: `us.anthropic.claude-sonnet-4-6` (via LiteLLM proxy, OpenAI-compatible)
- Authentication: `CORNING_AI_API_KEY` in backend `.env`
- SDK: `langchain-openai` `ChatOpenAI` with `openai_api_base`

## Backend Design

### New Files

```
backend/app/
├── routers/agent.py          # API endpoints
├── services/agent_service.py # Agent orchestration
├── services/agent_tools.py   # Custom tool definitions
└── models/agent.py           # Conversation model
```

### System Prompt

```text
You are the D^t Solution Roadmap Assistant at Corning Display Technology.
You help users analyze quality solution deployment data.

STRICT RULES:
1. You can ONLY answer questions using data from your available tools.
2. If a tool returns no data or you cannot find the answer, say "目前系統中沒有相關資料" honestly.
3. NEVER make up data, statistics, or percentages.
4. NEVER reference external sources or your training data for domain-specific answers.
5. When suggesting actions, prefix with "建議：" and clarify you cannot execute them.
6. Respond in Traditional Chinese (Taiwan) unless the user writes in English.
7. When data supports visualization, include chart_config in your response for the frontend to render.
8. Keep responses concise and data-driven.
```

### Tools Definition

Each tool wraps existing service functions and returns structured JSON:

#### 1. `get_dashboard_kpi`

```python
@tool
def get_dashboard_kpi(
    plant_id: int | None = None,
    defect_category_id: int | None = None,
) -> str:
    """Get overall KPI summary including total solutions, MP count/percentage,
    developing count, planned count, initiation count, and resource constrain count.
    Use when users ask about overall progress, completion rates, or status distribution.

    Args:
        plant_id: Optional plant ID to filter by specific factory
        defect_category_id: Optional defect category ID to filter

    Returns:
        JSON with kpi data and chart_config for visualization
    """
```

#### 2. `get_plant_coverage`

```python
@tool
def get_plant_coverage() -> str:
    """Get MP coverage percentage for each plant/factory.
    Use when users ask which plant has highest/lowest coverage, plant comparisons,
    or factory performance rankings.

    Returns:
        JSON with per-plant coverage data and bar chart config
    """
```

#### 3. `get_g_items_list`

```python
@tool
def get_g_items_list(
    plant_ids: str | None = None,
    process_ids: str | None = None,
    reasons: str | None = None,
    search: str | None = None,
) -> str:
    """Get G$ (G-dollar) items list with their deployment status across plants.
    Use when users ask about G$ projects, their status, reasons, or want to
    find specific G$ items.

    Args:
        plant_ids: Comma-separated plant IDs to filter
        process_ids: Comma-separated process IDs to filter
        reasons: Comma-separated reason codes (GQI, GQE, UNSPECIFIED)
        search: Search term for solution name

    Returns:
        JSON with G$ items data and table config
    """
```

#### 4. `get_g_tracking_progress`

```python
@tool
def get_g_tracking_progress(year: int | None = None) -> str:
    """Get G$ tracking monthly progress vs budget/stretch targets.
    Use when users ask about G$ completion trends, monthly progress,
    whether we're on track to meet targets, or year-to-date performance.

    Args:
        year: Year to query (defaults to current year)

    Returns:
        JSON with monthly targets, actuals, cumulative data, and line chart config
    """
```

#### 5. `get_solutions_by_filter`

```python
@tool
def get_solutions_by_filter(
    process_id: int | None = None,
    station_id: int | None = None,
    defect_type_id: int | None = None,
    plant_id: int | None = None,
    is_g_item: bool | None = None,
) -> str:
    """Get solutions filtered by process, station, defect type, plant, or G$ status.
    Use when users ask about solutions in a specific area, what solutions exist
    for a process/station, or want details about specific solutions.

    Args:
        process_id: Filter by process (e.g., Melting, Finishing)
        station_id: Filter by station
        defect_type_id: Filter by defect type
        plant_id: Filter by plant
        is_g_item: Filter G$ items only

    Returns:
        JSON with solution list and table config
    """
```

#### 6. `get_solution_map_status`

```python
@tool
def get_solution_map_status(
    plant_id: int | None = None,
    process_id: int | None = None,
) -> str:
    """Get solution deployment status matrix showing which solutions are deployed
    to which tank lines and their current status (MP, Developing, Planned, etc.).
    Use when users ask about deployment progress of specific solutions across lines.

    Args:
        plant_id: Filter by plant
        process_id: Filter by process

    Returns:
        JSON with status distribution data and chart config
    """
```

#### 7. `get_process_analysis`

```python
@tool
def get_process_analysis(plant_id: int | None = None) -> str:
    """Get process analysis showing solution count per station in production flow order.
    Use when users ask about which stations have the most/fewest solutions,
    process coverage, or production flow analysis.

    Args:
        plant_id: Optional plant ID to filter

    Returns:
        JSON with process/station/solution breakdown and bar chart config
    """
```

### Tool Response Format

Every tool returns a JSON string with this structure:

```json
{
  "data": { ... },
  "chart_config": {
    "type": "bar|pie|line|table",
    "title": "Chart title in Chinese",
    "x_field": "field name for x-axis",
    "y_field": "field name for y-axis",
    "series": ["field1", "field2"]
  },
  "summary": "Natural language summary of the data for the Agent to use"
}
```

### API Endpoints

```
POST /api/v1/agent/chat
  Auth: JWT required (any logged-in user)
  Body: { "message": string, "conversation_id": string | null }
  Response: text/event-stream (SSE)
  Events:
    - event: token     data: {"content": "partial text"}
    - event: chart     data: {"chart_config": {...}, "data": [...]}
    - event: done      data: {"conversation_id": "uuid", "suggestions": [...]}
    - event: error     data: {"message": "error description"}

GET /api/v1/agent/conversations
  Auth: JWT required
  Response: [{ id, title, created_at, message_count }]

DELETE /api/v1/agent/conversations/:id
  Auth: JWT required
  Response: 204
```

### Conversation Storage

New SQLAlchemy model:

```python
class AgentConversation(TimestampMixin, Base):
    __tablename__ = "agent_conversation"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    messages: Mapped[str] = mapped_column(Text, nullable=False)  # JSON array
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
```

### Context Window Management

- Store full conversation in DB
- Send only last 10 message pairs (20 messages) to Agent
- Auto-generate conversation title from first user message
- Max message length: 2000 characters (reject longer inputs)

### Rate Limiting

- 20 requests per minute per user (via existing slowapi limiter)
- Prevents abuse of the AI API

## Frontend Design

### Chat Widget Component

Position: Fixed bottom-right corner, always visible when logged in.

States:
- **Collapsed**: Small floating button with AI icon
- **Expanded**: 400px wide x 500px tall chat panel
- **Full-screen**: Navigate to `/agent` page

Features:
- Message input with send button
- Message history (scrollable)
- Typing indicator during SSE stream
- Chart rendering inline (small version)
- "Expand to full page" button
- Quickstart suggestion chips

### Full-screen Agent Page (`/agent`)

Layout:
- Sidebar (left): Conversation history list
- Main area (center): Chat messages with charts
- Charts render at full width when present

### Message Rendering

```typescript
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  charts?: Array<{
    type: 'bar' | 'pie' | 'line' | 'table'
    title: string
    data: any[]
    config: ChartConfig
  }>
  suggestions?: string[]
  timestamp: string
}
```

Chart rendering uses `recharts` (already in project dependencies check needed):
- `BarChart` for comparisons
- `PieChart` for proportions
- `LineChart` for trends
- HTML table for list data

### Quickstart Prompts

Pre-defined suggestions shown when conversation is empty:

- "目前整體 MP 達成率是多少？"
- "哪個工廠的覆蓋率最低？"
- "G$ 項目今年的進度如何？"
- "Melting 製程有哪些 solutions？"
- "各狀態的 solution 數量分佈？"

## Security

1. **Read-only**: Agent tools only execute SELECT queries (no INSERT/UPDATE/DELETE)
2. **JWT auth required**: All agent endpoints require valid JWT token
3. **Rate limiting**: 20 req/min per user
4. **Input sanitization**: Message length capped at 2000 chars
5. **No PII in prompts**: System prompt does not contain sensitive data
6. **API key server-side**: `CORNING_AI_API_KEY` never exposed to frontend

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Corning AI Platform unreachable | Return SSE error event: "AI 服務暫時無法使用，請稍後再試" |
| Tool execution fails | Agent sees error, responds: "查詢失敗，請稍後重試" |
| Token limit exceeded | Trim oldest messages from context, retry |
| Invalid user input | Return 400 with clear error message |
| Rate limit hit | Return 429: "請求過於頻繁，請稍後再試" |

## Dependencies (Backend)

Add to `backend/requirements.txt`:

```
langchain==0.3.27
langchain-openai==0.3.28
langgraph==0.6.2
langchain-core==0.3.72
```

## Dependencies (Frontend)

Check if `recharts` is already installed. If not:

```
npm install recharts
```

## Configuration

Add to `backend/.env`:

```
CORNING_AI_API_KEY=<key from Corning AI Platform>
AGENT_MODEL=us.anthropic.claude-sonnet-4-6
AGENT_MAX_MESSAGES=10
AGENT_RATE_LIMIT=20/minute
```

Add to `backend/app/config.py`:

```python
corning_ai_api_key: str = ""
agent_model: str = "us.anthropic.claude-sonnet-4-6"
agent_max_messages: int = 10
agent_rate_limit: str = "20/minute"
```

## Testing Strategy

1. **Unit tests**: Each tool function returns expected format
2. **Integration tests**: Agent responds correctly to sample queries
3. **Mock tests**: Mock Corning AI Platform responses for CI
4. **Edge cases**: Empty data, no matching results, malformed input

## Future Extensions

- Add RAG agent for document search (solution documents)
- Upgrade to Supervisor if more agent types are needed
- Add export (download chart as PNG/CSV)
- Add agent usage analytics dashboard
