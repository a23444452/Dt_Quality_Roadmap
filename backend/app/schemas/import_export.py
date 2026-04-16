from pydantic import BaseModel


class ImportError(BaseModel):
    row: int
    field: str | None = None
    message: str


class ImportWarning(BaseModel):
    row: int
    message: str


class ImportPreview(BaseModel):
    total_rows: int
    new_records: int
    updated_records: int
    errors: list[ImportError]
    warnings: list[ImportWarning]


class ImportConfirmRequest(BaseModel):
    import_id: str


class ImportResult(BaseModel):
    imported: int
    created: int
    updated: int
    skipped: int
