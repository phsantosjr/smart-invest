"""initial schema per _docs/01_architecture/03_database_schema.md

Revision ID: 20251121_0001
Revises:
Create Date: 2025-11-21

If you already applied the previous users-only migration, reset the DB volume
or run `alembic downgrade base` before upgrading again.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20251121_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def _uuid_pk() -> sa.Column:
    return sa.Column(
        "id",
        postgresql.UUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("gen_random_uuid()"),
    )


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    op.create_table(
        "institutions",
        _uuid_pk(),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("code", sa.String(length=20), nullable=True),
        sa.Column("institution_type", sa.String(length=30), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("name", name=op.f("uq_institutions_name")),
    )

    op.create_table(
        "households",
        _uuid_pk(),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    op.create_table(
        "users",
        _uuid_pk(),
        sa.Column("household_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("is_household_owner", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("two_factor_secret", sa.String(length=255), nullable=True),
        sa.Column("is_2fa_enabled", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["household_id"],
            ["households.id"],
            ondelete="SET NULL",
            name=op.f("fk_users_household_id_households"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("email", name=op.f("uq_users_email")),
    )

    op.create_table(
        "household_permissions",
        _uuid_pk(),
        sa.Column("owner_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("viewer_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("can_view", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.ForeignKeyConstraint(
            ["owner_user_id"],
            ["users.id"],
            ondelete="CASCADE",
            name=op.f("fk_household_permissions_owner_user_id_users"),
        ),
        sa.ForeignKeyConstraint(
            ["viewer_user_id"],
            ["users.id"],
            ondelete="CASCADE",
            name=op.f("fk_household_permissions_viewer_user_id_users"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_household_permissions")),
        sa.UniqueConstraint(
            "owner_user_id",
            "viewer_user_id",
            name=op.f("uq_household_permissions_owner_user_id"),
        ),
    )

    op.create_table(
        "brokerage_accounts",
        _uuid_pk(),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("institution_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_number", sa.String(length=50), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["institution_id"],
            ["institutions.id"],
            ondelete="RESTRICT",
            name=op.f("fk_brokerage_accounts_institution_id_institutions"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
            name=op.f("fk_brokerage_accounts_user_id_users"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_brokerage_accounts")),
    )

    op.create_table(
        "assets",
        _uuid_pk(),
        sa.Column("ticker", sa.String(length=20), nullable=True),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("asset_type", sa.String(length=30), nullable=False),
        sa.Column("issuer", sa.String(length=100), nullable=True),
        sa.Column("maturity_date", sa.Date(), nullable=True),
        sa.Column("indexer", sa.String(length=50), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_assets")),
    )
    op.create_index(
        "idx_assets_ticker_not_null",
        "assets",
        ["ticker"],
        unique=True,
        postgresql_where=sa.text("ticker IS NOT NULL"),
    )

    op.create_table(
        "transactions",
        _uuid_pk(),
        sa.Column("brokerage_account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("transaction_type", sa.String(length=20), nullable=False),
        sa.Column("quantity", sa.Numeric(18, 6), nullable=False),
        sa.Column("unit_price", sa.Numeric(18, 4), nullable=False),
        sa.Column("fees", sa.Numeric(18, 4), server_default=sa.text("0.00"), nullable=False),
        sa.Column("total_amount", sa.Numeric(18, 4), nullable=False),
        sa.Column("transaction_date", sa.Date(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["asset_id"],
            ["assets.id"],
            ondelete="CASCADE",
            name=op.f("fk_transactions_asset_id_assets"),
        ),
        sa.ForeignKeyConstraint(
            ["brokerage_account_id"],
            ["brokerage_accounts.id"],
            ondelete="CASCADE",
            name=op.f("fk_transactions_brokerage_account_id_brokerage_accounts"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_transactions")),
    )

    op.create_table(
        "fixed_income_valuations",
        _uuid_pk(),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("brokerage_account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("current_value", sa.Numeric(18, 4), nullable=False),
        sa.Column("valuation_date", sa.Date(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["asset_id"],
            ["assets.id"],
            ondelete="CASCADE",
            name=op.f("fk_fixed_income_valuations_asset_id_assets"),
        ),
        sa.ForeignKeyConstraint(
            ["brokerage_account_id"],
            ["brokerage_accounts.id"],
            ondelete="CASCADE",
            name=op.f("fk_fixed_income_valuations_brokerage_account_id_brokerage_accounts"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_fixed_income_valuations")),
    )


def downgrade() -> None:
    op.drop_table("fixed_income_valuations")
    op.drop_table("transactions")
    op.drop_index("idx_assets_ticker_not_null", table_name="assets")
    op.drop_table("assets")
    op.drop_table("brokerage_accounts")
    op.drop_table("household_permissions")
    op.drop_table("users")
    op.drop_table("households")
    op.drop_table("institutions")