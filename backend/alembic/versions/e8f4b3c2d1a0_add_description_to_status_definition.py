"""add description to status_definition

Revision ID: e8f4b3c2d1a0
Revises: d7f3a2b1c9e4
Create Date: 2026-05-04 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e8f4b3c2d1a0'
down_revision: Union[str, None] = 'd7f3a2b1c9e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Status descriptions from Excel Definition sheet
STATUS_DESCRIPTIONS = {
    'MP': 'Already complete development and start MP',
    'DEVELOPING': 'Under development and verifying project effectiveness',
    'INITIATION': 'First line/tank under development',
    'PLANNED': 'Planned to be developed but not started',
    'RESOURCE_CONSTRAIN': 'Not planned for development due to resource constrain',
    'NO_INTENTION': 'Not planned for development due to no intention',
    'NA': 'Not applicable because of different design',
}


def upgrade() -> None:
    op.add_column('status_definition', sa.Column('description', sa.String(200), nullable=True))

    # Update existing statuses with descriptions
    for code, description in STATUS_DESCRIPTIONS.items():
        escaped_desc = description.replace("'", "''")
        op.execute(f"UPDATE status_definition SET description = '{escaped_desc}' WHERE code = '{code}'")


def downgrade() -> None:
    op.drop_column('status_definition', 'description')
