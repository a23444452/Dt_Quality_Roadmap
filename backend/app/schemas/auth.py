from typing import Literal

from pydantic import BaseModel, field_validator


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    display_name: str
    plant_ids: list[int] = []
    process_ids: list[int] = []

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain a digit")
        return v


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class PlantInfo(BaseModel):
    id: int
    name: str


class ProcessInfo(BaseModel):
    id: int
    name: str


class UserInfo(BaseModel):
    id: int
    username: str
    display_name: str
    role: str
    plants: list[PlantInfo] = []
    processes: list[ProcessInfo] = []


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserInfo


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class SSOLoginRequest(BaseModel):
    access_token: str


class SSOLoginAuthenticated(BaseModel):
    status: Literal["authenticated"] = "authenticated"
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserInfo


class SSOLoginNeedRegistration(BaseModel):
    status: Literal["need_registration"] = "need_registration"
    username: str
    email: str
    display_name: str


class SSOLoginPendingApproval(BaseModel):
    status: Literal["pending_approval"] = "pending_approval"
    username: str


class SSORegisterRequest(BaseModel):
    access_token: str
    plant_ids: list[int] = []
    process_ids: list[int] = []
