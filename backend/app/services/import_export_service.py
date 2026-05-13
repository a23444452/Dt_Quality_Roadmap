import json
import uuid
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path

from openpyxl import load_workbook
from sqlalchemy.orm import Session

from app.models.defect import DefectType
from app.models.plant import TankLine
from app.models.process import Station
from app.models.solution import Solution
from app.models.solution_map import SolutionMap
from app.models.status_definition import StatusDefinition
from app.utils.excel import (
    generate_list_export,
    generate_matrix_export,
    generate_template as generate_template_excel,
    parse_list_format,
    parse_matrix_format,
    workbook_to_bytes,
)

TEMP_DIR = Path(__file__).resolve().parent.parent.parent / "tmp" / "imports"
IMPORT_TTL_SECONDS = 15 * 60  # 15 minutes


def _ensure_temp_dir() -> None:
    TEMP_DIR.mkdir(parents=True, exist_ok=True)


def _temp_file_path(import_id: str) -> Path:
    return TEMP_DIR / f"{import_id}.json"


def preview_import(db: Session, file_bytes: bytes, format: str) -> dict:
    """Parse Excel, validate, and store parsed data as a temp file.

    Returns a dict containing ImportPreview fields plus import_id.
    """
    _ensure_temp_dir()

    wb = load_workbook(filename=BytesIO(file_bytes), data_only=True)
    if format == "matrix":
        records = parse_matrix_format(wb)
    else:
        records = parse_list_format(wb)

    # Load lookup tables
    statuses_by_code = {s.code.upper(): s for s in db.query(StatusDefinition).all()}
    solutions_by_name = {s.name.lower(): s for s in db.query(Solution).all()}
    defect_types_by_name = {dt.name.lower(): dt for dt in db.query(DefectType).all()}
    stations_by_name = {st.name.lower(): st for st in db.query(Station).all()}
    lines_by_name: dict[str, TankLine] = {}
    for line in db.query(TankLine).all():
        lines_by_name[line.name.lower()] = line

    errors = []
    warnings = []
    valid_records = []
    # Solutions to be auto-created: key=name.lower(), value={name, defect_type_id, station_id}
    new_solutions_map: dict[str, dict] = {}
    # Warn only once per new solution name
    warned_new_solutions: set[str] = set()

    for idx, record in enumerate(records):
        row_num = idx + 2  # 1-based, accounting for header row
        has_error = False

        solution_name = record.get("solution") or ""
        line_name = record.get("line") or ""
        status_code = record.get("status") or ""

        if not solution_name:
            errors.append({"row": row_num, "field": "solution", "message": "Solution name is required"})
            has_error = True

        if not line_name:
            errors.append({"row": row_num, "field": "line", "message": "Line name is required"})
            has_error = True

        if not status_code:
            errors.append({"row": row_num, "field": "status", "message": "Status code is required"})
            has_error = True

        if has_error:
            continue

        solution = solutions_by_name.get(solution_name.lower())
        new_solution_key: str | None = None

        if solution is None:
            # Attempt auto-create: requires valid defect_type and station
            defect_type_name = (record.get("defect_type") or "").strip()
            station_name = (record.get("station") or "").strip()

            if not defect_type_name:
                errors.append({
                    "row": row_num, "field": "defect_type",
                    "message": f"Cannot auto-create solution '{solution_name}': defect_type is empty",
                })
                has_error = True
            if not station_name:
                errors.append({
                    "row": row_num, "field": "station",
                    "message": f"Cannot auto-create solution '{solution_name}': station is empty",
                })
                has_error = True

            dt = defect_types_by_name.get(defect_type_name.lower()) if defect_type_name else None
            st = stations_by_name.get(station_name.lower()) if station_name else None

            if defect_type_name and dt is None:
                errors.append({
                    "row": row_num, "field": "defect_type",
                    "message": f"Cannot auto-create solution '{solution_name}': defect_type '{defect_type_name}' not found",
                })
                has_error = True
            if station_name and st is None:
                errors.append({
                    "row": row_num, "field": "station",
                    "message": f"Cannot auto-create solution '{solution_name}': station '{station_name}' not found",
                })
                has_error = True

            if not has_error:
                new_solution_key = solution_name.lower()
                if new_solution_key not in new_solutions_map:
                    new_solutions_map[new_solution_key] = {
                        "name": solution_name,
                        "defect_type_id": dt.id,  # type: ignore[union-attr]
                        "station_id": st.id,  # type: ignore[union-attr]
                    }
                if new_solution_key not in warned_new_solutions:
                    warnings.append({
                        "row": row_num,
                        "message": f"New solution '{solution_name}' will be auto-created",
                    })
                    warned_new_solutions.add(new_solution_key)

        line = lines_by_name.get(line_name.lower())
        if line is None:
            errors.append({"row": row_num, "field": "line", "message": f"Line not found: '{line_name}'"})
            has_error = True

        status = statuses_by_code.get(status_code.upper())
        if status is None:
            errors.append({"row": row_num, "field": "status", "message": f"Status code not recognized: '{status_code}'"})
            has_error = True

        if has_error:
            continue

        valid_records.append({
            "solution_id": solution.id if solution else None,
            "new_solution_key": new_solution_key,
            "tank_line_id": line.id,  # type: ignore[union-attr]
            "status_id": status.id,  # type: ignore[union-attr]
        })

    # Determine new vs updated (records targeting new solutions are always "new")
    new_count = 0
    updated_count = 0
    for rec in valid_records:
        if rec["solution_id"] is None:
            new_count += 1
            continue
        existing = db.query(SolutionMap).filter(
            SolutionMap.solution_id == rec["solution_id"],
            SolutionMap.tank_line_id == rec["tank_line_id"],
        ).first()
        if existing is None:
            new_count += 1
        else:
            updated_count += 1

    import_id = str(uuid.uuid4())
    temp_data = {
        "import_id": import_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "records": valid_records,
        "new_solutions": new_solutions_map,
    }
    _temp_file_path(import_id).write_text(json.dumps(temp_data))

    return {
        "import_id": import_id,
        "total_rows": len(records),
        "new_records": new_count,
        "updated_records": updated_count,
        "new_solutions": len(new_solutions_map),
        "errors": errors,
        "warnings": warnings,
    }


