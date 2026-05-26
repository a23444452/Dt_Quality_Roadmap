"""Pydantic schemas for the G$ Management feature."""
from typing import Literal

from pydantic import BaseModel, Field

ReasonCode = Literal["QI", "FMEA_H_RISK", "OTHER"]


class GItemUpdate(BaseModel):
    """Admin request body for PUT /api/v1/g-items/{id}."""

    reason: ReasonCode | None = None
    remark: str | None = Field(default=None, max_length=1000)


class GItemSolutionMapEntry(BaseModel):
    """One plant × tank-line status cell in the expanded sub-table."""

    plant_id: int
    plant_name: str
    tank_line_id: int
    tank_line_name: str
    status_id: int
    status_code: str
    status_color: str
    solution_map_id: int
    version: int
    is_g_tracking: bool = False
    g_complete_date: str | None = None


class GItemResponse(BaseModel):
    """One row returned by GET /api/v1/g-items."""

    id: int
    name: str
    process: str
    station: str
    quality_attribute: str | None = None
    reason: ReasonCode | None = None
    remark: str | None = None
    solution_map: list[GItemSolutionMapEntry] = []
