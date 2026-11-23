import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, ForeignKey, Index, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, CreatedAtMixin, UUIDPrimaryKeyMixin

INCOME_TYPE_DIVIDEND = "DIVIDEND"
INCOME_TYPE_JCP = "JCP"
INCOME_TYPE_STOCK_YIELD = "STOCK_YIELD"
INCOME_TYPE_FII_YIELD = "FII_YIELD"
INCOME_TYPE_COUPON = "COUPON"


class AssetIncomeEvent(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    __tablename__ = "asset_income_events"
    __table_args__ = (
        CheckConstraint(
            "gross_amount >= 0 AND tax_withheld >= 0 AND net_amount >= 0 "
            "AND net_amount = gross_amount - tax_withheld",
            name="income_amounts",
        ),
        Index("idx_asset_income_events_account_payment", "brokerage_account_id", "payment_date"),
        Index("idx_asset_income_events_asset", "asset_id"),
    )

    brokerage_account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("brokerage_accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assets.id", ondelete="CASCADE"),
        nullable=False,
    )
    income_type: Mapped[str] = mapped_column(String(20), nullable=False)
    gross_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    tax_withheld: Mapped[Decimal] = mapped_column(
        Numeric(18, 4),
        nullable=False,
        server_default="0",
    )
    net_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    ex_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)