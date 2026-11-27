from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.asset import Asset
from app.models.asset_income_event import AssetIncomeEvent
from app.models.brokerage_account import BrokerageAccount
from app.models.user import User
from app.schemas.projection import (
    ProjectionChartBar,
    ProjectionPeriodRow,
    ProjectionRunRequest,
    ProjectionRunResponse,
    ProjectionSummaryRead,
)
from app.services.errors import DomainError
from app.services.fii_projection_engine import (
    FiiSimulationInput,
    run_fii_projection,
)
from app.services.household_access import resolve_portfolio_user_ids
from app.services.market_price_service import fetch_latest_quotes_by_asset_ids
from app.services.position_math import (
    compute_position_from_transactions,
    quantize_amount,
    quantize_price,
)
from app.services.portfolio_service import get_portfolio


def _shift_month(base: date, delta: int) -> tuple[int, int]:
    total = base.year * 12 + (base.month - 1) + delta
    year = total // 12
    month = total % 12 + 1
    return year, month


def _month_label(year: int, month: int) -> str:
    return f"{year}-{month:02d}"


def _pick_latest_income_events(
    events: list[AssetIncomeEvent],
) -> dict[UUID, Decimal]:
    """Keep the newest payment per asset_id from an ordered event list."""
    latest: dict[UUID, Decimal] = {}
    for event in events:
        if event.asset_id not in latest:
            latest[event.asset_id] = quantize_amount(event.net_amount)
    return latest


async def _last_fii_income_by_asset(
    session: AsyncSession,
    owner_ids: list[UUID],
    asset_ids: set[UUID],
) -> dict[UUID, Decimal]:
    """Last provento por fundo: prioriza FII_YIELD; senão, qualquer provento no ativo FII."""
    if not asset_ids:
        return {}

    base = (
        select(AssetIncomeEvent)
        .join(
            BrokerageAccount,
            AssetIncomeEvent.brokerage_account_id == BrokerageAccount.id,
        )
        .join(Asset, AssetIncomeEvent.asset_id == Asset.id)
        .where(
            BrokerageAccount.user_id.in_(owner_ids),
            AssetIncomeEvent.asset_id.in_(asset_ids),
            Asset.asset_type == "FII",
        )
        .order_by(
            AssetIncomeEvent.asset_id,
            AssetIncomeEvent.payment_date.desc(),
            AssetIncomeEvent.created_at.desc(),
        )
    )

    fii_yield_stmt = base.where(AssetIncomeEvent.income_type == "FII_YIELD")
    fii_yield_result = await session.execute(fii_yield_stmt)
    latest = _pick_latest_income_events(list(fii_yield_result.scalars().all()))

    missing_ids = asset_ids - set(latest.keys())
    if missing_ids:
        fallback_stmt = base.where(AssetIncomeEvent.asset_id.in_(missing_ids))
        fallback_result = await session.execute(fallback_stmt)
        latest.update(_pick_latest_income_events(list(fallback_result.scalars().all())))

    return latest


async def _build_fii_inputs(
    session: AsyncSession,
    viewer: User,
    *,
    scope: str,
    user_id: UUID | None,
) -> tuple[list[FiiSimulationInput], Decimal, list[str]]:
    portfolio = await get_portfolio(session, viewer, scope=scope, user_id=user_id)
    fii_positions = [p for p in portfolio.positions if p.asset_type == "FII"]
    if not fii_positions:
        raise DomainError(
            "Nenhuma posição em FII na carteira para projetar.",
            422,
        )

    owner_ids = await resolve_portfolio_user_ids(
        session,
        viewer,
        scope=scope,
        target_user_id=user_id,
    )

    asset_ids = {p.asset_id for p in fii_positions}
    qty_by_asset: dict[UUID, Decimal] = {}
    avg_by_asset: dict[UUID, Decimal] = {}
    ticker_by_asset: dict[UUID, str | None] = {}
    for pos in fii_positions:
        qty_by_asset[pos.asset_id] = quantize_amount(
            qty_by_asset.get(pos.asset_id, Decimal("0")) + pos.quantity,
        )
        ticker_by_asset[pos.asset_id] = pos.ticker
        if pos.asset_id not in avg_by_asset:
            avg_by_asset[pos.asset_id] = pos.average_price

    quotes = await fetch_latest_quotes_by_asset_ids(session, asset_ids)
    last_yields = await _last_fii_income_by_asset(session, owner_ids, asset_ids)

    funds: list[FiiSimulationInput] = []
    initial_patrimony = Decimal("0")
    warnings: list[str] = []

    for asset_id, quantity in qty_by_asset.items():
        quote = quotes.get(asset_id)
        if quote is not None:
            unit_price = quantize_price(quote.price)
        else:
            unit_price = quantize_price(avg_by_asset.get(asset_id, Decimal("0")))
        if unit_price <= 0:
            raise DomainError(
                "Informe cotação ou preço médio válido para todos os FIIs.",
                422,
            )

        ticker = ticker_by_asset.get(asset_id) or str(asset_id)
        last_net = last_yields.get(asset_id)
        if last_net is None or quantity <= 0:
            warnings.append(ticker)
            unit_monthly = Decimal("0")
        else:
            unit_monthly = quantize_amount(last_net / quantity)

        funds.append(
            FiiSimulationInput(
                asset_id=asset_id,
                ticker=ticker_by_asset.get(asset_id),
                quantity=quantize_amount(quantity),
                unit_price=unit_price,
                unit_monthly_dividend=unit_monthly,
            ),
        )
        initial_patrimony += quantize_amount(quantity * unit_price)

    funds.sort(key=lambda f: (f.ticker or "", str(f.asset_id)))
    return funds, quantize_amount(initial_patrimony), warnings


