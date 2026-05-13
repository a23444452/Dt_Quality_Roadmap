# G$ Management — Design Spec

**Date:** 2026-05-13
**Status:** Approved
**Area:** Admin / Data Management

## Summary

Add a dedicated **G$ Management** page under Data Management in the sidebar. It lists every Solution whose `is_g_item=True` flag is set, lets Admins record a Reason and Remark on each one, and lets Admins/Editors inspect (and edit) the per-plant × tank-line status of those solutions without leaving the page. The existing Data Management G$ Item checkbox stays the single source of truth for membership; toggling it adds/removes rows from this page.

## Goals

- Give Admins a focused view of the G$ subset of Solutions
- Capture **Reason** (`QI` / `FMEA H-risk` / `Other`) and free-form **Remark** per G$ item
- Let users see (and edit) each G$ item's Solution Map coverage in one expandable row
- Keep existing Data Management and Solution Map behavior untouched

## Non-Goals

- Excel export of G$ Management (deferred)
- History / versioning of Reason changes
- Email notifications on G$ membership changes
- Approval workflow for becoming a G$ item
- Displaying `reason`/`remark` in the Data Management SolutionTab

## Permissions

| Action | Admin | Editor | Viewer |
|---|---|---|---|
| See "G$ Management" sidebar item | ✅ | ✅ | ❌ |
| View G$ list | ✅ | ✅ | ❌ |
| Toggle `is_g_item` in Data Management | ✅ | ❌ | ❌ |
| Edit Reason / Remark | ✅ | ❌ (read-only) | ❌ |
| Edit Solution Map status in expanded row | ✅ (all) | ✅ (within own plant/process scope) | ❌ |

Status-editing rules mirror the existing Solution Map page: the per-cell scope check is identical.

---

## 1. Data Model

Two nullable columns added to the existing `solution` table. No new tables.

```python
# app/models/solution.py — appended fields
reason: Mapped[str | None] = mapped_column(String(20), nullable=True)
remark: Mapped[str | None] = mapped_column(String(1000), nullable=True)
```

- `reason` stores one of the string codes `QI`, `FMEA_H_RISK`, `OTHER`, or `NULL`. Validation is done at the Pydantic layer via `Literal`; no SQL-level enum, so adding future values needs only a schema change.
- `remark` is free-form text up to 1000 characters.

### Lifecycle

Un-checking `is_g_item` does **not** clear `reason` / `remark`. The G$ Management page filters on `is_g_item=True AND is_active=True`, so un-checking hides the row while preserving data for a future re-check. This protects admins from accidental data loss when toggling.

### Alembic migration

New migration `add_reason_remark_to_solution.py` (Alembic auto-generates the revision id prefix):

- Upgrade: `op.add_column('solution', sa.Column('reason', sa.String(20), nullable=True))` and same for `remark` (length 1000).
- Downgrade: `op.drop_column('solution', 'remark')` then `'reason'`.

**Deployment note:** migration must run before the new backend code starts, otherwise `GET /g-items` throws a column-missing error.

---

## 2. Backend API

Two new endpoints. Status editing inside the expanded row reuses existing `/solution-map/{id}`.

### New files

- `backend/app/routers/g_items.py`
- `backend/app/schemas/g_item.py`
- `backend/app/services/g_item_service.py`
- `backend/app/main.py` — include the new router

### `GET /api/v1/g-items` — list

Requires `role in ("editor", "admin")`.

**Query params:**

| Name | Type | Notes |
|---|---|---|
| `plant_ids` | `list[int]` | Repeatable; keep solutions that have a `solution_map` row in any of these plants |
| `process_ids` | `list[int]` | Filter via `Station.process_id` |
| `reasons` | `list[str]` | Values: `QI`, `FMEA_H_RISK`, `OTHER`, `UNSPECIFIED` (where `UNSPECIFIED` maps to `reason IS NULL`) |
| `search` | `str \| None` | `ILIKE %search%` on `Solution.name` |
| `page` | `int` | Default 1, `ge=1` |
| `limit` | `int` | Default 50, `le=100` |

Always enforces `is_g_item=True AND is_active=True`.

**Response shape:**

```json
{
  "success": true,
  "meta": { "total": 17, "page": 1, "limit": 50 },
  "data": [
    {
      "id": 42,
      "name": "Anti-Bubble Spray",
      "process": "Finishing",
      "station": "Coating",
      "quality_attribute": "Bubble Control",
      "reason": "QI",
      "remark": "High-impact quality issue",
      "solution_map": [
        {
          "plant_id": 1,
          "plant_name": "Plant Alpha",
          "tank_line_id": 5,
          "tank_line_name": "Line A-1",
          "status_id": 1,
          "status_code": "MP",
          "status_color": "#28A745",
          "solution_map_id": 123,
          "version": 2
        }
      ]
    }
  ]
}
```

