from typing import Any, Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class PaginationMeta(BaseModel):
    total: int
    page: int
    limit: int


class ErrorDetail(BaseModel):
    field: str | None = None
    message: str


class ErrorBody(BaseModel):
    code: str
    message: str
    details: list[ErrorDetail] = []


class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    data: T | None = None
    meta: PaginationMeta | None = None
    error: ErrorBody | None = None


def ok(data: Any, meta: PaginationMeta | None = None) -> dict:
    return {"success": True, "data": data, "meta": meta}


def fail(code: str, message: str, details: list[dict] | None = None) -> dict:
    return {
        "success": False,
        "error": {"code": code, "message": message, "details": details or []},
    }
