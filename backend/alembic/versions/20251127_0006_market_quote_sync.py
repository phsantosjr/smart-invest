"""market_quote_sync_runs and users.is_superuser

Revision ID: 20251127_0006
Revises: 20251122_0005
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20251127_0006"
down_revision: Union[str, None] = "20251122_0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "is_superuser",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )

    op.create_table(
        "market_quote_sync_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("triggered_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("trigger", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("primary_provider", sa.String(length=30), nullable=False),
        sa.Column("updated_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "failed_tickers",
            sa.JSON(),
            server_default=sa.text("'[]'"),
            nullable=False,
        ),
        sa.Column("providers_used", sa.String(length=120), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["triggered_by_user_id"],
            ["users.id"],
            ondelete="SET NULL",
            name=op.f("fk_market_quote_sync_runs_triggered_by_user_id_users"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_market_quote_sync_runs")),
    )


def downgrade() -> None:
    op.drop_table("market_quote_sync_runs")
    op.drop_column("users", "is_superuser")