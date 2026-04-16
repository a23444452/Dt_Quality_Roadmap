"""
Seed script: populate the database with sample reference data.

Run with:
    cd backend && python -m app.seed
"""

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


def seed() -> None:
    Base.metadata.create_all(engine)
    db = SessionLocal()

    try:
        if db.query(StatusDefinition).count() > 0:
            print("Database already seeded.")
            return

        # ── Statuses ──────────────────────────────────────────────────────────
        statuses = [
            StatusDefinition(code="MP", name="Mass Production", color="#28A745", sort_order=1),
            StatusDefinition(code="DEV", name="Developing", color="#FFC107", sort_order=2),
            StatusDefinition(code="PLAN", name="Planned", color="#17A2B8", sort_order=3),
            StatusDefinition(code="NA", name="Not Applicable", color="#6C757D", sort_order=4),
            StatusDefinition(code="HOLD", name="On Hold", color="#DC3545", sort_order=5),
        ]
        db.add_all(statuses)
        db.flush()

        status_by_code = {s.code: s for s in statuses}

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

        # ── Defect categories & types ─────────────────────────────────────────
        cat_surface = DefectCategory(
            name="Surface",
            description="Surface appearance defects",
            sort_order=1,
        )
        cat_structural = DefectCategory(
            name="Structural",
            description="Internal structural defects",
            sort_order=2,
        )
        cat_dimensional = DefectCategory(
            name="Dimensional",
            description="Out-of-tolerance dimensions",
            sort_order=3,
        )
        db.add_all([cat_surface, cat_structural, cat_dimensional])
        db.flush()

        defect_types = [
            DefectType(category_id=cat_surface.id, name="Scratch", sort_order=1),
            DefectType(category_id=cat_surface.id, name="Pit", sort_order=2),
            DefectType(category_id=cat_surface.id, name="Stain", sort_order=3),
            DefectType(category_id=cat_structural.id, name="Crack", sort_order=1),
            DefectType(category_id=cat_structural.id, name="Porosity", sort_order=2),
            DefectType(category_id=cat_dimensional.id, name="Warpage", sort_order=1),
            DefectType(category_id=cat_dimensional.id, name="Thickness Deviation", sort_order=2),
        ]
        db.add_all(defect_types)
        db.flush()

        dt_scratch = defect_types[0]
        dt_pit = defect_types[1]
        dt_crack = defect_types[3]
        dt_porosity = defect_types[4]

        # ── Processes & stations ──────────────────────────────────────────────
        proc_system = Process(
            name="System",
            description="System-level pre-process",
            sort_order=1,
        )
        proc_melting = Process(
            name="Melting",
            description="Metal melting process",
            sort_order=2,
        )
        proc_finishing = Process(
            name="Finishing",
            description="Surface finishing process",
            sort_order=3,
        )
        db.add_all([proc_system, proc_melting, proc_finishing])
        db.flush()

        stations = [
            Station(process_id=proc_system.id, name="Incoming Inspection", sort_order=1),
            Station(process_id=proc_melting.id, name="Furnace", sort_order=1),
            Station(process_id=proc_melting.id, name="Casting", sort_order=2),
            Station(process_id=proc_finishing.id, name="Polishing", sort_order=1),
            Station(process_id=proc_finishing.id, name="Coating", sort_order=2),
            Station(process_id=proc_finishing.id, name="Final QC", sort_order=3),
        ]
        db.add_all(stations)
        db.flush()

        st_furnace = stations[1]
        st_casting = stations[2]
        st_polishing = stations[3]
        st_coating = stations[4]

        # ── Plants & tank lines ───────────────────────────────────────────────
        plant_a = Plant(name="Plant Alpha", code="PA", sort_order=1)
        plant_b = Plant(name="Plant Beta", code="PB", sort_order=2)
        db.add_all([plant_a, plant_b])
        db.flush()

        tank_lines = [
            TankLine(plant_id=plant_a.id, name="Line A-1", code="A1", sort_order=1),
            TankLine(plant_id=plant_a.id, name="Line A-2", code="A2", sort_order=2),
            TankLine(plant_id=plant_a.id, name="Line A-3", code="A3", sort_order=3),
            TankLine(plant_id=plant_b.id, name="Line B-1", code="B1", sort_order=1),
            TankLine(plant_id=plant_b.id, name="Line B-2", code="B2", sort_order=2),
            TankLine(plant_id=plant_b.id, name="Line B-3", code="B3", sort_order=3),
        ]
        db.add_all(tank_lines)
        db.flush()

        tl_a1, tl_a2, tl_a3, tl_b1, tl_b2, tl_b3 = tank_lines

        # ── Solutions ─────────────────────────────────────────────────────────
        solutions = [
            Solution(
                defect_type_id=dt_scratch.id,
                station_id=st_polishing.id,
                name="Fine Abrasive Polish",
                description="Use 2000-grit abrasive to remove light scratches",
                sort_order=1,
            ),
            Solution(
                defect_type_id=dt_scratch.id,
                station_id=st_coating.id,
                name="Protective Coating",
                description="Apply anti-scratch coating layer",
                sort_order=2,
            ),
            Solution(
                defect_type_id=dt_pit.id,
                station_id=st_polishing.id,
                name="Electropolishing",
                description="Electrochemical polishing to remove micro-pits",
                sort_order=1,
            ),
            Solution(
                defect_type_id=dt_crack.id,
                station_id=st_casting.id,
                name="Slow Cool Cycle",
                description="Reduce thermal gradient by extending cool cycle",
                sort_order=1,
            ),
            Solution(
                defect_type_id=dt_crack.id,
                station_id=st_furnace.id,
                name="Alloy Adjustment",
                description="Adjust Si/Mg ratio to reduce hot-crack susceptibility",
                sort_order=2,
            ),
            Solution(
                defect_type_id=dt_porosity.id,
                station_id=st_furnace.id,
                name="Degassing Treatment",
                description="Rotary degassing to reduce hydrogen content below 0.1 cc/100g",
                sort_order=1,
            ),
            Solution(
                defect_type_id=dt_porosity.id,
                station_id=st_casting.id,
                name="Pressure Casting",
                description="Increase injection pressure to 80 MPa to collapse voids",
                sort_order=2,
            ),
            Solution(
                defect_type_id=dt_porosity.id,
                station_id=st_casting.id,
                name="Vacuum Assist",
                description="Apply vacuum during filling to remove trapped gas",
                sort_order=3,
            ),
        ]
        db.add_all(solutions)
        db.flush()

        sol_polish = solutions[0]
        sol_coat = solutions[1]
        sol_electro = solutions[2]
        sol_slow_cool = solutions[3]
        sol_alloy = solutions[4]
        sol_degas = solutions[5]
        sol_pressure = solutions[6]
        sol_vacuum = solutions[7]

        # ── Solution map entries ───────────────────────────────────────────────
        mp_id = status_by_code["MP"].id
        dev_id = status_by_code["DEV"].id
        plan_id = status_by_code["PLAN"].id
        na_id = status_by_code["NA"].id
        hold_id = status_by_code["HOLD"].id

        solution_maps = [
            # sol_polish across lines
            SolutionMap(solution_id=sol_polish.id, tank_line_id=tl_a1.id, status_id=mp_id),
            SolutionMap(solution_id=sol_polish.id, tank_line_id=tl_a2.id, status_id=dev_id),
            SolutionMap(solution_id=sol_polish.id, tank_line_id=tl_b1.id, status_id=plan_id),
            # sol_coat
            SolutionMap(solution_id=sol_coat.id, tank_line_id=tl_a1.id, status_id=mp_id),
            SolutionMap(solution_id=sol_coat.id, tank_line_id=tl_b2.id, status_id=hold_id),
            # sol_electro
            SolutionMap(solution_id=sol_electro.id, tank_line_id=tl_a3.id, status_id=dev_id),
            SolutionMap(solution_id=sol_electro.id, tank_line_id=tl_b1.id, status_id=plan_id),
            # sol_slow_cool
            SolutionMap(solution_id=sol_slow_cool.id, tank_line_id=tl_a1.id, status_id=mp_id),
            SolutionMap(solution_id=sol_slow_cool.id, tank_line_id=tl_a2.id, status_id=mp_id),
            SolutionMap(solution_id=sol_slow_cool.id, tank_line_id=tl_b1.id, status_id=dev_id),
            # sol_alloy
            SolutionMap(solution_id=sol_alloy.id, tank_line_id=tl_b2.id, status_id=plan_id),
            SolutionMap(solution_id=sol_alloy.id, tank_line_id=tl_b3.id, status_id=na_id),
            # sol_degas
            SolutionMap(solution_id=sol_degas.id, tank_line_id=tl_a1.id, status_id=mp_id),
            SolutionMap(solution_id=sol_degas.id, tank_line_id=tl_a2.id, status_id=mp_id),
            SolutionMap(solution_id=sol_degas.id, tank_line_id=tl_a3.id, status_id=dev_id),
            SolutionMap(solution_id=sol_degas.id, tank_line_id=tl_b1.id, status_id=mp_id),
            # sol_pressure
            SolutionMap(solution_id=sol_pressure.id, tank_line_id=tl_b2.id, status_id=mp_id),
            SolutionMap(solution_id=sol_pressure.id, tank_line_id=tl_b3.id, status_id=dev_id),
            # sol_vacuum
            SolutionMap(solution_id=sol_vacuum.id, tank_line_id=tl_a3.id, status_id=plan_id),
            SolutionMap(solution_id=sol_vacuum.id, tank_line_id=tl_b3.id, status_id=hold_id),
            SolutionMap(solution_id=sol_vacuum.id, tank_line_id=tl_a2.id, status_id=na_id),
        ]
        db.add_all(solution_maps)
        db.commit()
        print("Database seeded successfully!")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