def confirm_import(db: Session, import_id: str, user_id: int) -> dict | None:
    """Load temp file, validate TTL, upsert records, delete temp file."""
    path = _temp_file_path(import_id)
    if not path.exists():
        return None

    temp_data = json.loads(path.read_text())
    created_at = datetime.fromisoformat(temp_data["created_at"])
    now = datetime.now(timezone.utc)

    # Check TTL
    age_seconds = (now - created_at).total_seconds()
    if age_seconds > IMPORT_TTL_SECONDS:
        path.unlink(missing_ok=True)
        return None

    records = temp_data["records"]
    new_solutions_map: dict[str, dict] = temp_data.get("new_solutions", {})

    # Step 1: create new solutions, build key → id mapping
    new_solution_ids: dict[str, int] = {}
    solutions_created = 0
    for key, info in new_solutions_map.items():
        # Guard against race conditions: someone else may have created this solution
        existing_sol = db.query(Solution).filter(
            Solution.defect_type_id == info["defect_type_id"],
            Solution.station_id == info["station_id"],
            Solution.name == info["name"],
        ).first()
        if existing_sol:
            new_solution_ids[key] = existing_sol.id
            continue

        new_sol = Solution(
            name=info["name"],
            defect_type_id=info["defect_type_id"],
            station_id=info["station_id"],
            created_by=user_id,
            updated_by=user_id,
        )
        db.add(new_sol)
        db.flush()
        new_solution_ids[key] = new_sol.id
        solutions_created += 1

    # Step 2: process SolutionMap records
    created_count = 0
    updated_count = 0
    skipped_count = 0

    for rec in records:
        solution_id = rec.get("solution_id")
        if solution_id is None:
            key = rec.get("new_solution_key")
            if not key or key not in new_solution_ids:
                skipped_count += 1
                continue
            solution_id = new_solution_ids[key]

        existing = db.query(SolutionMap).filter(
            SolutionMap.solution_id == solution_id,
            SolutionMap.tank_line_id == rec["tank_line_id"],
        ).first()

        if existing is None:
            new_entry = SolutionMap(
                solution_id=solution_id,
                tank_line_id=rec["tank_line_id"],
                status_id=rec["status_id"],
                version=1,
                created_by=user_id,
                updated_by=user_id,
            )
            db.add(new_entry)
            created_count += 1
        else:
            if existing.status_id != rec["status_id"]:
                existing.status_id = rec["status_id"]
                existing.version = existing.version + 1
                existing.updated_by = user_id
                updated_count += 1
            else:
                skipped_count += 1

    db.commit()
    path.unlink(missing_ok=True)

    total_imported = created_count + updated_count
    return {
        "imported": total_imported,
        "created": created_count,
        "updated": updated_count,
        "skipped": skipped_count,
        "solutions_created": solutions_created,
    }


