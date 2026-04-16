import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.dependencies import get_db, require_role
from app.models.user import User
from app.schemas.common import ok
from app.schemas.user import UserApproveRequest, UserRejectRequest, UserResponse
from app.utils.security import hash_password

router = APIRouter(prefix="/api/v1/users", tags=["users"])


@router.get("")
def list_users(
    status: str | None = None,
    role: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    query = db.query(User)
    if status:
        query = query.filter(User.status == status)
    if role:
        query = query.filter(User.role == role)

    total = query.count()
    items = query.offset((page - 1) * limit).limit(limit).all()

    return ok(
        [UserResponse.model_validate(u).model_dump() for u in items],
        meta={"total": total, "page": page, "limit": limit},
    )


@router.put("/{user_id}/approve")
def approve_user(
    user_id: int,
    body: UserApproveRequest,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.status = "active"
    user.role = body.role
    db.commit()
    db.refresh(user)
    return ok(UserResponse.model_validate(user).model_dump())


@router.put("/{user_id}/reject")
def reject_user(
    user_id: int,
    body: UserRejectRequest,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.status = "rejected"
    db.commit()
    db.refresh(user)
    return ok(UserResponse.model_validate(user).model_dump())


@router.put("/{user_id}/disable")
def disable_user(
    user_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.status = "disabled"
    db.commit()
    db.refresh(user)
    return ok(UserResponse.model_validate(user).model_dump())


@router.put("/{user_id}/reset-password")
def admin_reset_password(
    user_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    temp_password = "".join(
        secrets.choice(string.ascii_letters + string.digits) for _ in range(12)
    )
    user.password_hash = hash_password(temp_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()

    return ok({"temporary_password": temp_password, "message": "Password has been reset."})
