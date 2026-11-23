import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, CreatedAtMixin, UUIDPrimaryKeyMixin

SOURCE_MANUAL = "MANUAL"


class AssetMarketPrice(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    __tablename__ = "asset_market_prices"
    __table_args__ = (
        CheckConstraint("price > 0", name="market_price_positive"),
        Index(
            "idx_asset_market_prices_latest",
            "asset_id",
            "quoted_at",
            "created_at",
        ),
    )

    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assets.id", ondelete="CASCADE"),
        nullable=False,
    )
    price: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    quoted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    source: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        server_default=SOURCE_MANUAL,
    )
    recorded_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )