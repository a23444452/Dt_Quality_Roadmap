from pydantic import BaseModel


class SolutionCreate(BaseModel):
    defect_type_id: int
    station_id: int
    name: str
    description: str | None = None


class SolutionUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None


class SolutionResponse(BaseModel):
    id: int
    defect_type_id: int
    station_id: int
    name: str
    description: str | None
    is_active: bool

    model_config = {"from_attributes": True}
