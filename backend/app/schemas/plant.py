from pydantic import BaseModel


class PlantCreate(BaseModel):
    name: str
    code: str
    sort_order: int = 0


class PlantUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class PlantResponse(BaseModel):
    id: int
    name: str
    code: str
    sort_order: int
    is_active: bool

    model_config = {"from_attributes": True}


class TankLineCreate(BaseModel):
    plant_id: int
    name: str
    code: str
    sort_order: int = 0


class TankLineUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class TankLineResponse(BaseModel):
    id: int
    plant_id: int
    name: str
    code: str
    sort_order: int
    is_active: bool

    model_config = {"from_attributes": True}
