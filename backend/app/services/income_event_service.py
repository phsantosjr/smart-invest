from calendar import monthrange
from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.asset import Asset
from app.models.asset_income_event import AssetIncomeEvent
from app.models.brokerage_account import BrokerageAccount
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.income_event import (
    INCOME_TYPES_BY_ASSET_TYPE,
    TAX_EXEMPT_INCOME_TYPES,
    FiiReinvestmentItem,
    FiiReinvestmentSection,
    IncomeAssetSummaryResponse,
    IncomeAssetSummaryRow,
    IncomeEventCreate,
    IncomeEventListResponse,
    IncomeEventRead,
    IncomeMonthlyResponse,
    IncomeMonthlyRow,
    ReinvestmentAnalysisResponse,
    StocksSmartInvestSection,
)
from app.services.errors import DomainError
from app.services.household_access import resolve_portfolio_user_ids
from app.services.position_math import TRANSACTION_BUY, quantize_amount

STOCK_INCOME_TYPES = frozenset({"DIVIDEND", "JCP", "STOCK_YIELD"})


async def _get_owned_account(
    session: AsyncSession,
    account_id: UUID,
    user_id: UUID,
) -> BrokerageAccount:
    account = await session.get(BrokerageAccount, account_id)
    if account is None or account.user_id != user_id:
        raise DomainError("Conta não encontrada.", 404)
    return account


async def _get_asset_or_raise(session: AsyncSession, asset_id: UUID) -> Asset:
    asset = await session.get(Asset, asset_id)
    if asset is None:
        raise DomainError("Ativo não encontrado.", 404)
    return asset


def _normalize_create(body: IncomeEventCreate) -> IncomeEventCreate:
    gross = quantize_amount(body.gross_amount)
    tax = quantize_amount(body.tax_withheld)
    if body.income_type in TAX_EXEMPT_INCOME_TYPES:
        tax = Decimal("0")
    net = quantize_amount(gross - tax)
    if net != quantize_amount(body.net_amount):
        raise DomainError(
            "net_amount deve ser igual a gross_amount menos tax_withheld.",
            422,
        )
    return body.model_copy(
        update={"gross_amount": gross, "tax_withheld": tax, "net_amount": net},
    )


def _parse_year_month(value: str) -> tuple[int, int]:
    parts = value.strip().split("-")
    if len(parts) != 2:
        raise DomainError("month deve estar no formato YYYY-MM.", 422)
    try:
        year = int(parts[0])
        month = int(parts[1])
    except ValueError as exc:
        raise DomainError("month deve estar no formato YYYY-MM.", 422) from exc
    if month < 1 or month > 12:
        raise DomainError("month inválido.", 422)
    return year, month


def _month_date_bounds(year: int, month: int) -> tuple[date, date]:
    last_day = monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last_day)


def _shift_year_month(year: int, month: int, delta_months: int) -> str:
    total = year * 12 + (month - 1) + delta_months
    new_year = total // 12
    new_month = total % 12 + 1
    return f"{new_year}-{new_month:02d}"


def _payment_month_label(payment_date: date) -> str:
    return f"{payment_date.year}-{payment_date.month:02d}"


async def monthly_income_report(
    session: AsyncSession,
    viewer: User,
    *,
    scope: str = "self",
    user_id: UUID | None = None,
    month: str | None = None,
    asset_id: UUID | None = None,
) -> IncomeMonthlyResponse:
    if scope not in {"self", "household"}:
        raise DomainError("Escopo inválido.", 400)

    owner_ids = await resolve_portfolio_user_ids(
        session,
        viewer,
        scope=scope,
        target_user_id=user_id,
    )

    stmt = (
        select(
            AssetIncomeEvent.payment_date,
            AssetIncomeEvent.net_amount,
        )
        .join(
            BrokerageAccount,
            AssetIncomeEvent.brokerage_account_id == BrokerageAccount.id,
        )
        .where(BrokerageAccount.user_id.in_(owner_ids))
    )

    if month is not None:
        year, month_num = _parse_year_month(month)
        start, end = _month_date_bounds(year, month_num)
        stmt = stmt.where(
            AssetIncomeEvent.payment_date >= start,
            AssetIncomeEvent.payment_date <= end,
        )
    if asset_id is not None:
        stmt = stmt.where(AssetIncomeEvent.asset_id == asset_id)

    result = await session.execute(stmt)
    raw_rows = list(result.all())

    aggregates: dict[str, Decimal] = {}
    for row in raw_rows:
        month_key = _payment_month_label(row.payment_date)
        aggregates[month_key] = aggregates.get(month_key, Decimal("0")) + row.net_amount

    items: list[IncomeMonthlyRow] = []
    grand_total = Decimal("0")
    for month_key in sorted(aggregates.keys(), reverse=True):
        total_net = quantize_amount(aggregates[month_key])
        grand_total += total_net
        items.append(
            IncomeMonthlyRow(
                month=month_key,
                total_net_amount=total_net,
            )
        )

    return IncomeMonthlyResponse(
        total_net_amount=quantize_amount(grand_total),
        items=items,
    )


