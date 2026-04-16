from pydantic import BaseModel


class DefectCategoryCreate(BaseModel):
    name: str
    description: str | None = None
    sort_order: int = 0


class DefectCategoryUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class DefectCategoryResponse(BaseModel):
    id: int
    name: str
    description: str | None
    sort_order: int
    is_active: bool

    model_config = {"from_attributes": True}


class DefectTypeCreate(BaseModel):
    category_id: int
    name: str
    description: str | None = None
    sort_order: int = 0


class DefectTypeUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class DefectTypeResponse(BaseModel):
    id: int
    category_id: int
    name: str
    description: str | None
    sort_order: int
    is_active: bool

    model_config = {"from_attributes": True}