def _aggregate_periods(
    month_results: list,
    *,
    group_by: str,
    start: date,
    initial_patrimony: Decimal,
    monthly_contribution: Decimal,
) -> tuple[list[ProjectionPeriodRow], list[ProjectionChartBar]]:
    rows: list[ProjectionPeriodRow] = []
    bars: list[ProjectionChartBar] = []

    cum_div = Decimal("0")
    cum_contrib = Decimal("0")

    if group_by == "month":
        for idx, month in enumerate(month_results):
            y, m = _shift_month(start, idx)
            label = _month_label(y, m)
            cum_div += month.dividends_received
            cum_contrib += month.contributions_applied
            gain = Decimal("0")
            if initial_patrimony > 0:
                gain = quantize_amount(
                    (
                        (month.portfolio_value - initial_patrimony - cum_contrib)
                        / initial_patrimony
                    )
                    * Decimal("100"),
                )
            rows.append(
                ProjectionPeriodRow(
                    period_label=label,
                    portfolio_value=month.portfolio_value,
                    dividends_in_period=month.dividends_received,
                    contributions_in_period=month.contributions_applied,
                    cumulative_dividends=cum_div,
                    cumulative_contributions=cum_contrib,
                    gain_percent=gain,
                ),
            )
            bars.append(
                ProjectionChartBar(period_label=label, portfolio_value=month.portfolio_value),
            )
        return rows, bars

    # Year aggregation
    by_year: dict[int, list] = {}
    for idx, month in enumerate(month_results):
        y, _ = _shift_month(start, idx)
        by_year.setdefault(y, []).append((idx, month))

    for year in sorted(by_year.keys()):
        bucket = by_year[year]
        div = quantize_amount(sum((m.dividends_received for _, m in bucket), Decimal("0")))
        contrib = quantize_amount(
            sum((m.contributions_applied for _, m in bucket), Decimal("0")),
        )
        cum_div += div
        cum_contrib += contrib
        last_month = bucket[-1][1]
        gain = Decimal("0")
        if initial_patrimony > 0:
            gain = quantize_amount(
                (
                    (last_month.portfolio_value - initial_patrimony - cum_contrib)
                    / initial_patrimony
                )
                * Decimal("100"),
            )
        label = str(year)
        rows.append(
            ProjectionPeriodRow(
                period_label=label,
                portfolio_value=last_month.portfolio_value,
                dividends_in_period=div,
                contributions_in_period=contrib,
                cumulative_dividends=cum_div,
                cumulative_contributions=cum_contrib,
                gain_percent=gain,
            ),
        )
        bars.append(
            ProjectionChartBar(
                period_label=label,
                portfolio_value=last_month.portfolio_value,
            ),
        )

    return rows, bars


async def run_projection(
    session: AsyncSession,
    viewer: User,
    body: ProjectionRunRequest,
) -> ProjectionRunResponse:
    notes: list[str] = []

    if body.asset_scope not in {"FII", "ALL"}:
        raise DomainError(
            "Projeção disponível apenas para FII nesta versão.",
            501,
        )
    if body.asset_scope == "ALL":
        notes.append(
            "Escopo ALL: somente posições FII foram incluídas (outras classes em breve).",
        )

    funds, initial_patrimony, funds_without_income = await _build_fii_inputs(
        session,
        viewer,
        scope=body.scope,
        user_id=body.user_id,
    )
    if funds_without_income:
        tickers = ", ".join(sorted(set(funds_without_income)))
        notes.append(
            f"Sem provento cadastrado para fundo(s) em carteira "
            f"({tickers}): rendimento projetado zero — lance FII_YIELD em Proventos.",
        )

    horizon_months = body.horizon_years * 12
    month_results = run_fii_projection(
        funds,
        monthly_contribution=body.monthly_contribution,
        horizon_months=horizon_months,
        allocate_contribution_by_last_dividend=body.allocate_contribution_by_last_dividend,
    )

    start = date.today().replace(day=1)
    periods, chart_bars = _aggregate_periods(
        month_results,
        group_by=body.group_by,
        start=start,
        initial_patrimony=initial_patrimony,
        monthly_contribution=body.monthly_contribution,
    )

    total_dividends = quantize_amount(
        sum((m.dividends_received for m in month_results), Decimal("0")),
    )
    total_contributions = quantize_amount(body.monthly_contribution * horizon_months)
    final_patrimony = month_results[-1].portfolio_value if month_results else initial_patrimony

    gain_percent = Decimal("0")
    if initial_patrimony > 0:
        gain_percent = quantize_amount(
            (
                (final_patrimony - initial_patrimony - total_contributions)
                / initial_patrimony
            )
            * Decimal("100"),
        )

    return ProjectionRunResponse(
        asset_scope=body.asset_scope,
        group_by=body.group_by,
        horizon_years=body.horizon_years,
        months_simulated=horizon_months,
        summary=ProjectionSummaryRead(
            initial_patrimony=initial_patrimony,
            final_patrimony=final_patrimony,
            total_dividends=total_dividends,
            total_contributions=total_contributions,
            gain_percent=gain_percent,
        ),
        periods=periods,
        chart_bars=chart_bars,
        notes=notes,
    )