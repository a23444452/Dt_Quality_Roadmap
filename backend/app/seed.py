"""
Seed script: populate the database with data from Excel file.

Run with:
    cd backend && python -m app.seed
"""

import pandas as pd
from pathlib import Path

from app.database import Base, engine, SessionLocal
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
from app.utils.security import hash_password

EXCEL_FILE = Path(__file__).resolve().parent.parent.parent / "D^t Solution Quality Roadmap.xlsx"


def seed() -> None:
    Base.metadata.create_all(engine)
    db = SessionLocal()

    try:
        if db.query(StatusDefinition).count() > 0:
            print("Database already seeded.")
            return

        print(f"Reading Excel file: {EXCEL_FILE}")
        xlsx = pd.ExcelFile(EXCEL_FILE)

        # ── Statuses ──────────────────────────────────────────────────────────
        df_def = pd.read_excel(xlsx, sheet_name="Definition")
        status_colors = {
            "MP": "#28A745",
            "Developing": "#FFC107",
            "Initiation": "#17A2B8",
            "Planned": "#6F42C1",
            "Resource constrain": "#FD7E14",
            "No intention": "#6C757D",
        }
        statuses = []
        for idx, row in df_def.iterrows():
            status_name = row["Status"]
            if pd.isna(status_name):
                code = "NA"
                name = "Not Applicable"
                color = "#ADB5BD"
            else:
                code = status_name.upper().replace(" ", "_")[:20]
                name = status_name
                color = status_colors.get(status_name, "#6C757D")

            statuses.append(StatusDefinition(
                code=code,
                name=name,
                color=color,
                sort_order=idx + 1,
            ))
        db.add_all(statuses)
        db.flush()
        print(f"  - Added {len(statuses)} statuses")

        status_map = {}
        for s in statuses:
            status_map[s.name] = s
            status_map[s.code] = s

        # ── Admin user ────────────────────────────────────────────────────────
        admin = User(
            username="admin",
            email="admin@company.com",
            password_hash=hash_password("Admin123!"),
            display_name="System Admin",
            role="admin",
            status="active",
        )
        db.add(admin)
        db.flush()
        print("  - Added admin user")

        # ── Defect categories & types ─────────────────────────────────────────
        df_defect = pd.read_excel(xlsx, sheet_name="Defect")
        categories = {}
        defect_types = {}

        for idx, row in df_defect.iterrows():
            cat_name = row["Defect category"]
            type_name = row["Defect type"]

            if pd.isna(cat_name) or pd.isna(type_name):
                continue

            if cat_name not in categories:
                cat = DefectCategory(
                    name=cat_name,
                    sort_order=len(categories) + 1,
                )
                db.add(cat)
                db.flush()
                categories[cat_name] = cat

            dt = DefectType(
                category_id=categories[cat_name].id,
                name=type_name,
                sort_order=len([d for d in defect_types.values() if d.category_id == categories[cat_name].id]) + 1,
            )
            db.add(dt)
            db.flush()
            defect_types[type_name] = dt

        print(f"  - Added {len(categories)} defect categories, {len(defect_types)} defect types")

        # ── Processes & stations ──────────────────────────────────────────────
        df_station = pd.read_excel(xlsx, sheet_name="Station")
        processes = {}
        stations = {}

        for idx, row in df_station.iterrows():
            proc_cat = row["Process category"]
            proc_name = row["Process"]
            sta_name = row["Station"]

            if pd.isna(proc_cat) or pd.isna(sta_name):
                continue

            # Use Process name as key (e.g., "Melting", "Forming", "BOD", "CBW")
            if pd.isna(proc_name):
                proc_name = proc_cat  # Fallback to category if process is empty

            if proc_name not in processes:
                proc = Process(
                    category=proc_cat,  # Process category (Melting, Finishing, System)
                    name=proc_name,     # Process (Melting, Forming, BOD, CBW, INSP, DP, System)
                    sort_order=len(processes) + 1,
                )
                db.add(proc)
                db.flush()
                processes[proc_name] = proc

            sta_key = f"{proc_name}|{sta_name}"
            if sta_key not in stations:
                sta = Station(
                    process_id=processes[proc_name].id,
                    name=sta_name,
                    sort_order=len([s for s in stations.values() if s.process_id == processes[proc_name].id]) + 1,
                )
                db.add(sta)
                db.flush()
                stations[sta_key] = sta

        print(f"  - Added {len(processes)} processes, {len(stations)} stations")

        # ── Plants & tank lines ───────────────────────────────────────────────
        df_tankline = pd.read_excel(xlsx, sheet_name="Tank_Line")
        plants = {}
        tank_lines = {}

        for idx, row in df_tankline.iterrows():
            plant_code = row["Plant"]
            line_type = row["Line/Tank"]
            line_code = row["No"]

            if pd.isna(plant_code) or pd.isna(line_code):
                continue

            if plant_code not in plants:
                plant = Plant(
                    name=f"Plant {plant_code}",
                    code=plant_code,
                    sort_order=len(plants) + 1,
                )
                db.add(plant)
                db.flush()
                plants[plant_code] = plant

            tl = TankLine(
                plant_id=plants[plant_code].id,
                name=line_code,
                code=line_code,
                line_type=line_type,
                sort_order=len([t for t in tank_lines.values() if t.plant_id == plants[plant_code].id]) + 1,
            )
            db.add(tl)
            db.flush()
            tank_lines[line_code] = tl

        print(f"  - Added {len(plants)} plants, {len(tank_lines)} tank/lines")

        # ── Solutions ─────────────────────────────────────────────────────────
        df_solution = pd.read_excel(xlsx, sheet_name="Dt_Solution")
        solutions = {}

        default_defect_type = list(defect_types.values())[0] if defect_types else None

        for idx, row in df_solution.iterrows():
            proc_cat = row["Process category"]
            proc_name = row["Process"]
            sta_name = row["Station"]
            sol_name = row["D^t Solution"]
            qual_attr = row.get("Quality Attribute", None)
            desc = row.get("Description", None)

            if pd.isna(sol_name):
                continue

            # Use Process name for station lookup (matches how we stored it)
            if pd.isna(proc_name):
                proc_name = proc_cat
            sta_key = f"{proc_name}|{sta_name}"
            station = stations.get(sta_key)
            if not station:
                continue

            defect_type = None
            if not pd.isna(qual_attr):
                for dt_name, dt in defect_types.items():
                    if dt_name.lower() in str(qual_attr).lower():
                        defect_type = dt
                        break
            if not defect_type:
                defect_type = default_defect_type

            sol = Solution(
                defect_type_id=defect_type.id if defect_type else 1,
                station_id=station.id,
                name=sol_name,
                quality_attribute=str(qual_attr) if not pd.isna(qual_attr) else None,
                description=str(desc) if not pd.isna(desc) else None,
                sort_order=idx + 1,
            )
            db.add(sol)
            db.flush()
            solutions[f"{proc_name}|{sta_name}|{sol_name}"] = sol

        print(f"  - Added {len(solutions)} solutions")

        # ── Solution map entries (Melting) ────────────────────────────────────
        df_melting = pd.read_excel(xlsx, sheet_name="Melting")
        map_count = 0

        for idx, row in df_melting.iterrows():
            proc_cat = row["Process category"]
            proc_name = row["Process"]
            sta_name = row["Station"]
            sol_name = row["D^t Solution"]

            if pd.isna(proc_name):
                proc_name = proc_cat
            sol_key = f"{proc_name}|{sta_name}|{sol_name}"
            solution = solutions.get(sol_key)
            if not solution:
                continue

            for col in df_melting.columns[4:]:
                status_val = row[col]
                if pd.isna(status_val):
                    continue

                tank_line = tank_lines.get(col)
                if not tank_line:
                    continue

                status = status_map.get(status_val)
                if not status:
                    continue

                sm = SolutionMap(
                    solution_id=solution.id,
                    tank_line_id=tank_line.id,
                    status_id=status.id,
                    version=1,
                )
                db.add(sm)
                map_count += 1

        print(f"  - Added {map_count} solution map entries (Melting)")

        # ── Solution map entries (Finishing) ──────────────────────────────────
        df_finishing = pd.read_excel(xlsx, sheet_name="Finishing")
        finish_count = 0

        for idx, row in df_finishing.iterrows():
            proc_cat = row["Process category"]
            proc_name = row["Process"]
            sta_name = row["Station"]
            sol_name = row["D^t Solution"]

            if pd.isna(proc_name):
                proc_name = proc_cat
            sol_key = f"{proc_name}|{sta_name}|{sol_name}"
            solution = solutions.get(sol_key)
            if not solution:
                continue

            for col in df_finishing.columns[4:]:
                status_val = row[col]
                if pd.isna(status_val):
                    continue

                tank_line = tank_lines.get(col)
                if not tank_line:
                    continue

                status = status_map.get(status_val)
                if not status:
                    continue

                existing = db.query(SolutionMap).filter(
                    SolutionMap.solution_id == solution.id,
                    SolutionMap.tank_line_id == tank_line.id,
                ).first()
                if existing:
                    continue

                sm = SolutionMap(
                    solution_id=solution.id,
                    tank_line_id=tank_line.id,
                    status_id=status.id,
                    version=1,
                )
                db.add(sm)
                finish_count += 1

        print(f"  - Added {finish_count} solution map entries (Finishing)")

        db.commit()
        print("\nDatabase seeded successfully!")
        print(f"  Total: {len(statuses)} statuses, {len(plants)} plants, {len(tank_lines)} tank/lines,")
        print(f"         {len(categories)} defect categories, {len(defect_types)} defect types,")
        print(f"         {len(processes)} processes, {len(stations)} stations,")
        print(f"         {len(solutions)} solutions, {map_count + finish_count} solution maps")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
