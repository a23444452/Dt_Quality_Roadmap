import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.user import User
from app.utils.security import hash_password, verify_password


def authenticate_user(db: Session, username: str, password: str) -> User | None:
    user = db.query(User).filter(User.username == username).first()
    if user is None or not verify_password(password, user.password_hash):
        return None
    if user.status != "active":
        return None
    return user


def register_user(
    db: Session, username: str, email: str, password: str, display_name: str
) -> User:
    user = User(
        username=username,
        email=email,
        password_hash=hash_password(password),
        display_name=display_name,
        role="viewer",
        status="pending",
    )
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
