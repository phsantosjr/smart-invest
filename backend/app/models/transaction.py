import uuid
from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CreatedAtMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.asset import Asset
    from app.models.brokerage_account import BrokerageAccount


class Transaction(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    __tablename__ = "transactions"

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
    transaction_type: Mapped[str] = mapped_column(String(20), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    fees: Mapped[Decimal] = mapped_column(
        Numeric(18, 4),
        nullable=False,
        default=Decimal("0.00"),
        server_default="0.00",
    )
    total_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)

    brokerage_account: Mapped["BrokerageAccount"] = relationship(lazy="raise")
    asset: Mapped["Asset"] = relationship(lazy="raise")