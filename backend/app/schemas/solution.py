from pydantic import BaseModel


class SolutionCreate(BaseModel):
    defect_type_id: int
    station_id: int
    name: str
    quality_attribute: str | None = None
    description: str | None = None
    is_g_item: bool = False


class SolutionUpdate(BaseModel):
    name: str | None = None
    quality_attribute: str | None = None
    description: str | None = None
    is_g_item: bool | None = None
    is_active: bool | None = None


class SolutionResponse(BaseModel):
    id: int
    defect_type_id: int
    station_id: int
    name: str
    quality_attribute: str | None
    description: str | None
    document_filename: str | None
    document_path: str | None
    is_g_item: bool
    is_active: bool

    model_config = {"from_attributes": True}
