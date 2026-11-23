"""asset_market_prices per _docs/04_core_domain/05_asset_market_prices.md

Revision ID: 20251121_0003
Revises: 20251121_0002
Create Date: 2025-11-21
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20251121_0003"
down_revision: Union[str, None] = "20251121_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "asset_market_prices",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("price", sa.Numeric(18, 4), nullable=False),
        sa.Column("quoted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "source",
            sa.String(length=30),
            server_default=sa.text("'MANUAL'"),
            nullable=False,
        ),
        sa.Column("recorded_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("price > 0", name=op.f("ck_asset_market_prices_market_price_positive")),
        sa.ForeignKeyConstraint(
            ["asset_id"],
            ["assets.id"],
            ondelete="CASCADE",
            name=op.f("fk_asset_market_prices_asset_id_assets"),
        ),
        sa.ForeignKeyConstraint(
            ["recorded_by_user_id"],
            ["users.id"],
            ondelete="SET NULL",
            name=op.f("fk_asset_market_prices_recorded_by_user_id_users"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_asset_market_prices")),
    )
    op.create_index(
        "idx_asset_market_prices_latest",
        "asset_market_prices",
        ["asset_id", "quoted_at", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("idx_asset_market_prices_latest", table_name="asset_market_prices")
    op.drop_table("asset_market_prices")