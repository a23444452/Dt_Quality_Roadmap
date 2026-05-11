"""split System station by process

Revision ID: f9c5d7e1b2a3
Revises: e8f4b3c2d1a0
Create Date: 2026-05-08 10:00:00.000000

Splits the ambiguous "System" station into process-specific variants:
  - System(CBW)     in process CBW
  - System(Insp)    in process INSP
  - System(Overall) in process System
  - System(DP)      in process DP (new)

This removes the lookup ambiguity when auto-creating Solutions during
Excel import (station name is unique after this migration).
"""
from typing import Sequence, Union

from alembic import op


revision: str = 'f9c5d7e1b2a3'
down_revision: Union[str, None] = 'e8f4b3c2d1a0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


RENAMES = [
    ("CBW", "System(CBW)"),
    ("INSP", "System(Insp)"),
    ("System", "System(Overall)"),
]

DP_NEW_STATION = ("DP", "System(DP)")


def upgrade() -> None:
    # Rename existing "System" stations to process-specific names
    for process_name, new_name in RENAMES:
        op.execute(
            f"""
            UPDATE station
            SET name = '{new_name}'
            WHERE name = 'System'
              AND process_id = (SELECT id FROM process WHERE name = '{process_name}')
            """
        )

    # Insert System(DP) only if the DP process exists and the station is not already there
    process_name, new_name = DP_NEW_STATION
    op.execute(
        f"""
        INSERT INTO station (process_id, name, description, sort_order, is_active)
        SELECT p.id, '{new_name}', NULL, 999, 1
        FROM process p
        WHERE p.name = '{process_name}'
          AND NOT EXISTS (
            SELECT 1 FROM station s
            WHERE s.name = '{new_name}' AND s.process_id = p.id
          )
        """
    )


def downgrade() -> None:
    # Remove the newly-added DP station first
    process_name, new_name = DP_NEW_STATION
    op.execute(
        f"""
        DELETE FROM station
        WHERE name = '{new_name}'
          AND process_id = (SELECT id FROM process WHERE name = '{process_name}')
        """
    )

    # Rename the process-specific variants back to "System"
    for _, renamed in RENAMES:
        op.execute(f"UPDATE station SET name = 'System' WHERE name = '{renamed}'")
