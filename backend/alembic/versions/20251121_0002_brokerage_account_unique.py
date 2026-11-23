"""unique brokerage account per user, institution and number

Revision ID: 20251121_0002
Revises: 20251121_0001
Create Date: 2025-11-21
"""

from typing import Sequence, Union

from alembic import op

revision: str = "20251121_0002"
down_revision: Union[str, None] = "20251121_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_brokerage_accounts_user_institution_account",
        "brokerage_accounts",
        ["user_id", "institution_id", "account_number"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_brokerage_accounts_user_institution_account",
        "brokerage_accounts",
        type_="unique",
    )
