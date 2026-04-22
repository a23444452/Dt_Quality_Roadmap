from pydantic import BaseModel


class ProcessCreate(BaseModel):
    category: str = ""
    name: str
    description: str | None = None
    sort_order: int = 0


class ProcessUpdate(BaseModel):
    category: str | None = None
    name: str | None = None
    description: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class ProcessResponse(BaseModel):
    id: int
    category: str
    name: str
    description: str | None
    sort_order: int
    is_active: bool

    model_config = {"from_attributes": True}


class StationCreate(BaseModel):
    process_id: int
    name: str
    description: str | None = None
    sort_order: int = 0


class StationUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class StationResponse(BaseModel):
    id: int
    process_id: int
    name: str
    description: str | None
    sort_order: int
    is_active: bool

    model_config = {"from_attributes": True}
