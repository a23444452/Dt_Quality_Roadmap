from pydantic import BaseModel


class SolutionCreate(BaseModel):
    defect_type_id: int
    station_id: int
    name: str
    quality_attribute: str | None = None
    description: str | None = None
    sort_order: int = 0
    is_g_item: bool = False


class SolutionUpdate(BaseModel):
    defect_type_id: int | None = None
    station_id: int | None = None
    name: str | None = None
    quality_attribute: str | None = None
    description: str | None = None
    sort_order: int | None = None
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
    sort_order: int
    is_g_item: bool
    is_active: bool

    model_config = {"from_attributes": True}
