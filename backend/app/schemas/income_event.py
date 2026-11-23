from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

IncomeTypeLiteral = Literal["DIVIDEND", "JCP", "STOCK_YIELD", "FII_YIELD", "COUPON"]

TAX_EXEMPT_INCOME_TYPES = frozenset({"DIVIDEND", "STOCK_YIELD", "FII_YIELD"})

INCOME_TYPES_BY_ASSET_TYPE: dict[str, frozenset[str]] = {
    "STOCK": frozenset({"DIVIDEND", "JCP", "STOCK_YIELD"}),
    "FII": frozenset({"FII_YIELD"}),
    "TREASURY": frozenset({"COUPON"}),
    "FIXED_INCOME": frozenset({"COUPON"}),
    "FUND": frozenset({"COUPON"}),
}


class IncomeEventCreate(BaseModel):
    brokerage_account_id: UUID
    asset_id: UUID
    income_type: IncomeTypeLiteral
    gross_amount: Decimal = Field(ge=0, max_digits=18, decimal_places=4)
    tax_withheld: Decimal = Field(default=Decimal("0"), ge=0, max_digits=18, decimal_places=4)
    net_amount: Decimal = Field(ge=0, max_digits=18, decimal_places=4)
    ex_date: date | None = None
    payment_date: date

    @model_validator(mode="after")
    def validate_amounts(self) -> "IncomeEventCreate":
        expected_net = self.gross_amount - self.tax_withheld
        if self.net_amount != expected_net:
            raise ValueError(
                "net_amount deve ser igual a gross_amount menos tax_withheld.",
            )
        if self.income_type in TAX_EXEMPT_INCOME_TYPES and self.tax_withheld != 0:
            raise ValueError(
                "DIVIDEND, STOCK_YIELD e FII_YIELD não possuem retenção de IR na fonte para PF.",
            )
        return self


class IncomeEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    brokerage_account_id: UUID
    asset_id: UUID
    income_type: str
    gross_amount: Decimal
    tax_withheld: Decimal
    net_amount: Decimal
    ex_date: date | None
    payment_date: date
    created_at: datetime


class IncomeEventListResponse(BaseModel):
    items: list[IncomeEventRead]
    total_net_amount: Decimal


class IncomeAssetSummaryRow(BaseModel):
    asset_id: UUID
    ticker: str | None
    name: str
    asset_type: str
    total_net_amount: Decimal
    event_count: int


class IncomeAssetSummaryResponse(BaseModel):
    scope: str
    rows: list[IncomeAssetSummaryRow]
    grand_total_net: Decimal


class IncomeMonthlyRow(BaseModel):
    month: str
    total_net_amount: Decimal


class IncomeMonthlyResponse(BaseModel):
    total_net_amount: Decimal
    items: list[IncomeMonthlyRow]


ReinvestmentStatusLiteral = Literal["PENDING", "COMPLETED"]


class FiiReinvestmentItem(BaseModel):
    asset_id: UUID
    ticker: str | None
    income_received: Decimal
    amount_purchased: Decimal
    missing_amount: Decimal
    status: ReinvestmentStatusLiteral


class FiiReinvestmentSection(BaseModel):
    income_month: str
    purchase_month: str
    total_income_received: Decimal
    total_purchased: Decimal
    missing_amount: Decimal
    needs_reinvestment: bool
    items: list[FiiReinvestmentItem]


class StocksSmartInvestSection(BaseModel):
    year: int
    total_income_received: Decimal
    total_purchased: Decimal
    missing_amount: Decimal
    needs_reinvestment: bool


class ReinvestmentAnalysisResponse(BaseModel):
    fii_reinvestment: FiiReinvestmentSection
    stocks_smart_invest: StocksSmartInvestSection