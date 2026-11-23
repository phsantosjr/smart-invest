from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

TransactionType = Literal["BUY", "SELL"]


class TransactionCreate(BaseModel):
    brokerage_account_id: UUID
    asset_id: UUID
    transaction_type: TransactionType
    quantity: Decimal = Field(gt=0, max_digits=18, decimal_places=6)
    unit_price: Decimal = Field(ge=0, max_digits=18, decimal_places=4)
    fees: Decimal = Field(default=Decimal("0"), ge=0, max_digits=18, decimal_places=4)
    transaction_date: date

    @field_validator("quantity", "unit_price", "fees", mode="before")
    @classmethod
    def coerce_decimal(cls, value: object) -> Decimal:
        if isinstance(value, Decimal):
            return value
        return Decimal(str(value))


class TransactionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    brokerage_account_id: UUID
    asset_id: UUID
    transaction_type: str
    quantity: Decimal
    unit_price: Decimal
    fees: Decimal
    total_amount: Decimal
    transaction_date: date
    created_at: datetime


class TransactionAssetSummary(BaseModel):
    id: UUID
    ticker: str | None
    name: str
    asset_type: str


class TransactionAccountSummary(BaseModel):
    id: UUID
    account_number: str
    institution_name: str


class TransactionListItem(TransactionRead):
    asset: TransactionAssetSummary
    brokerage_account: TransactionAccountSummary


class TransactionListResponse(BaseModel):
    items: list[TransactionListItem]
    total: int
    page: int
    page_size: int