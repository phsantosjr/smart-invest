from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class PortfolioPositionRead(BaseModel):
    brokerage_account_id: UUID
    asset_id: UUID
    user_id: UUID
    ticker: str | None
    name: str
    asset_type: str
    quantity: Decimal
    average_price: Decimal
    invested_amount: Decimal
    current_price: Decimal | None = None
    current_value: Decimal | None = None
    has_market_quote: bool = False
    last_quoted_at: datetime | None = None
    quote_source: str | None = None


class PortfolioRead(BaseModel):
    scope: str
    positions: list[PortfolioPositionRead]