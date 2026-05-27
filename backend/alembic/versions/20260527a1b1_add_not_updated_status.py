"""add '-' (Not Updated) status definition

Revision ID: 20260527a1b1
Revises: 20260526a1b2
Create Date: 2026-05-27 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '20260527a1b1'
down_revision: Union[str, None] = '20260526a1b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "INSERT INTO status_definition (code, name, description, color, sort_order, is_active) "
        "VALUES ('-', 'Not Updated', 'Initial state - not yet updated', '#E5E7EB', 0, 1)"
    )


def downgrade() -> None:
    op.execute("DELETE FROM status_definition WHERE code = '-'")
