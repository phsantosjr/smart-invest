from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.asset import Asset
from app.models.brokerage_account import BrokerageAccount
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.portfolio import PortfolioPositionRead, PortfolioRead
from app.services.errors import DomainError
from app.services.fixed_income_valuation_service import fetch_latest_valuations_for_accounts
from app.services.household_access import resolve_portfolio_user_ids
from app.services.market_price_service import fetch_latest_quotes_by_asset_ids
from app.services.position_math import (
    compute_position_from_transactions,
    quantize_amount,
    quantize_price,
    quantize_quantity,
)

_ACCOUNT_LOAD = selectinload(Transaction.brokerage_account).selectinload(
    BrokerageAccount.institution
)
_ASSET_LOAD = selectinload(Transaction.asset)

_FIXED_INCOME_TYPES = frozenset({"FIXED_INCOME", "TREASURY"})


async def get_portfolio(
    session: AsyncSession,
    viewer: User,
    *,
    scope: str = "self",
    user_id: UUID | None = None,
) -> PortfolioRead:
    if scope not in {"self", "household"}:
        raise DomainError("Escopo de carteira inválido.", 400)

    owner_ids = await resolve_portfolio_user_ids(
        session,
        viewer,
        scope=scope,
        target_user_id=user_id,
    )

    accounts_stmt = select(BrokerageAccount).where(
        BrokerageAccount.user_id.in_(owner_ids)
    )
    accounts_result = await session.execute(accounts_stmt)
    visible_accounts = list(accounts_result.scalars().all())
    all_account_ids = {account.id for account in visible_accounts}

    stmt = (
        select(Transaction)
        .options(_ASSET_LOAD, _ACCOUNT_LOAD)
        .join(BrokerageAccount, Transaction.brokerage_account_id == BrokerageAccount.id)
        .where(BrokerageAccount.user_id.in_(owner_ids))
        .order_by(Transaction.brokerage_account_id, Transaction.asset_id)
    )
    result = await session.execute(stmt)
    transactions = list(result.scalars().all())

    grouped: dict[tuple[UUID, UUID], list[Transaction]] = {}
    variable_asset_ids: set[UUID] = set()

    for tx in transactions:
        key = (tx.brokerage_account_id, tx.asset_id)
        grouped.setdefault(key, []).append(tx)
        if tx.asset.asset_type not in _FIXED_INCOME_TYPES:
            variable_asset_ids.add(tx.asset_id)

    latest_quotes = await fetch_latest_quotes_by_asset_ids(session, variable_asset_ids)
    latest_valuations = await fetch_latest_valuations_for_accounts(session, all_account_ids)

    positions: list[PortfolioPositionRead] = []
    for (account_id, asset_id), bucket in grouped.items():
        quantity, average_price, invested_amount = compute_position_from_transactions(
            bucket
        )
        if quantity <= 0:
            continue

        sample = bucket[0]
        asset: Asset = sample.asset
        account: BrokerageAccount = sample.brokerage_account

        current_price: Decimal | None = None
        current_value: Decimal | None = None
        has_market_quote = False
        last_quoted_at = None
        quote_source: str | None = None

        if asset.asset_type in _FIXED_INCOME_TYPES:
            valuation = latest_valuations.get((account_id, asset_id))
            if valuation is not None:
                current_value = quantize_amount(valuation.current_value)
                has_market_quote = True
            else:
                current_price = average_price
                current_value = quantize_amount(quantity * average_price)
        else:
            quote = latest_quotes.get(asset_id)
            if quote is not None:
                current_price = quote.price
                current_value = quantize_amount(quantity * quote.price)
                has_market_quote = True
                last_quoted_at = quote.quoted_at
                quote_source = quote.source
            else:
                current_price = average_price
                current_value = quantize_amount(quantity * average_price)

        positions.append(
            PortfolioPositionRead(
                brokerage_account_id=account_id,
                asset_id=asset_id,
                user_id=account.user_id,
                ticker=asset.ticker,
                name=asset.name,
                asset_type=asset.asset_type,
                quantity=quantity,
                average_price=average_price,
                invested_amount=invested_amount,
                current_price=current_price,
                current_value=current_value,
                has_market_quote=has_market_quote,
                last_quoted_at=last_quoted_at,
                quote_source=quote_source,
            )
        )

    existing_keys = {(row.brokerage_account_id, row.asset_id) for row in positions}
    valuation_only_keys = [
        key for key in latest_valuations if key not in existing_keys
    ]
    if valuation_only_keys:
        account_by_id = {account.id: account for account in visible_accounts}
        asset_ids = {asset_id for _, asset_id in valuation_only_keys}
        assets_result = await session.execute(
            select(Asset).where(Asset.id.in_(asset_ids))
        )
        asset_by_id = {asset.id: asset for asset in assets_result.scalars().all()}

        for account_id, asset_id in valuation_only_keys:
            valuation = latest_valuations[(account_id, asset_id)]
            account = account_by_id.get(account_id)
            asset = asset_by_id.get(asset_id)
            if account is None or asset is None:
                continue
            if asset.asset_type not in _FIXED_INCOME_TYPES:
                continue

            current_value = quantize_amount(valuation.current_value)
            invested_amount = quantize_amount(valuation.applied_value)
            unit_value = quantize_price(invested_amount)
            quantity = quantize_quantity(Decimal("1"))

            positions.append(
                PortfolioPositionRead(
                    brokerage_account_id=account_id,
                    asset_id=asset_id,
                    user_id=account.user_id,
                    ticker=asset.ticker,
                    name=asset.name,
                    asset_type=asset.asset_type,
                    quantity=quantity,
                    average_price=unit_value,
                    invested_amount=invested_amount,
                    current_price=quantize_price(valuation.current_value),
                    current_value=current_value,
                    has_market_quote=True,
                    last_quoted_at=None,
                    quote_source=None,
                )
            )

    positions.sort(
        key=lambda row: (
            row.ticker or "",
            row.name,
            str(row.brokerage_account_id),
        )
    )

    effective_scope = "user" if user_id is not None else scope
    return PortfolioRead(scope=effective_scope, positions=positions)