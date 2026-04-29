import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user, require_role
from app.models.solution import Solution
from app.models.user import User
from app.schemas.common import ok
from app.schemas.solution import SolutionCreate, SolutionResponse, SolutionUpdate

router = APIRouter(prefix="/api/v1/solutions", tags=["solutions"])

# Allowed file extensions for document upload
ALLOWED_EXTENSIONS = {".doc", ".docx", ".pdf", ".xls", ".xlsx", ".csv", ".txt"}
# Upload directory
UPLOAD_DIR = Path("uploads/documents")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.get("")
def list_solutions(
    is_active: bool | None = None,
    defect_type_id: int | None = None,
    station_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Solution)
    if is_active is not None:
        query = query.filter(Solution.is_active == is_active)
    if defect_type_id is not None:
        query = query.filter(Solution.defect_type_id == defect_type_id)
    if station_id is not None:
        query = query.filter(Solution.station_id == station_id)

    items = query.order_by(Solution.sort_order).all()
    return ok([SolutionResponse.model_validate(i).model_dump() for i in items])


@router.get("/{item_id}")
def get_solution(
    item_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    item = db.query(Solution).filter(Solution.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")
    return ok(SolutionResponse.model_validate(item).model_dump())


@router.post("", status_code=201)
def create_solution(
    body: SolutionCreate,
    db: Session = Depends(get_db),
    user=Depends(require_role("editor", "admin")),
):
    item = Solution(**body.model_dump(), created_by=user.id, updated_by=user.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return ok(SolutionResponse.model_validate(item).model_dump())


@router.put("/{item_id}")
def update_solution(
    item_id: int,
    body: SolutionUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_role("editor", "admin")),
):
    item = db.query(Solution).filter(Solution.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)
    item.updated_by = user.id

    db.commit()
    db.refresh(item)
    return ok(SolutionResponse.model_validate(item).model_dump())


@router.delete("/{item_id}")
def delete_solution(
    item_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_role("admin")),
):
    item = db.query(Solution).filter(Solution.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")

    item.is_active = False
    item.updated_by = user.id
    db.commit()
    return ok({"id": item_id, "is_active": False})


@router.post("/{item_id}/document")
def upload_document(
    item_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(require_role("editor", "admin")),
):
    """Upload a document file for a solution."""
    item = db.query(Solution).filter(Solution.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Solution not found")

    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Delete old document if exists
    if item.document_path and os.path.exists(item.document_path):
        try:
            os.remove(item.document_path)
        except OSError:
            pass

    # Generate unique filename
    unique_filename = f"{item_id}_{uuid.uuid4().hex}{file_ext}"
    file_path = UPLOAD_DIR / unique_filename

    # Save file
    with open(file_path, "wb") as buffer:
        content = file.file.read()
        buffer.write(content)

    # Update solution record
    item.document_filename = file.filename
    item.document_path = str(file_path)
    item.updated_by = user.id
    db.commit()
    db.refresh(item)

    return ok({
        "id": item.id,
        "document_filename": item.document_filename,
        "message": "Document uploaded successfully"
    })


@router.get("/{item_id}/document")
def download_document(
    item_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Download the document file for a solution."""
    item = db.query(Solution).filter(Solution.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Solution not found")

    if not item.document_path or not os.path.exists(item.document_path):
        raise HTTPException(status_code=404, detail="Document not found")

    return FileResponse(
        path=item.document_path,
        filename=item.document_filename,
        media_type="application/octet-stream"
    )


@router.delete("/{item_id}/document")
def delete_document(
    item_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_role("editor", "admin")),
):
    """Delete the document file for a solution."""
    item = db.query(Solution).filter(Solution.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Solution not found")

    if item.document_path and os.path.exists(item.document_path):
        try:
            os.remove(item.document_path)
        except OSError:
            pass

    item.document_filename = None
    item.document_path = None
    item.updated_by = user.id
    db.commit()

    return ok({"id": item_id, "message": "Document deleted successfully"})
