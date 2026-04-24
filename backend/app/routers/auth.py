from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.config import settings
from app.dependencies import get_db
from app.middleware.rate_limit import limiter
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    LoginResponse,
    PlantInfo,
    ProcessInfo,
    RegisterRequest,
    ResetPasswordRequest,
    UserInfo,
)
from app.schemas.common import ok
from app.services.auth_service import (
    authenticate_user,
    create_reset_token,
    register_user,
    reset_password,
)
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = authenticate_user(db, body.username, body.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid credentials or inactive account")

    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="strict",
        max_age=settings.jwt_refresh_expiry_days * 86400,
    )

    return ok(
        LoginResponse(
            access_token=access_token,
            expires_in=settings.jwt_expiry_hours * 3600,
            user=UserInfo(
                id=user.id,
                username=user.username,
                display_name=user.display_name,
                role=user.role,
                plants=[PlantInfo(id=p.id, name=p.name) for p in user.plants],
                processes=[ProcessInfo(id=p.id, name=p.name) for p in user.processes],
            ),
        ).model_dump()
    )


@router.post("/register", status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    from sqlalchemy.exc import IntegrityError

    try:
        user = register_user(
            db,
            body.username,
            body.email,
            body.password,
            body.display_name,
            body.plant_ids,
            body.process_ids,
        )
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Username or email already exists")

    return ok(
        {
            "id": user.id,
            "username": user.username,
            "status": user.status,
            "message": "Registration submitted. Awaiting admin approval.",
        }
    )


@router.post("/refresh")
def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
):
    if refresh_token is None:
        raise HTTPException(status_code=401, detail="No refresh token")

    payload = decode_token(refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = int(payload["sub"])
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or user.status != "active":
        raise HTTPException(status_code=401, detail="User not found or inactive")

    access_token = create_access_token(user.id, user.role)

    return ok(
        {
            "access_token": access_token,
            "expires_in": settings.jwt_expiry_hours * 3600,
        }
    )


@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    create_reset_token(db, body.email)
    return ok({"message": "If the email exists, a reset link has been sent."})


@router.post("/reset-password")
def reset_password_endpoint(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    success = reset_password(db, body.token, body.new_password)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    return ok({"message": "Password reset successfully."})
