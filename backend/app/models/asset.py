from datetime import date

from sqlalchemy import Date, Index, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, CreatedAtMixin, UUIDPrimaryKeyMixin


class Asset(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    __tablename__ = "assets"
    __table_args__ = (
        Index(
            "idx_assets_ticker_not_null",
            "ticker",
            unique=True,
            postgresql_where=text("ticker IS NOT NULL"),
            sqlite_where=text("ticker IS NOT NULL"),
        ),
    )

    ticker: Mapped[str | None] = mapped_column(String(20), nullable=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    asset_type: Mapped[str] = mapped_column(String(30), nullable=False)
    issuer: Mapped[str | None] = mapped_column(String(100), nullable=True)
    maturity_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    indexer: Mapped[str | None] = mapped_column(String(50), nullable=True)