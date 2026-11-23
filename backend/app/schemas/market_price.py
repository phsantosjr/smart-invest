from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class MarketPriceCreate(BaseModel):
    asset_id: UUID
    price: Decimal = Field(gt=0, max_digits=18, decimal_places=4)
    quoted_at: datetime | None = None


class MarketPriceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    asset_id: UUID
    price: Decimal
    quoted_at: datetime
    source: str
    recorded_by_user_id: UUID | None
    created_at: datetime