- `solution_map` only contains tank/lines that already have a status set. Solutions with no status anywhere get `solution_map: []`.
- `solution_map_id` + `version` are carried so the front-end can drive existing optimistic-lock updates without refetching.

### `PUT /api/v1/g-items/{solution_id}` — update reason/remark

Requires `role == "admin"`.

**Body:**

```json
{ "reason": "QI" | "FMEA_H_RISK" | "OTHER" | null,
  "remark": "..." | null }
```

- Only explicitly-sent fields are updated (`model_dump(exclude_unset=True)`).
- `reason=null` or `remark=null` (and `remark=""`, normalised to NULL) clears the field.
- 404 when the solution id does not exist.
- 400 `"Solution is not a G$ item"` when `is_g_item=False`.
- Sets `Solution.updated_by` to the acting admin; `updated_at` handled by `TimestampMixin`.
- Response shape matches a single list item above (same structure).

### Status editing reuses existing endpoints

The expanded sub-table posts to `PUT /api/v1/solution-map/{id}` with the `version` from the list payload. No backend change required for this path.

---

## 3. Frontend UI

### Routing + Sidebar

- `frontend/src/App.tsx` adds `<Route path="admin/g-items" element={<GItemsPage />} />` alongside the other `admin/...` routes.
- `frontend/src/components/layout/Sidebar.tsx` inserts a `NavItem` **immediately below "Data Management"**:
  ```ts
  { label: 'G$ Management', icon: DollarSign, to: '/admin/g-items' }
  ```
  Shown only when `user.role in ('admin', 'editor')`.

### New files

```
frontend/src/features/g-items/
  GItemsPage.tsx            // page shell: filter + table + pagination
  GItemsFilterBar.tsx       // plant/process/reason multi-selects + search
  GItemsTable.tsx           // main table with expandable rows
  GItemRowExpanded.tsx      // per-row pivot sub-table (plant × tank_line)
  GItemEditDialog.tsx       // admin-only dialog to edit reason/remark
  useGItems.ts              // React Query hook for list + update mutations
  types.ts                  // TypeScript shapes matching API
```

### Page layout (`GItemsPage.tsx`)

```
┌──────────────────────────────────────────────────────────────┐
│ G$ Management                                                │
│ Manage G-dollar items and their coverage                     │
├──────────────────────────────────────────────────────────────┤
│ [Plants ▾] [Process ▾] [Reason ▾] [🔍 Search]  [Clear]       │
├──────────────────────────────────────────────────────────────┤
│ ▸ | Solution | Process | Station | QA | Reason | Remark | ⋯  │
│ ▾ | ...      | ...     | ...     | .. | QI     | ...    |Edit│
│   ┌─ Expanded pivot ────────────────────────────────────┐    │
│   │ Plant \ Line │ A-1 │ A-2 │ B-1 │ ...                │    │
│   │ Plant Alpha  │ MP  │ DEV │ —   │                    │    │
│   └─────────────────────────────────────────────────────┘    │
├──────────────────────────────────────────────────────────────┤
│ Previous   1 2 3   Next              17 G$ items total       │
└──────────────────────────────────────────────────────────────┘
```

### Main table columns (`GItemsTable.tsx`)

| Column | Display | Editable |
|---|---|---|
| ▸/▾ | Expand toggle | — |
| Solution | text | read-only |
| Process | text | read-only |
| Station | text | read-only |
| Quality Attribute | text | read-only |
| Reason | Badge (`QI` / `FMEA H-risk` / `Other` / `—`) | via Edit dialog (admin) |
| Remark | Truncated text + tooltip on hover | via Edit dialog (admin) |
| Actions | `Edit` button | admin only — hidden for editor |

### Expanded sub-table (`GItemRowExpanded.tsx`)

- Pivot where rows are Plants that appear in the solution's `solution_map[]` and columns are each plant's tank/lines.
- Cells reuse the Solution Map colour palette (lookup `status_color`) with the `status_code` label.
- Cell click behavior:
  - **Admin:** open the existing `StatusCellEditor` component, submit via `PUT /api/v1/solution-map/{id}` carrying `version`.
  - **Editor:** `canEditCell(plant_id, process_id)` checks `user.plants` and `user.processes`; if allowed, same flow; if not, the cell is non-interactive with a tooltip `"Out of your permission scope"`.
- 409 Conflict → toast `"Someone else updated this cell. Reload and try again."` and invalidate the query.
- Empty state: `"No solution map entries yet."`

### Edit dialog (`GItemEditDialog.tsx`)

- Title: `Edit G$ Item — {solution.name}`
- Body:
  - `Select` for Reason (options: Unspecified / QI / FMEA H-risk / Other)
  - `Textarea` for Remark (4 rows, `maxLength=1000`, with a live character count)
