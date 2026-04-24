"""add is_g_item to solution

Revision ID: b5d8a2c4e7f1
Revises: cefd26619aff
Create Date: 2026-04-24 21:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b5d8a2c4e7f1'
down_revision: Union[str, None] = 'cefd26619aff'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('solution', sa.Column('is_g_item', sa.Boolean(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('solution', 'is_g_item')
