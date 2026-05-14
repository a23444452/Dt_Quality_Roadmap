"""Fix audit_log.id autoincrement on SQLite.

The initial schema declared audit_log.id as BIGINT NOT NULL PRIMARY KEY.
On SQLite, only INTEGER PRIMARY KEY aliases to rowid and auto-increments.
BIGINT primary keys do NOT auto-increment, so every INSERT without an
explicit id failed NOT NULL constraint. This recreates the column as
INTEGER on SQLite while keeping BigInteger semantics for MSSQL/Postgres.

Revision ID: 20260514c3d4
Revises: 20260513a1b2
Create Date: 2026-05-14
"""
from alembic import op
import sqlalchemy as sa


revision = "20260514c3d4"
down_revision = "20260513a1b2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        # SQLite: ALTER PRIMARY KEY type via batch (table recreate).
        with op.batch_alter_table("audit_log", recreate="always") as batch_op:
            batch_op.alter_column(
                "id",
                existing_type=sa.BigInteger(),
                type_=sa.Integer(),
                existing_nullable=False,
                autoincrement=True,
            )
    # Other dialects (MSSQL, Postgres): BigInteger autoincrement already works,
    # no migration needed.


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        with op.batch_alter_table("audit_log", recreate="always") as batch_op:
            batch_op.alter_column(
                "id",
                existing_type=sa.Integer(),
                type_=sa.BigInteger(),
                existing_nullable=False,
                autoincrement=True,
            )
