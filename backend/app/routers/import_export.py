import io

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db, require_role
from app.models.user import User
from app.schemas.common import ok
from app.schemas.import_export import ImportConfirmRequest
from app.services.import_export_service import (
    confirm_import,
    generate_export,
    generate_template,
    preview_import,
)

router = APIRouter(prefix="/api/v1/import-export", tags=["import-export"])


@router.post("/import")
async def import_data(
    file: UploadFile = File(...),
    format: str = Form("list"),
    db: Session = Depends(get_db),
    user: User = Depends(require_role("editor", "admin")),
):
    content = await file.read()
    result = preview_import(db, content, format)
    return ok(result)


@router.post("/import/confirm")
def confirm_import_endpoint(
    body: ImportConfirmRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("editor", "admin")),
):
    result = confirm_import(db, body.import_id, user.id)
    if result is None:
        raise HTTPException(status_code=400, detail="Import ID expired or invalid")
    return ok(result)


@router.get("/export")
def export_data(
    format: str = "list",
    process_id: int | None = None,
    plant_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    content = generate_export(db, format, process_id=process_id, plant_id=plant_id)
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=solution_map_export.xlsx"},
    )


@router.get("/template")
def download_template(
    format: str = "list",
    db: Session = Depends(get_db),
):
    content = generate_template(db, format)
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=import_template_{format}.xlsx"},
    )
