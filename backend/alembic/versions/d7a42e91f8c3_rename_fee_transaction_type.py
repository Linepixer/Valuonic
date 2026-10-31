"""Rename legacy fee transaction type to Fee de Red

Revision ID: d7a42e91f8c3
Revises: 1b5335302e28
Create Date: 2026-10-30 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'd7a42e91f8c3'
down_revision: Union[str, Sequence[str], None] = '1b5335302e28'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "UPDATE transactions SET type = 'Fee de Red' "
        "WHERE LOWER(TRIM(type)) IN ('comisión', 'comision', 'fee de red')"
    )


def downgrade() -> None:
    op.execute(
        "UPDATE transactions SET type = 'Comisión' "
        "WHERE LOWER(TRIM(type)) = 'fee de red'"
    )

