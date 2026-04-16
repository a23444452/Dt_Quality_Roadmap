from pydantic import BaseModel


class SolutionMapUpdate(BaseModel):
    status_id: int
    notes: str | None = None
    version: int  # optimistic lock


class BatchUpsertItem(BaseModel):
    solution_id: int
    tank_line_id: int
    status_id: int
    notes: str | None = None


class SolutionMapBatchUpsert(BaseModel):
    updates: list[BatchUpsertItem]
