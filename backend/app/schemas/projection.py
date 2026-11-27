from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.services.position_math import quantize_amount


AssetScope = Literal["ALL", "FII", "STOCK", "FIXED_INCOME", "TREASURY"]
GroupBy = Literal["month", "year"]


class ProjectionRunRequest(BaseModel):
    asset_scope: AssetScope = "FII"
    monthly_contribution: Decimal = Field(ge=Decimal("0"))
    horizon_years: int = Field(ge=1, le=20)
    group_by: GroupBy = "month"
    allocate_contribution_by_last_dividend: bool = True
    scope: Literal["self", "household"] = "self"
    user_id: UUID | None = None

    @field_validator("monthly_contribution")
    @classmethod
    def _quantize_contribution(cls, value: Decimal) -> Decimal:
        return quantize_amount(value)


class ProjectionSummaryRead(BaseModel):
    initial_patrimony: Decimal
    final_patrimony: Decimal
    total_dividends: Decimal
    total_contributions: Decimal
    gain_percent: Decimal


class ProjectionPeriodRow(BaseModel):
    period_label: str
    portfolio_value: Decimal
    dividends_in_period: Decimal
    contributions_in_period: Decimal
    cumulative_dividends: Decimal
    cumulative_contributions: Decimal
    gain_percent: Decimal


class ProjectionChartBar(BaseModel):
    period_label: str
    portfolio_value: Decimal


class ProjectionRunResponse(BaseModel):
    asset_scope: AssetScope
    group_by: GroupBy
    horizon_years: int
    months_simulated: int
    summary: ProjectionSummaryRead
    periods: list[ProjectionPeriodRow]
    chart_bars: list[ProjectionChartBar]
    notes: list[str] = Field(default_factory=list)