def generate_export(
    db: Session,
    format: str,
    process_id: int | None = None,
    plant_id: int | None = None,
) -> bytes:
    """Query solution_map with optional filters and return Excel bytes."""
    from app.models.defect import DefectType
    from app.models.plant import Plant, TankLine
    from app.models.process import Process, Station

    # Build solution_map rows with all needed joins
    query = (
        db.query(SolutionMap, Solution, DefectType, Station, Process, TankLine, Plant)
        .join(Solution, SolutionMap.solution_id == Solution.id)
        .join(DefectType, Solution.defect_type_id == DefectType.id)
        .join(Station, Solution.station_id == Station.id)
        .join(Process, Station.process_id == Process.id)
        .join(TankLine, SolutionMap.tank_line_id == TankLine.id)
        .join(Plant, TankLine.plant_id == Plant.id)
        .join(StatusDefinition, SolutionMap.status_id == StatusDefinition.id)
    )

    if process_id is not None:
        query = query.filter(Process.id == process_id)
    if plant_id is not None:
        query = query.filter(Plant.id == plant_id)

    rows = query.all()

    # Re-fetch statuses to get code
    status_map = {s.id: s.code for s in db.query(StatusDefinition).all()}

    records = []
    mapped_solution_ids: set[int] = set()
    for sm, sol, dtype, sta, proc, line, plant in rows:
        mapped_solution_ids.add(sol.id)
        records.append({
            "solution": sol.name,
            "defect_type": dtype.name,
            "station": sta.name,
            "plant": plant.name,
            "line": line.name,
            "status": status_map.get(sm.status_id, ""),
        })

    # Include active solutions that have no solution_map entry (or none matching
    # the plant filter). Without this, INNER JOIN above would silently drop them.
    unmapped_query = (
        db.query(Solution, DefectType, Station, Process)
        .join(DefectType, Solution.defect_type_id == DefectType.id)
        .join(Station, Solution.station_id == Station.id)
        .join(Process, Station.process_id == Process.id)
        .filter(Solution.is_active == True)  # noqa: E712
    )
    if process_id is not None:
        unmapped_query = unmapped_query.filter(Process.id == process_id)

    for sol, dtype, sta, proc in unmapped_query.all():
        if sol.id in mapped_solution_ids:
            continue
        records.append({
            "solution": sol.name,
            "defect_type": dtype.name,
            "station": sta.name,
            "plant": "",
            "line": "",
            "status": "",
        })

    if format == "matrix":
        # Build lines list for column headers
        lines_query = db.query(TankLine, Plant).join(Plant, TankLine.plant_id == Plant.id)
        if plant_id is not None:
            lines_query = lines_query.filter(Plant.id == plant_id)
        lines = [
            {"id": tl.id, "name": tl.name, "plant": plt.name}
            for tl, plt in lines_query.order_by(Plant.sort_order, TankLine.sort_order).all()
        ]
        wb = generate_matrix_export(records, lines)
    else:
        wb = generate_list_export(records)

    return workbook_to_bytes(wb)


def generate_template(db: Session, format: str) -> bytes:
    """Generate import template with reference data sheets."""
    from app.models.defect import DefectType
    from app.models.process import Process, Station

    # Query solutions with related data
    solutions_query = (
        db.query(Solution, DefectType, Station, Process)
        .join(DefectType, Solution.defect_type_id == DefectType.id)
        .join(Station, Solution.station_id == Station.id)
        .join(Process, Station.process_id == Process.id)
        .filter(Solution.is_active == True)  # noqa: E712
        .order_by(Process.sort_order, Station.sort_order, Solution.name)
    )
    solutions = [
        {
            "name": sol.name,
            "defect_type": dtype.name,
            "station": sta.name,
            "process": proc.name,
        }
        for sol, dtype, sta, proc in solutions_query.all()
    ]

    # Authoritative station/defect_type lists from DB so the dropdowns also
    # include newly-created entries not yet referenced by any Solution.
    all_stations = [
        s.name for s in db.query(Station).filter(Station.is_active == True)  # noqa: E712
        .order_by(Station.sort_order, Station.name).all()
    ]
    all_defect_types = [
        d.name for d in db.query(DefectType).filter(DefectType.is_active == True)  # noqa: E712
        .order_by(DefectType.sort_order, DefectType.name).all()
    ]

    # Query tank/lines with plant info
    from app.models.plant import Plant

    lines_query = (
        db.query(TankLine, Plant)
        .join(Plant, TankLine.plant_id == Plant.id)
        .filter(TankLine.is_active == True)  # noqa: E712
        .order_by(Plant.sort_order, TankLine.sort_order)
    )
    tank_lines = [
        {
            "name": tl.name,
            "plant": plt.name,
            "line_type": tl.line_type,
        }
        for tl, plt in lines_query.all()
    ]

    # Query statuses
    statuses_query = (
        db.query(StatusDefinition)
        .filter(StatusDefinition.is_active == True)  # noqa: E712
        .order_by(StatusDefinition.sort_order)
    )
    statuses = [
        {
            "code": s.code,
            "name": s.name,
        }
        for s in statuses_query.all()
    ]

    return generate_template_excel(
        format, solutions, tank_lines, statuses,
        all_stations=all_stations,
        all_defect_types=all_defect_types,
    )
