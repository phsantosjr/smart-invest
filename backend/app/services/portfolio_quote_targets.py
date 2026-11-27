from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.asset import Asset
from app.models.brokerage_account import BrokerageAccount
from app.models.transaction import Transaction
from app.services.position_math import compute_position_from_transactions

_FIXED_INCOME_TYPES = frozenset({"FIXED_INCOME", "TREASURY"})
_TX_LOAD = (
    selectinload(Transaction.asset),
    selectinload(Transaction.brokerage_account),
)


async def _open_variable_assets_from_owner_ids(
    session: AsyncSession,
    owner_ids: set[UUID],
) -> dict[UUID, Asset]:
    if not owner_ids:
        return {}

    stmt = (
        select(Transaction)
        .options(*_TX_LOAD)
        .join(BrokerageAccount, Transaction.brokerage_account_id == BrokerageAccount.id)
        .where(BrokerageAccount.user_id.in_(owner_ids))
    )
    result = await session.execute(stmt)
    transactions = list(result.scalars().all())

    grouped: dict[tuple[UUID, UUID], list[Transaction]] = {}
    for tx in transactions:
        key = (tx.brokerage_account_id, tx.asset_id)
        grouped.setdefault(key, []).append(tx)

    assets: dict[UUID, Asset] = {}
    for bucket in grouped.values():
        quantity, _, _ = compute_position_from_transactions(bucket)
        if quantity <= 0:
            continue
        asset = bucket[0].asset
        if asset.asset_type in _FIXED_INCOME_TYPES:
            continue
        if not asset.ticker:
            continue
        assets[asset.id] = asset
    return assets


async def list_open_variable_assets_for_user(
    session: AsyncSession,
    user_id: UUID,
) -> list[Asset]:
    by_id = await _open_variable_assets_from_owner_ids(session, {user_id})
    return sorted(by_id.values(), key=lambda row: (row.ticker or "", row.name))


async def list_open_variable_assets_globally(session: AsyncSession) -> list[Asset]:
    accounts_stmt = select(BrokerageAccount.user_id).distinct()
    accounts_result = await session.execute(accounts_stmt)
    owner_ids = {row[0] for row in accounts_result.all()}
    by_id = await _open_variable_assets_from_owner_ids(session, owner_ids)
    return sorted(by_id.values(), key=lambda row: (row.ticker or "", row.name))