async def reinvestment_analysis(
    session: AsyncSession,
    viewer: User,
    *,
    scope: str = "self",
    user_id: UUID | None = None,
    target_month: str | None = None,
    year: int | None = None,
) -> ReinvestmentAnalysisResponse:
    if scope not in {"self", "household"}:
        raise DomainError("Escopo inválido.", 400)

    today = date.today()
    if target_month is None:
        target_month = f"{today.year}-{today.month:02d}"
    if year is None:
        year = today.year

    purchase_year, purchase_month_num = _parse_year_month(target_month)
    purchase_start, purchase_end = _month_date_bounds(purchase_year, purchase_month_num)
    income_month = target_month
    income_start, income_end = purchase_start, purchase_end

    owner_ids = await resolve_portfolio_user_ids(
        session,
        viewer,
        scope=scope,
        target_user_id=user_id,
    )

    fii_income_stmt = (
        select(
            AssetIncomeEvent.asset_id,
            func.coalesce(func.sum(AssetIncomeEvent.net_amount), 0).label("income_total"),
        )
        .join(
            BrokerageAccount,
            AssetIncomeEvent.brokerage_account_id == BrokerageAccount.id,
        )
        .join(Asset, AssetIncomeEvent.asset_id == Asset.id)
        .where(
            BrokerageAccount.user_id.in_(owner_ids),
            Asset.asset_type == "FII",
            AssetIncomeEvent.payment_date >= income_start,
            AssetIncomeEvent.payment_date <= income_end,
        )
        .group_by(AssetIncomeEvent.asset_id)
    )
    fii_income_result = await session.execute(fii_income_stmt)
    fii_income_rows = {
        row.asset_id: quantize_amount(row.income_total or Decimal("0"))
        for row in fii_income_result.all()
    }

    fii_purchase_stmt = (
        select(
            Transaction.asset_id,
            func.coalesce(func.sum(Transaction.total_amount), 0).label("purchase_total"),
        )
        .join(BrokerageAccount, Transaction.brokerage_account_id == BrokerageAccount.id)
        .join(Asset, Transaction.asset_id == Asset.id)
        .where(
            BrokerageAccount.user_id.in_(owner_ids),
            Asset.asset_type == "FII",
            Transaction.transaction_type == TRANSACTION_BUY,
            Transaction.transaction_date >= purchase_start,
            Transaction.transaction_date <= purchase_end,
        )
        .group_by(Transaction.asset_id)
    )
    fii_purchase_result = await session.execute(fii_purchase_stmt)
    fii_purchases = {
        row.asset_id: quantize_amount(row.purchase_total or Decimal("0"))
        for row in fii_purchase_result.all()
    }

    fii_income_total = quantize_amount(
        sum(fii_income_rows.values(), Decimal("0")),
    )

    fii_purchase_total_stmt = (
        select(func.coalesce(func.sum(Transaction.total_amount), 0))
        .join(BrokerageAccount, Transaction.brokerage_account_id == BrokerageAccount.id)
        .join(Asset, Transaction.asset_id == Asset.id)
        .where(
            BrokerageAccount.user_id.in_(owner_ids),
            Asset.asset_type == "FII",
            Transaction.transaction_type == TRANSACTION_BUY,
            Transaction.transaction_date >= purchase_start,
            Transaction.transaction_date <= purchase_end,
        )
    )
    fii_purchase_total = quantize_amount(
        await session.scalar(fii_purchase_total_stmt) or Decimal("0"),
    )
    fii_missing = quantize_amount(
        max(Decimal("0"), fii_income_total - fii_purchase_total),
    )

    fii_asset_ids = set(fii_income_rows.keys())
    assets_by_id: dict[UUID, Asset] = {}
    if fii_asset_ids:
        assets_result = await session.execute(select(Asset).where(Asset.id.in_(fii_asset_ids)))
        assets_by_id = {asset.id: asset for asset in assets_result.scalars().all()}

    fii_items: list[FiiReinvestmentItem] = []
    for asset_uuid in sorted(fii_asset_ids, key=lambda aid: str(aid)):
        income_received = fii_income_rows[asset_uuid]
        amount_purchased = fii_purchases.get(asset_uuid, Decimal("0"))
        missing = quantize_amount(max(Decimal("0"), income_received - amount_purchased))
        asset = assets_by_id.get(asset_uuid)
        fii_items.append(
            FiiReinvestmentItem(
                asset_id=asset_uuid,
                ticker=asset.ticker if asset else None,
                income_received=income_received,
                amount_purchased=amount_purchased,
                missing_amount=missing,
                status="PENDING" if missing > 0 else "COMPLETED",
            )
        )

    stock_year_start = date(year, 1, 1)
    stock_year_end = date(year, 12, 31)

    stock_income_stmt = (
        select(func.coalesce(func.sum(AssetIncomeEvent.net_amount), 0))
        .join(
            BrokerageAccount,
            AssetIncomeEvent.brokerage_account_id == BrokerageAccount.id,
        )
        .join(Asset, AssetIncomeEvent.asset_id == Asset.id)
        .where(
            BrokerageAccount.user_id.in_(owner_ids),
            Asset.asset_type == "STOCK",
            AssetIncomeEvent.income_type.in_(STOCK_INCOME_TYPES),
            AssetIncomeEvent.payment_date >= stock_year_start,
            AssetIncomeEvent.payment_date <= stock_year_end,
        )
    )
    stock_income_total = quantize_amount(
        await session.scalar(stock_income_stmt) or Decimal("0"),
    )

    stock_purchase_stmt = (
        select(func.coalesce(func.sum(Transaction.total_amount), 0))
        .join(BrokerageAccount, Transaction.brokerage_account_id == BrokerageAccount.id)
        .join(Asset, Transaction.asset_id == Asset.id)
        .where(
            BrokerageAccount.user_id.in_(owner_ids),
            Asset.asset_type == "STOCK",
            Transaction.transaction_type == TRANSACTION_BUY,
            Transaction.transaction_date >= stock_year_start,
            Transaction.transaction_date <= stock_year_end,
        )
    )
    stock_purchase_total = quantize_amount(
        await session.scalar(stock_purchase_stmt) or Decimal("0"),
    )

    stock_missing = quantize_amount(
        max(Decimal("0"), stock_income_total - stock_purchase_total),
    )

    return ReinvestmentAnalysisResponse(
        fii_reinvestment=FiiReinvestmentSection(
            income_month=income_month,
            purchase_month=target_month,
            total_income_received=fii_income_total,
            total_purchased=fii_purchase_total,
            missing_amount=fii_missing,
            needs_reinvestment=fii_missing > 0,
            items=fii_items,
        ),
        stocks_smart_invest=StocksSmartInvestSection(
            year=year,
            total_income_received=stock_income_total,
            total_purchased=stock_purchase_total,
            missing_amount=stock_missing,
            needs_reinvestment=stock_missing > 0,
        ),
    )


