"""add reason and remark to solution

Revision ID: 20260513a1b2
Revises: f9c5d7e1b2a3
Create Date: 2026-05-13 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260513a1b2'
down_revision: Union[str, None] = 'f9c5d7e1b2a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('solution', sa.Column('reason', sa.String(length=20), nullable=True))
    op.add_column('solution', sa.Column('remark', sa.String(length=1000), nullable=True))


def downgrade() -> None:
    op.drop_column('solution', 'remark')
    op.drop_column('solution', 'reason')
