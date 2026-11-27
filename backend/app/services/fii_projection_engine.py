"""Pure FII projection simulation (reinvest dividends + monthly contributions)."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_FLOOR, Decimal
from uuid import UUID

from app.services.position_math import quantize_amount, quantize_price, quantize_quantity


@dataclass
class FiiSimulationInput:
    asset_id: UUID
    ticker: str | None
    quantity: Decimal
    unit_price: Decimal
    """Expected net cash dividend per unit per month (from last payment / ref qty)."""
    unit_monthly_dividend: Decimal


@dataclass
class MonthSimulationResult:
    dividends_received: Decimal
    contributions_applied: Decimal
    portfolio_value: Decimal


def _floor_shares(cash: Decimal, unit_price: Decimal) -> tuple[Decimal, Decimal]:
    if unit_price <= 0:
        return Decimal("0"), cash
    shares = (cash / unit_price).to_integral_value(rounding=ROUND_FLOOR)
    shares = quantize_quantity(shares)
    spent = quantize_amount(shares * unit_price)
    remainder = quantize_amount(cash - spent)
    return shares, remainder


def simulate_one_month(
    funds: list[FiiSimulationInput],
    monthly_contribution: Decimal,
    *,
    allocate_contribution_by_last_dividend: bool,
    carry_pool: Decimal,
) -> tuple[list[FiiSimulationInput], MonthSimulationResult, Decimal]:
    """
    One calendar month: reinvest dividends, top-up from pool, then allocate contribution + pool.
    Returns updated funds, month metrics, and pool carried to next month.
    """
    pool = quantize_amount(monthly_contribution + carry_pool)
    contributions_applied = quantize_amount(monthly_contribution)
    dividends_received = Decimal("0")

    working = [
        FiiSimulationInput(
            asset_id=f.asset_id,
            ticker=f.ticker,
            quantity=f.quantity,
            unit_price=f.unit_price,
            unit_monthly_dividend=f.unit_monthly_dividend,
        )
        for f in funds
    ]

    # Phase 1 — dividend reinvestment
    for fund in working:
        income = quantize_amount(fund.unit_monthly_dividend * fund.quantity)
        dividends_received += income
        if income <= 0 or fund.unit_price <= 0:
            continue

        shares, remainder = _floor_shares(income, fund.unit_price)
        if shares > 0:
            fund.quantity = quantize_quantity(fund.quantity + shares)
            pool = quantize_amount(pool + remainder)
        else:
            need = quantize_amount(fund.unit_price - income)
            if pool >= need:
                pool = quantize_amount(pool - need)
                fund.quantity = quantize_quantity(fund.quantity + Decimal("1"))
            else:
                pool = quantize_amount(pool + income)

    # Phase 2 — distribute remaining pool by weight
    n = len(working)
    if pool > 0 and n > 0:
        incomes = [
            quantize_amount(f.unit_monthly_dividend * f.quantity) for f in working
        ]
        total_income = quantize_amount(sum(incomes, Decimal("0")))
        if (
            allocate_contribution_by_last_dividend
            and total_income > 0
        ):
            weights = [inc / total_income for inc in incomes]
        else:
            equal = Decimal("1") / Decimal(n)
            weights = [equal] * n

        allocations: list[Decimal] = []
        allocated_sum = Decimal("0")
        for idx, w in enumerate(weights):
            if idx == n - 1:
                share = quantize_amount(pool - allocated_sum)
            else:
                share = quantize_amount(pool * w)
                allocated_sum += share
            allocations.append(share)

        for fund, alloc in zip(working, allocations, strict=True):
            if alloc <= 0 or fund.unit_price <= 0:
                continue
            shares, remainder = _floor_shares(alloc, fund.unit_price)
            if shares > 0:
                fund.quantity = quantize_quantity(fund.quantity + shares)
                pool = quantize_amount(pool - quantize_amount(shares * fund.unit_price))
            else:
                pass

        pool = quantize_amount(max(Decimal("0"), pool))

    portfolio_value = quantize_amount(
        sum((f.quantity * f.unit_price for f in working), Decimal("0")),
    )

    return (
        working,
        MonthSimulationResult(
            dividends_received=quantize_amount(dividends_received),
            contributions_applied=contributions_applied,
            portfolio_value=portfolio_value,
        ),
        pool,
    )


def run_fii_projection(
    funds: list[FiiSimulationInput],
    *,
    monthly_contribution: Decimal,
    horizon_months: int,
    allocate_contribution_by_last_dividend: bool,
) -> list[MonthSimulationResult]:
    if horizon_months < 1:
        return []

    current = funds
    pool = Decimal("0")
    results: list[MonthSimulationResult] = []

    for _ in range(horizon_months):
        current, month, pool = simulate_one_month(
            current,
            monthly_contribution,
            allocate_contribution_by_last_dividend=allocate_contribution_by_last_dividend,
            carry_pool=pool,
        )
        results.append(month)

    return results