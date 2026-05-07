"""
Create or reset an API service account for external system integration.

Service accounts are used by other systems (e.g., plant dashboards) to
fetch data via the REST API with a Viewer-level read-only role.

Usage:
    # Create with auto-generated password (recommended)
    python -m app.create_service_account

    # Create with custom username and password
    python -m app.create_service_account --username api-plant-a --password MySecret123!

    # Reset password for existing service account
    python -m app.create_service_account --reset
"""

import argparse
import secrets
import string
import sys

from sqlalchemy.exc import OperationalError

from app.database import SessionLocal
from app.models.user import User
from app.utils.security import hash_password


DEFAULT_USERNAME = "api-service"
DEFAULT_EMAIL_DOMAIN = "corning.com"


def generate_password(length: int = 20) -> str:
    """Generate a cryptographically strong random password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    while True:
        password = "".join(secrets.choice(alphabet) for _ in range(length))
        if (
            any(c.islower() for c in password)
            and any(c.isupper() for c in password)
            and any(c.isdigit() for c in password)
        ):
            return password


def create_or_update_service_account(
    username: str,
    password: str | None,
    reset: bool,
) -> tuple[str, str]:
    """Create or update a service account, returning (username, password)."""
    db = SessionLocal()
    try:
        try:
            user = db.query(User).filter(User.username == username).first()
        except OperationalError as exc:
            if "no such table" in str(exc).lower():
                print("ERROR: Database tables do not exist yet.")
                print("Run the following commands first, then retry:")
                print("  cd backend")
                print("  alembic upgrade head")
                print("  python -m app.seed")
                sys.exit(2)
            raise

        generated_password = password or generate_password()

        if user:
            if not reset:
                print(f"Service account '{username}' already exists.")
                print("Use --reset to regenerate the password, or provide --password.")
                sys.exit(1)
            user.password_hash = hash_password(generated_password)
            user.status = "active"
            user.role = "viewer"
            db.commit()
            print(f"Password reset for existing service account '{username}'.")
        else:
            user = User(
                username=username,
                email=f"{username}@{DEFAULT_EMAIL_DOMAIN}",
                password_hash=hash_password(generated_password),
                display_name=f"API Service ({username})",
                role="viewer",
                status="active",
            )
            db.add(user)
            db.commit()
            print(f"Created service account '{username}'.")

        return username, generated_password
    finally:
        db.close()


def print_usage_instructions(username: str, password: str) -> None:
    """Print instructions on how to use the service account."""
    print("\n" + "=" * 60)
    print("SERVICE ACCOUNT CREDENTIALS")
    print("=" * 60)
    print(f"Username: {username}")
    print(f"Password: {password}")
    print("Role:     viewer (read-only)")
    print("=" * 60)
    print("\nSave these credentials securely — the password will not be shown again.")
    print("\nUsage example (curl):")
    print("-" * 60)
    print("# 1. Obtain access token")
    print("curl -X POST http://localhost:8000/api/v1/auth/login \\")
    print("  -H 'Content-Type: application/json' \\")
    print(f"  -d '{{\"username\": \"{username}\", \"password\": \"{password}\"}}'")
    print()
    print("# 2. Call data endpoint with Bearer token")
    print("curl http://localhost:8000/api/v1/dashboard/summary \\")
    print("  -H 'Authorization: Bearer <access_token>'")
    print("-" * 60)
    print("\nAvailable read-only endpoints:")
    print("  GET /api/v1/dashboard/summary")
    print("  GET /api/v1/dashboard/process-analysis")
    print("  GET /api/v1/dashboard/defect-analysis")
    print("  GET /api/v1/solution-map")
    print("  GET /api/v1/solutions")
    print("  GET /api/v1/plants")
    print("  GET /api/v1/tank-lines")
    print("  GET /api/v1/statuses")
    print()


def main() -> None:
    parser = argparse.ArgumentParser(description="Create or reset API service account.")
    parser.add_argument(
        "--username",
        default=DEFAULT_USERNAME,
        help=f"Service account username (default: {DEFAULT_USERNAME})",
    )
    parser.add_argument(
        "--password",
        default=None,
        help="Custom password (default: auto-generate 20-char strong password)",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Reset password for existing account",
    )
    args = parser.parse_args()

    username, password = create_or_update_service_account(
        username=args.username,
        password=args.password,
        reset=args.reset,
    )
    print_usage_instructions(username, password)


if __name__ == "__main__":
    main()