def _validate_income_type_for_asset(asset: Asset, income_type: str) -> None:
    allowed = INCOME_TYPES_BY_ASSET_TYPE.get(asset.asset_type)
    if allowed is None:
        raise DomainError("Tipo de ativo não suporta lançamento de proventos.", 422)
    if income_type not in allowed:
        raise DomainError(
            f"Tipo de provento inválido para ativo {asset.asset_type}.",
            422,
        )


async def create_income_event(
    session: AsyncSession,
    current_user: User,
    body: IncomeEventCreate,
) -> AssetIncomeEvent:
    await _get_owned_account(session, body.brokerage_account_id, current_user.id)
    asset = await _get_asset_or_raise(session, body.asset_id)
    normalized = _normalize_create(body)
    _validate_income_type_for_asset(asset, normalized.income_type)

    record = AssetIncomeEvent(
        brokerage_account_id=normalized.brokerage_account_id,
        asset_id=normalized.asset_id,
        income_type=normalized.income_type,
        gross_amount=normalized.gross_amount,
        tax_withheld=normalized.tax_withheld,
        net_amount=normalized.net_amount,
        ex_date=normalized.ex_date,
        payment_date=normalized.payment_date,
    )
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return record


async def list_income_events(
    session: AsyncSession,
    viewer: User,
    *,
    scope: str = "self",
    user_id: UUID | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    asset_id: UUID | None = None,
    brokerage_account_id: UUID | None = None,
) -> IncomeEventListResponse:
    if scope not in {"self", "household"}:
        raise DomainError("Escopo inválido.", 400)

    owner_ids = await resolve_portfolio_user_ids(
        session,
        viewer,
        scope=scope,
        target_user_id=user_id,
    )

    stmt = (
        select(AssetIncomeEvent)
        .join(
            BrokerageAccount,
            AssetIncomeEvent.brokerage_account_id == BrokerageAccount.id,
        )
        .where(BrokerageAccount.user_id.in_(owner_ids))
        .order_by(AssetIncomeEvent.payment_date.desc(), AssetIncomeEvent.created_at.desc())
    )

    if start_date is not None:
        stmt = stmt.where(AssetIncomeEvent.payment_date >= start_date)
    if end_date is not None:
        stmt = stmt.where(AssetIncomeEvent.payment_date <= end_date)
    if asset_id is not None:
        stmt = stmt.where(AssetIncomeEvent.asset_id == asset_id)
    if brokerage_account_id is not None:
        stmt = stmt.where(AssetIncomeEvent.brokerage_account_id == brokerage_account_id)

    result = await session.execute(stmt)
    rows = list(result.scalars().all())
    total_net = sum((row.net_amount for row in rows), Decimal("0"))
    return IncomeEventListResponse(
        items=[IncomeEventRead.model_validate(row) for row in rows],
        total_net_amount=quantize_amount(total_net),
    )


