from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class FixedIncomeValuationCreate(BaseModel):
    brokerage_account_id: UUID
    asset_id: UUID
    applied_value: Decimal | None = Field(
        default=None,
        gt=0,
        max_digits=18,
        decimal_places=4,
    )
    current_value: Decimal = Field(gt=0, max_digits=18, decimal_places=4)
    valuation_date: date


class FixedIncomeValuationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    brokerage_account_id: UUID
    asset_id: UUID
    applied_value: Decimal
    current_value: Decimal
    valuation_date: date
    created_at: datetime