from io import BytesIO

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill

LIST_HEADERS = ["solution", "defect_type", "station", "plant", "line", "status"]
MATRIX_SOLUTION_COLS = ["solution", "defect_type", "station"]


def _header_row_to_index(ws) -> dict[str, int]:
    """Return a mapping of lowercase header name → 0-based column index."""
    header_row = next(ws.iter_rows(min_row=1, max_row=1, values_only=True))
    return {
        str(cell).strip().lower(): idx
        for idx, cell in enumerate(header_row)
        if cell is not None
    }


def parse_list_format(workbook: Workbook) -> list[dict]:
    """Parse list-format workbook into a list of record dicts."""
    ws = workbook.active
    col_index = _header_row_to_index(ws)

    records = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        # Skip fully empty rows
        if all(cell is None for cell in row):
            continue
        record = {
            "solution": _get_cell(row, col_index, "solution"),
            "defect_type": _get_cell(row, col_index, "defect_type"),
            "station": _get_cell(row, col_index, "station"),
            "plant": _get_cell(row, col_index, "plant"),
            "line": _get_cell(row, col_index, "line"),
            "status": _get_cell(row, col_index, "status"),
        }
        records.append(record)
    return records


def parse_matrix_format(workbook: Workbook) -> list[dict]:
    """Parse matrix-format workbook (solutions as rows, lines as columns) into records."""
    ws = workbook.active
    header_row = list(ws.iter_rows(min_row=1, max_row=1, values_only=True))[0]

    # Find where plant/line columns start (after solution meta columns)
    # Header format: solution | defect_type | station | plant:line | plant:line | ...
    meta_count = 3  # solution, defect_type, station
    line_columns = []
    for idx in range(meta_count, len(header_row)):
        cell_value = header_row[idx]
        if cell_value is None:
            continue
        cell_str = str(cell_value).strip()
        if "|" in cell_str:
            plant_name, line_name = [part.strip() for part in cell_str.split("|", 1)]
            line_columns.append((idx, plant_name, line_name))
        else:
            # Fall back: treat entire header as line name, no plant info
            line_columns.append((idx, None, cell_str))

    records = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        if all(cell is None for cell in row):
            continue

        solution_name = row[0] if len(row) > 0 else None
        defect_type = row[1] if len(row) > 1 else None
        station = row[2] if len(row) > 2 else None

        for col_idx, plant_name, line_name in line_columns:
            if col_idx >= len(row):
                continue
            status_value = row[col_idx]
            if status_value is None:
                continue
            records.append({
                "solution": solution_name,
                "defect_type": defect_type,
                "station": station,
                "plant": plant_name,
                "line": line_name,
                "status": str(status_value).strip() if status_value else None,
            })
    return records


def generate_list_export(data: list[dict]) -> Workbook:
    """Generate a list-format workbook from record dicts."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Solution Map"

    _write_header(ws, LIST_HEADERS)

    for record in data:
        ws.append([
            record.get("solution", ""),
            record.get("defect_type", ""),
            record.get("station", ""),
            record.get("plant", ""),
            record.get("line", ""),
            record.get("status", ""),
        ])

    return wb


def generate_matrix_export(data: list[dict], lines: list[dict]) -> Workbook:
    """
    Generate a matrix-format workbook.

    lines: list of dicts with keys: id, name, plant (used as column headers)
    data: same record dicts as generate_list_export
    """
    wb = Workbook()
    ws = wb.active
    ws.title = "Solution Map"

    # Build header: solution, defect_type, station, then one col per line
    line_headers = [f"{ln['plant']} | {ln['name']}" for ln in lines]
    headers = MATRIX_SOLUTION_COLS + line_headers
    _write_header(ws, headers)

    # Build lookup: (solution_name, station_name) → {line_name: status}
    # Use plant|line as key for uniqueness
    lookup: dict[tuple, dict[str, str]] = {}
    for record in data:
        key = (record.get("solution"), record.get("station"))
        line_key = f"{record.get('plant')} | {record.get('line')}"
        if key not in lookup:
            lookup[key] = {
                "defect_type": record.get("defect_type", ""),
            }
        lookup[key][line_key] = record.get("status", "")

    for (solution_name, station_name), info in lookup.items():
        row = [solution_name, info.get("defect_type", ""), station_name]
        for ln in lines:
            line_key = f"{ln['plant']} | {ln['name']}"
            row.append(info.get(line_key, ""))
        ws.append(row)

    return wb


def generate_template(format: str) -> bytes:
    """Generate an empty template workbook with headers only. Returns bytes."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Template"

    if format == "matrix":
        _write_header(ws, MATRIX_SOLUTION_COLS + ["Plant A | Line 1", "Plant A | Line 2"])
    else:
        _write_header(ws, LIST_HEADERS)

    return _workbook_to_bytes(wb)


def workbook_to_bytes(wb: Workbook) -> bytes:
    return _workbook_to_bytes(wb)


# ─── Internal helpers ─────────────────────────────────────────────────────────

def _get_cell(row: tuple, col_index: dict[str, int], key: str):
    idx = col_index.get(key)
    if idx is None or idx >= len(row):
        return None
    value = row[idx]
    return str(value).strip() if value is not None else None


def _write_header(ws, headers: list[str]) -> None:
    ws.append(headers)
    bold_font = Font(bold=True)
    fill = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
    for cell in ws[1]:
        cell.font = bold_font
        cell.fill = fill


def _workbook_to_bytes(wb: Workbook) -> bytes:
    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.read()