async def summarize_income_by_asset(
    session: AsyncSession,
    viewer: User,
    *,
    scope: str = "self",
    user_id: UUID | None = None,
) -> IncomeAssetSummaryResponse:
    if scope not in {"self", "household"}:
        raise DomainError("Escopo inválido.", 400)

    owner_ids = await resolve_portfolio_user_ids(
        session,
        viewer,
        scope=scope,
        target_user_id=user_id,
    )

    stmt = (
        select(
            AssetIncomeEvent.asset_id,
            func.coalesce(func.sum(AssetIncomeEvent.net_amount), 0).label("total_net"),
            func.count(AssetIncomeEvent.id).label("event_count"),
        )
        .join(
            BrokerageAccount,
            AssetIncomeEvent.brokerage_account_id == BrokerageAccount.id,
        )
        .where(BrokerageAccount.user_id.in_(owner_ids))
        .group_by(AssetIncomeEvent.asset_id)
        .order_by(func.sum(AssetIncomeEvent.net_amount).desc())
    )
    result = await session.execute(stmt)
    aggregates = list(result.all())

    if not aggregates:
        effective_scope = "user" if user_id is not None else scope
        return IncomeAssetSummaryResponse(
            scope=effective_scope,
            rows=[],
            grand_total_net=Decimal("0"),
        )

    asset_ids = [row.asset_id for row in aggregates]
    assets_result = await session.execute(select(Asset).where(Asset.id.in_(asset_ids)))
    assets_by_id = {asset.id: asset for asset in assets_result.scalars().all()}

    rows: list[IncomeAssetSummaryRow] = []
    grand_total = Decimal("0")
    for row in aggregates:
        asset = assets_by_id.get(row.asset_id)
        total_net = quantize_amount(row.total_net or Decimal("0"))
        grand_total += total_net
        rows.append(
            IncomeAssetSummaryRow(
                asset_id=row.asset_id,
                ticker=asset.ticker if asset else None,
                name=asset.name if asset else "Ativo removido",
                asset_type=asset.asset_type if asset else "—",
                total_net_amount=total_net,
                event_count=int(row.event_count or 0),
            )
        )

    effective_scope = "user" if user_id is not None else scope
    return IncomeAssetSummaryResponse(
        scope=effective_scope,
        rows=rows,
        grand_total_net=quantize_amount(grand_total),
    )


async def delete_income_event(
    session: AsyncSession,
    current_user: User,
    event_id: UUID,
) -> None:
    record = await session.get(AssetIncomeEvent, event_id)
    if record is None:
        raise DomainError("Provento não encontrado.", 404)

    account = await session.get(BrokerageAccount, record.brokerage_account_id)
    if account is None or account.user_id != current_user.id:
        raise DomainError("Provento não encontrado.", 404)

    await session.delete(record)
    await session.commit()