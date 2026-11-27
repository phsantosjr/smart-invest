from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class MarketQuoteSyncRequest(BaseModel):
    asset_ids: list[UUID] | None = None


class MarketQuoteSyncResponse(BaseModel):
    provider: str
    updated_count: int
    failed_tickers: list[str]
    sync_run_id: UUID
    providers_used: str | None = None


class MarketQuoteSyncRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    triggered_by_user_id: UUID | None
    trigger: str
    status: str
    started_at: datetime
    finished_at: datetime | None
    primary_provider: str
    updated_count: int
    failed_tickers: list[str] = Field(default_factory=list)
    providers_used: str | None = None
    message: str | None = None