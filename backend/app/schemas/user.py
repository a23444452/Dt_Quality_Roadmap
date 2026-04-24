from pydantic import BaseModel


class PlantRef(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class ProcessRef(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    display_name: str
    role: str
    status: str
    plants: list[PlantRef] = []
    processes: list[ProcessRef] = []

    model_config = {"from_attributes": True}


class UserApproveRequest(BaseModel):
    role: str = "viewer"
    plant_ids: list[int] | None = None
    process_ids: list[int] | None = None


class UserRejectRequest(BaseModel):
    reason: str | None = None


class UserUpdateRequest(BaseModel):
    role: str | None = None
    plant_ids: list[int] | None = None
    process_ids: list[int] | None = None
