from pydantic import BaseModel


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    display_name: str
    role: str
    status: str

    model_config = {"from_attributes": True}


class UserApproveRequest(BaseModel):
    role: str = "viewer"


class UserRejectRequest(BaseModel):
    reason: str | None = None
