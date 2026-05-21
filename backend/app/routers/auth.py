from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.dependencies import get_db
from app.middleware.rate_limit import limiter
from app.models.plant import Plant
from app.models.process import Process
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    LoginResponse,
    PlantInfo,
    ProcessInfo,
    RegisterRequest,
    ResetPasswordRequest,
    SSOLoginAuthenticated,
    SSOLoginNeedRegistration,
    SSOLoginPendingApproval,
    SSOLoginRequest,
    SSORegisterRequest,
    UserInfo,
)
from app.schemas.common import ok
from app.services.auth_service import (
    authenticate_user,
    create_reset_token,
    register_user,
    reset_password,
)
from app.utils.azure_ad import AzureADTokenError, verify_azure_access_token, verify_azure_id_token
from app.utils.ldap_validation import check_ad_group_membership
from app.utils.email import send_new_user_registration_notification
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

    if settings.admin_notification_emails:
        admin_emails = [e.strip() for e in settings.admin_notification_emails.split(",") if e.strip()]
    else:
        admin_emails = [
            u.email
            for u in db.query(User).filter(User.role == "admin", User.status == "active").all()
            if u.email
        ]
    if admin_emails:
        send_new_user_registration_notification(
            admin_emails=admin_emails,
            username=user.username,
            display_name=user.display_name,
            email=user.email,
        )

    return ok(
        {
            "id": user.id,
            "username": user.username,
            "status": user.status,
            "message": "Registration submitted. Awaiting admin approval.",
        }
    )


def _issue_tokens(user: User, response: Response) -> LoginResponse:
    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="strict",
        max_age=settings.jwt_refresh_expiry_days * 86400,
    )
    return LoginResponse(
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
    )


@router.post("/sso-login")
@limiter.limit("10/minute")
def sso_login(
    request: Request,
    body: SSOLoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    try:
        claims = verify_azure_access_token(body.access_token)
    except AzureADTokenError as exc:
        status = 503 if "try again" in str(exc) else 401
        raise HTTPException(status_code=status, detail=str(exc))

    username = claims["upn"].split("@")[0].lower()

    if not check_ad_group_membership(username, settings.ad_required_group):
        raise HTTPException(
            status_code=403,
            detail=f"Access denied. You are not a member of the '{settings.ad_required_group}' AD group.",
        )

    user = db.query(User).filter(func.lower(User.username) == username).first()

    if user is None:
        return ok(
            SSOLoginNeedRegistration(
                username=username,
                email=claims.get("email", claims.get("upn", "")),
                display_name=claims.get("name", ""),
            ).model_dump()
        )
    if user.status == "pending":
        return ok(SSOLoginPendingApproval(username=username).model_dump())
    if user.status != "active":
        raise HTTPException(status_code=403, detail="Account is inactive. Contact an administrator.")

    login_payload = _issue_tokens(user, response)
    return ok(
        SSOLoginAuthenticated(
            access_token=login_payload.access_token,
            expires_in=login_payload.expires_in,
            user=login_payload.user,
        ).model_dump()
    )


@router.post("/sso-register", status_code=201)
@limiter.limit("3/minute")
def sso_register(request: Request, body: SSORegisterRequest, db: Session = Depends(get_db)):
    from sqlalchemy.exc import IntegrityError

    try:
        claims = verify_azure_access_token(body.access_token)
    except AzureADTokenError as exc:
        status = 503 if "try again" in str(exc) else 401
        raise HTTPException(status_code=status, detail=str(exc))

    username = claims["upn"].split("@")[0].lower()

    if not check_ad_group_membership(username, settings.ad_required_group):
        raise HTTPException(
            status_code=403,
            detail=f"Access denied. You are not a member of the '{settings.ad_required_group}' AD group.",
        )

    email = claims.get("email", claims.get("upn", "")).strip().lower()
    display_name = claims.get("name", username)

    existing = db.query(User).filter(func.lower(User.username) == username).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail=f"Account already exists for '{username}'.")

    if email:
        existing_email = db.query(User).filter(func.lower(User.email) == email).first()
        if existing_email is not None:
            raise HTTPException(status_code=409, detail=f"Account with email '{email}' already exists.")

    from app.services.auth_service import _unusable_password_hash

    user = User(
        username=username,
        email=email,
        password_hash=_unusable_password_hash(),
        display_name=display_name,
        role="viewer",
        status="pending",
    )

    if body.plant_ids:
        plants = db.query(Plant).filter(Plant.id.in_(body.plant_ids)).all()
        user.plants = plants

    if body.process_ids:
        processes = db.query(Process).filter(Process.id.in_(body.process_ids)).all()
        user.processes = processes

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Username or email already exists")

    if settings.admin_notification_emails:
        admin_emails = [e.strip() for e in settings.admin_notification_emails.split(",") if e.strip()]
    else:
        admin_emails = [
            u.email
            for u in db.query(User).filter(User.role == "admin", User.status == "active").all()
            if u.email
        ]
    if admin_emails:
        send_new_user_registration_notification(
            admin_emails=admin_emails,
            username=user.username,
            display_name=user.display_name,
            email=user.email,
        )

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
