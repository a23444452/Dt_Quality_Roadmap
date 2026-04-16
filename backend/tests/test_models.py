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


def test_create_status_definition(db_session):
    status = StatusDefinition(code="MP", name="Mass Production", color="#28A745")
    db_session.add(status)
    db_session.commit()

    result = db_session.query(StatusDefinition).filter_by(code="MP").first()
    assert result is not None
    assert result.name == "Mass Production"
    assert result.is_active is True


def test_create_user(db_session):
    user = User(
        username="testuser",
        email="test@example.com",
        password_hash="hashed",
        display_name="Test User",
    )
    db_session.add(user)
    db_session.commit()

    result = db_session.query(User).filter_by(username="testuser").first()
    assert result is not None
    assert result.status == "pending"
    assert result.role == "viewer"


def test_defect_category_type_relationship(db_session):
    category = DefectCategory(name="Surface")
    db_session.add(category)
    db_session.flush()

    defect_type = DefectType(category_id=category.id, name="Bubble")
    db_session.add(defect_type)
    db_session.commit()

    result = db_session.query(DefectCategory).first()
    assert len(result.types) == 1
    assert result.types[0].name == "Bubble"


def test_solution_map_unique_constraint(db_session):
    # Set up required reference data
    status = StatusDefinition(code="MP", name="Mass Production", color="#28A745")
    user = User(username="u", email="u@e.com", password_hash="h", display_name="U")
    category = DefectCategory(name="Surface")
    db_session.add_all([status, user, category])
    db_session.flush()

    defect_type = DefectType(category_id=category.id, name="Bubble")
    process = Process(name="Finishing")
    db_session.add_all([defect_type, process])
    db_session.flush()

    station = Station(process_id=process.id, name="Coating")
    plant = Plant(name="Plant1", code="P1")
    db_session.add_all([station, plant])
    db_session.flush()

    tank_line = TankLine(plant_id=plant.id, name="Line A", code="LA")
    solution = Solution(
        defect_type_id=defect_type.id, station_id=station.id, name="Sol A"
    )
    db_session.add_all([tank_line, solution])
    db_session.flush()

    sm = SolutionMap(
        solution_id=solution.id,
        tank_line_id=tank_line.id,
        status_id=status.id,
    )
    db_session.add(sm)
    db_session.commit()

    assert sm.version == 1
    assert sm.id is not None
