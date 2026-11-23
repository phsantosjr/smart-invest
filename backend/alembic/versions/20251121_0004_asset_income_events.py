"""asset_income_events per EP-06

Revision ID: 20251121_0004
Revises: 20251121_0003
Create Date: 2025-11-21
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20251121_0004"
down_revision: Union[str, None] = "20251121_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "asset_income_events",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("brokerage_account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("income_type", sa.String(length=20), nullable=False),
        sa.Column("gross_amount", sa.Numeric(18, 4), nullable=False),
        sa.Column(
            "tax_withheld",
            sa.Numeric(18, 4),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column("net_amount", sa.Numeric(18, 4), nullable=False),
        sa.Column("ex_date", sa.Date(), nullable=True),
        sa.Column("payment_date", sa.Date(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "gross_amount >= 0 AND tax_withheld >= 0 AND net_amount >= 0 "
            "AND net_amount = gross_amount - tax_withheld",
            name=op.f("ck_asset_income_events_income_amounts"),
        ),
        sa.ForeignKeyConstraint(
            ["asset_id"],
            ["assets.id"],
            ondelete="CASCADE",
            name=op.f("fk_asset_income_events_asset_id_assets"),
        ),
        sa.ForeignKeyConstraint(
            ["brokerage_account_id"],
            ["brokerage_accounts.id"],
            ondelete="CASCADE",
            name=op.f("fk_asset_income_events_brokerage_account_id_brokerage_accounts"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_asset_income_events")),
    )
    op.create_index(
        "idx_asset_income_events_account_payment",
        "asset_income_events",
        ["brokerage_account_id", "payment_date"],
    )
    op.create_index("idx_asset_income_events_asset", "asset_income_events", ["asset_id"])


def downgrade() -> None:
    op.drop_index("idx_asset_income_events_asset", table_name="asset_income_events")
    op.drop_index(
        "idx_asset_income_events_account_payment",
        table_name="asset_income_events",
    )
    op.drop_table("asset_income_events")