"""add user plants and processes

Revision ID: cefd26619aff
Revises: 6466b0f3fcae
Create Date: 2026-04-24 19:27:00.159301

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cefd26619aff'
down_revision: Union[str, None] = '6466b0f3fcae'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'user_plants',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('plant_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['plant_id'], ['plant.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', 'plant_id')
    )

    op.create_table(
        'user_processes',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('process_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['process_id'], ['process.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', 'process_id')
    )


def downgrade() -> None:
    op.drop_table('user_processes')
    op.drop_table('user_plants')
