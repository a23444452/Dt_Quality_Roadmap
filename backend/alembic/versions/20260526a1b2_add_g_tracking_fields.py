"""add g_tracking fields to solution_map and target tables

Revision ID: 20260526a1b2
Revises: 20260514c3d4
Create Date: 2026-05-26 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '20260526a1b2'
down_revision: Union[str, None] = '20260514c3d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('solution_map', sa.Column('is_g_tracking', sa.Boolean(), server_default='0', nullable=False))
    op.add_column('solution_map', sa.Column('g_complete_date', sa.Date(), nullable=True))

    op.create_table(
        'g_tracking_monthly_target',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('month', sa.Integer(), nullable=False),
        sa.Column('budget', sa.Float(), nullable=False, server_default='0'),
        sa.Column('stretch', sa.Float(), nullable=False, server_default='0'),
        sa.UniqueConstraint('year', 'month', name='uq_monthly_target_year_month'),
    )

    op.create_table(
        'g_tracking_plant_target',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('plant_id', sa.Integer(), sa.ForeignKey('plant.id'), nullable=False),
        sa.Column('budget', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('stretch', sa.Integer(), nullable=False, server_default='0'),
        sa.UniqueConstraint('year', 'plant_id', name='uq_plant_target_year_plant'),
    )


def downgrade() -> None:
    op.drop_table('g_tracking_plant_target')
    op.drop_table('g_tracking_monthly_target')
    op.drop_column('solution_map', 'g_complete_date')
    op.drop_column('solution_map', 'is_g_tracking')
