from pydantic import BaseModel


class StatusCreate(BaseModel):
    code: str
    name: str
    description: str | None = None
    color: str
    sort_order: int = 0


class StatusUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    color: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class StatusResponse(BaseModel):
    id: int
    code: str
    name: str
    description: str | None
    color: str
    sort_order: int
    is_active: bool

    model_config = {"from_attributes": True}
