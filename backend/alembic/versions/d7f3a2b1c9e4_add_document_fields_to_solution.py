"""add document fields to solution

Revision ID: d7f3a2b1c9e4
Revises: b5d8a2c4e7f1
Create Date: 2026-04-29 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd7f3a2b1c9e4'
down_revision: Union[str, None] = 'b5d8a2c4e7f1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('solution', sa.Column('document_filename', sa.String(255), nullable=True))
    op.add_column('solution', sa.Column('document_path', sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column('solution', 'document_path')
    op.drop_column('solution', 'document_filename')
