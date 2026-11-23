"""fixed_income_valuations.applied_value

Revision ID: 20251122_0005
Revises: 20251121_0004
Create Date: 2025-11-22
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20251122_0005"
down_revision: Union[str, None] = "20251121_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "fixed_income_valuations",
        sa.Column("applied_value", sa.Numeric(18, 4), nullable=True),
    )
    op.execute(
        sa.text(
            "UPDATE fixed_income_valuations SET applied_value = current_value "
            "WHERE applied_value IS NULL"
        )
    )
    op.alter_column("fixed_income_valuations", "applied_value", nullable=False)


def downgrade() -> None:
    op.drop_column("fixed_income_valuations", "applied_value")