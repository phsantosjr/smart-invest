import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, CreatedAtMixin, UUIDPrimaryKeyMixin

TRIGGER_MANUAL = "MANUAL"
TRIGGER_SCHEDULED = "SCHEDULED"

STATUS_RUNNING = "RUNNING"
STATUS_COMPLETED = "COMPLETED"
STATUS_FAILED = "FAILED"


class MarketQuoteSyncRun(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    __tablename__ = "market_quote_sync_runs"

    triggered_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    trigger: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    primary_provider: Mapped[str] = mapped_column(String(30), nullable=False)
    updated_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    failed_tickers: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    providers_used: Mapped[str | None] = mapped_column(String(120), nullable=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)