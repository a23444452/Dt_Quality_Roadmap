from pydantic import BaseModel, Field


class GTrackingToggle(BaseModel):
    is_g_tracking: bool
    g_complete_date: str | None = None


class MonthlyTargetItem(BaseModel):
    month: int = Field(ge=1, le=12)
    budget: float = Field(ge=0)
    stretch: float = Field(ge=0)


class PlantTargetItem(BaseModel):
    plant_id: int
    budget: int = Field(ge=0)
    stretch: int = Field(ge=0)


class TargetsUpdate(BaseModel):
    year: int
    monthly: list[MonthlyTargetItem] = []
    plants: list[PlantTargetItem] = []
