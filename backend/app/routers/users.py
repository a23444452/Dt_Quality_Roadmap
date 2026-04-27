import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.dependencies import get_db, require_role
from app.models.plant import Plant
from app.models.process import Process
from app.models.user import User
from app.schemas.common import ok
from app.schemas.user import UserApproveRequest, UserRejectRequest, UserResponse, UserUpdateRequest
from app.utils.email import send_user_approved_notification, send_user_rejected_notification
from app.utils.security import hash_password

router = APIRouter(prefix="/api/v1/users", tags=["users"])


@router.get("/pending-count")
def get_pending_count(
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    """Get the count of users with pending status (awaiting approval)."""
    count = db.query(User).filter(User.status == "pending").count()
    return ok({"count": count})


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


@router.get("/{user_id}")
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return ok(UserResponse.model_validate(user).model_dump())


@router.put("/{user_id}")
def update_user(
    user_id: int,
    body: UserUpdateRequest,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if body.role is not None:
        user.role = body.role

    if body.plant_ids is not None:
        plants = db.query(Plant).filter(Plant.id.in_(body.plant_ids)).all()
        user.plants = plants

    if body.process_ids is not None:
        processes = db.query(Process).filter(Process.id.in_(body.process_ids)).all()
        user.processes = processes

    db.commit()
    db.refresh(user)
    return ok(UserResponse.model_validate(user).model_dump())


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

    # Update plants if provided (otherwise keep what user selected during registration)
    if body.plant_ids is not None:
        plants = db.query(Plant).filter(Plant.id.in_(body.plant_ids)).all()
        user.plants = plants

    # Update processes if provided (otherwise keep what user selected during registration)
    if body.process_ids is not None:
        processes = db.query(Process).filter(Process.id.in_(body.process_ids)).all()
        user.processes = processes

    db.commit()
    db.refresh(user)

    # Send approval notification to user
    if user.email:
        send_user_approved_notification(
            user_email=user.email,
            username=user.username,
            display_name=user.display_name,
        )

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

    # Send rejection notification to user
    if user.email:
        send_user_rejected_notification(
            user_email=user.email,
            username=user.username,
            display_name=user.display_name,
            reason=body.reason,
        )

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

    # Release username and email by appending suffix (allows re-registration)
    disabled_suffix = f"_disabled_{user.id}"
    if not user.username.endswith(disabled_suffix):
        user.username = f"{user.username}{disabled_suffix}"
    if not user.email.endswith(disabled_suffix):
        user.email = f"{user.email}{disabled_suffix}"

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
