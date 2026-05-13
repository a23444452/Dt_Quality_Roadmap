import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.plant import Plant
from app.models.process import Process
from app.models.user import User
from app.utils.ldap_validation import check_account_and_password
from app.utils.security import hash_password, verify_password

_AD_USER_SENTINEL_PREFIX = "!AD_ONLY!"


def _unusable_password_hash() -> str:
    """Return a sentinel value that no bcrypt hash will ever match."""
    return f"{_AD_USER_SENTINEL_PREFIX}{secrets.token_urlsafe(32)}"


def authenticate_user(db: Session, username: str, password: str) -> User | None:
    user = db.query(User).filter(User.username == username).first()
    if user is None or not verify_password(password, user.password_hash):
        return None
    if user.status != "active":
        return None
    return user


def register_user(
    db: Session,
    username: str,
    email: str,
    password: str,
    display_name: str,
    plant_ids: list[int] | None = None,
    process_ids: list[int] | None = None,
) -> User:
    user = User(
        username=username,
        email=email,
        password_hash=hash_password(password),
        display_name=display_name,
        role="viewer",
        status="pending",
    )

    # Add plant associations
    if plant_ids:
        plants = db.query(Plant).filter(Plant.id.in_(plant_ids)).all()
        user.plants = plants

    # Add process associations
    if process_ids:
        processes = db.query(Process).filter(Process.id.in_(process_ids)).all()
        user.processes = processes

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_reset_token(db: Session, email: str) -> str | None:
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        return None
    token = str(uuid.uuid4())
    user.reset_token = token
    user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=24)
    db.commit()
    return token


class ADAuthResult:
    """Discriminated result of an AD authentication attempt."""

    AUTHENTICATED = "authenticated"
    NEED_REGISTRATION = "need_registration"
    PENDING_APPROVAL = "pending_approval"
    INVALID_CREDENTIALS = "invalid_credentials"
    INACTIVE_ACCOUNT = "inactive_account"

    def __init__(self, status: str, user: User | None = None, username: str = ""):
        self.status = status
        self.user = user
        self.username = username


def authenticate_ad_user(db: Session, nt_account: str, password: str) -> ADAuthResult:
    account = nt_account.strip().split("@", 1)[0].lower()
    if not account or not password:
        return ADAuthResult(ADAuthResult.INVALID_CREDENTIALS, username=account)

    if not check_account_and_password(account, password):
        return ADAuthResult(ADAuthResult.INVALID_CREDENTIALS, username=account)

    user = db.query(User).filter(func.lower(User.username) == account).first()
    if user is None:
        return ADAuthResult(ADAuthResult.NEED_REGISTRATION, username=account)
    if user.status == "pending":
        return ADAuthResult(ADAuthResult.PENDING_APPROVAL, username=account)
    if user.status != "active":
        return ADAuthResult(ADAuthResult.INACTIVE_ACCOUNT, username=account)
    return ADAuthResult(ADAuthResult.AUTHENTICATED, user=user, username=account)


class ADRegistrationConflict(Exception):
    """Raised when an AD registration collides with an existing account.

    Lets the router emit a 409 with a message guiding the user to admin.
    """


def register_ad_user(
    db: Session,
    nt_account: str,
    password: str,
    email: str,
    display_name: str,
    plant_ids: list[int] | None = None,
    process_ids: list[int] | None = None,
) -> User:
    """Create a pending user after re-verifying the NT account against AD.

    Raises ValueError if AD rejects the credentials; the router maps that to 401.
    Raises ADRegistrationConflict if username (case-insensitive) or email already
    exists, so the router can return 409 with a helpful message.
    """
    account = nt_account.strip().split("@", 1)[0].lower()
    if not check_account_and_password(account, password):
        raise ValueError("AD authentication failed")

    existing_by_username = (
        db.query(User).filter(func.lower(User.username) == account).first()
    )
    if existing_by_username is not None:
        raise ADRegistrationConflict(
            f"An account already exists for NT user '{account}'. "
            "Please contact your administrator to link your AD login."
        )

    email_norm = email.strip().lower()
    existing_by_email = (
        db.query(User).filter(func.lower(User.email) == email_norm).first()
    )
    if existing_by_email is not None:
        raise ADRegistrationConflict(
            f"An account with email '{email}' already exists. "
            "Please contact your administrator to link your AD login."
        )

    user = User(
        username=account,
        email=email,
        password_hash=_unusable_password_hash(),
        display_name=display_name,
        role="viewer",
        status="pending",
    )

    if plant_ids:
        plants = db.query(Plant).filter(Plant.id.in_(plant_ids)).all()
        user.plants = plants

    if process_ids:
        processes = db.query(Process).filter(Process.id.in_(process_ids)).all()
        user.processes = processes

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def reset_password(db: Session, token: str, new_password: str) -> bool:
    user = db.query(User).filter(User.reset_token == token).first()
    if user is None:
        return False
    if user.reset_token_expires and user.reset_token_expires < datetime.now(timezone.utc):
        return False
    user.password_hash = hash_password(new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
    return True
