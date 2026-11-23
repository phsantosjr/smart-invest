import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, CreatedAtMixin, UUIDPrimaryKeyMixin


class FixedIncomeValuation(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    __tablename__ = "fixed_income_valuations"

    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assets.id", ondelete="CASCADE"),
        nullable=False,
    )
    brokerage_account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("brokerage_accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    applied_value: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    current_value: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    valuation_date: Mapped[date] = mapped_column(Date, nullable=False)