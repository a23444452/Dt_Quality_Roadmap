from sqlalchemy.orm import Session

from app.models.defect import DefectCategory, DefectType
from app.models.plant import Plant, TankLine
from app.models.process import Process, Station
from app.models.solution import Solution
from app.models.solution_map import SolutionMap
from app.models.status_definition import StatusDefinition


def get_pivot_data(
    db: Session,
    process_category: str | None = None,
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

    # Filter by process_category
    if process_category:
        if process_category == "System":
            # System: only show solutions where Process='System' AND Station='System'
            query = query.filter(Process.name == "System", Station.name == "System")
        else:
            # Melting/Finishing: filter by process category
            query = query.filter(Process.category == process_category)

    if process_id:
        query = query.filter(Process.id == process_id)
    if station_id:
        query = query.filter(Station.id == station_id)
    if defect_category_id:
        query = query.filter(DefectCategory.id == defect_category_id)

    solutions = query.all()

    # Get lines - filter by line_type based on process_category
    line_query = (
        db.query(TankLine, Plant)
        .join(Plant, TankLine.plant_id == Plant.id)
        .filter(TankLine.is_active == True)  # noqa: E712
    )

    # Filter lines by process_category
    if process_category:
        if process_category == "Melting":
            # Melting: only show Tanks
            line_query = line_query.filter(TankLine.line_type == "Tank")
        elif process_category == "Finishing":
            # Finishing: only show Lines
            line_query = line_query.filter(TankLine.line_type == "Line")
        # System: show all Tanks and Lines (no filter)

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
            "quality_attribute": sol.quality_attribute,
            "defect_type": dtype.name,
            "defect_category": dcat.name,
            "station": sta.name,
            "process": proc.name,
            "statuses": sol_statuses,
        })

    result_lines = [
        {"id": tl.id, "key": f"line_{tl.id}", "name": tl.name, "plant": plt.name, "line_type": tl.line_type}
        for tl, plt in lines
    ]

    # Build filter options for dropdowns
    all_processes = db.query(Process).filter(Process.is_active == True).order_by(Process.sort_order).all()  # noqa: E712

    # Get unique process categories
    process_categories = list(dict.fromkeys([p.category for p in all_processes if p.category]))

    filters = {
        "process_categories": [{"name": cat} for cat in process_categories],
        "processes": [{"id": p.id, "name": p.name, "category": p.category} for p in all_processes],
        "stations": [{"id": s.id, "name": s.name, "process_id": s.process_id} for s in db.query(Station).filter(Station.is_active == True).order_by(Station.sort_order).all()],  # noqa: E712
        "defect_categories": [{"id": c.id, "name": c.name} for c in db.query(DefectCategory).filter(DefectCategory.is_active == True).order_by(DefectCategory.sort_order).all()],  # noqa: E712
        "plants": [{"id": p.id, "name": p.name} for p in db.query(Plant).filter(Plant.is_active == True).order_by(Plant.sort_order).all()],  # noqa: E712
        "statuses": [{"id": s.id, "code": s.code, "name": s.name, "color": s.color} for s in db.query(StatusDefinition).filter(StatusDefinition.is_active == True).order_by(StatusDefinition.sort_order).all()],  # noqa: E712
    }

    return {"solutions": result_solutions, "lines": result_lines, "filters": filters}