- Footer: `Cancel` / `Save`
- `Save` → `PUT /api/v1/g-items/{id}`; on success toast confirmation and `queryClient.invalidateQueries({ queryKey: ['g-items'] })`.

### Filter bar (`GItemsFilterBar.tsx`)

- Plants: multi-select (reuse the checkbox-in-popover pattern already used in RegisterPage/AD dialog)
- Processes: multi-select
- Reason: multi-select over `Unspecified`, `QI`, `FMEA H-risk`, `Other`
- Search: debounce 300 ms before firing the query

### React Query keys

```
['g-items', { plant_ids, process_ids, reasons, search, page }]
```

- `PUT /g-items/{id}` success → invalidate `['g-items']`
- Status cell success → invalidate both `['g-items']` and `['solution-map']` so Solution Map stays consistent

---

## 4. Validation & Security

### Pydantic

```python
class GItemUpdate(BaseModel):
    reason: Literal["QI", "FMEA_H_RISK", "OTHER"] | None = None
    remark: str | None = Field(default=None, max_length=1000)
```

- `reason` anything else → 422.
- `remark` > 1000 chars → 422.
- Partial updates via `model_dump(exclude_unset=True)`.

### Backend guards

- `GET /g-items` enforces `Solution.is_active == True AND Solution.is_g_item == True`.
- `PUT /g-items/{id}` 400s when `is_g_item == False`.
- Query param `reasons` with any value outside `{QI, FMEA_H_RISK, OTHER, UNSPECIFIED}` → 422.

### Front-end guards

- Admin-only UI (`Edit` button, dialog trigger) never renders for non-admins.
- Cell-edit gate mirrors the Solution Map page: same util `canEditCell` (extract to `features/g-items/permissions.ts` or reuse whatever Solution Map uses today).

### Auditing

`Solution.updated_by` / `updated_at` are touched on `PUT /g-items/{id}`. Solution Map status edits continue to hit the existing audit log. No new audit table.

### Rate limiting

Not applied. These endpoints are low-frequency admin operations, not auth-sensitive. Revisit only if abuse appears.

---

## 5. Testing Strategy

### Backend (`backend/tests/test_g_items.py`, new file)

Schema validation:

- `reason` outside enum → 422
- `remark` > 1000 chars → 422
- Both fields allow `null`

`GET /api/v1/g-items`:

- Admin / Editor 200; Viewer 403
- Only returns solutions where `is_g_item=True` and `is_active=True`
- `plant_ids` keeps only solutions with a `solution_map` entry in those plants
- `process_ids` filters through `Station.process_id`
- `reasons=[UNSPECIFIED]` returns rows with `reason IS NULL`
- `search` matches case-insensitively on `Solution.name`
- Pagination: `meta.total` is correct; `page=2` returns rows 51–100
- A solution with no `solution_map` row still appears in the list with `solution_map: []`

`PUT /api/v1/g-items/{id}`:

- Admin 200; Editor 403; Viewer 403
- `is_g_item=False` → 400 with the fixed message
- Unknown id → 404
- Partial update: sending only `reason` leaves `remark` untouched, and vice versa
- `reason=null` and `remark=""` both persist as SQL NULL
- `Solution.updated_by` is set to the acting admin's id

### Front-end

The existing project does not maintain a front-end unit-test suite for feature pages. Follow the same pattern: **no new unit tests**, but every change must pass `npx tsc --noEmit` clean.

Mandatory manual checklist (also recorded in the commit message):

1. Admin logs in → in Data Management SolutionTab, checks G$ Item → the solution appears on G$ Management.
2. Uncheck → row vanishes; a DB spot check confirms `reason` / `remark` are still present.
3. Admin opens Edit dialog, sets Reason=`QI` and a remark → list reflects the change immediately.
4. Editor logs in → G$ Management is reachable but the Edit button is absent.
5. Expand a row → pivot renders each plant × tank/line; admin changes a cell → Solution Map page updates accordingly.
6. Editor clicks a cell outside their plant/process scope → tooltip blocks editing.
7. Combined filter / search sanity: plant + process + reason + keyword all narrow results.
8. Optimistic lock: two browser tabs modify the same cell → the second attempt gets a 409 and the UI prompts retry.

### Regression surface

- `is_g_item` toggle keeps using `PUT /api/v1/solutions/{id}` — unchanged.
- Solution Map page is untouched.
- Alembic migration is mandatory before deploy; the downgrade path is exercised in a local test run.

---

## Open questions

None. All points addressed during brainstorming.

## Deferred

- Excel export of the G$ list
- History / versioning of Reason changes
- Email notifications on Reason / remark edits
- Approval workflow for flagging a solution as G$
- Showing Reason / Remark in the Data Management SolutionTab
