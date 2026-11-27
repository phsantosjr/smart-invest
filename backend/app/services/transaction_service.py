from datetime import date
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.asset import Asset
from app.models.brokerage_account import BrokerageAccount
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import (
    TransactionAccountSummary,
    TransactionAssetSummary,
    TransactionCreate,
    TransactionListItem,
    TransactionListResponse,
)

DEFAULT_TRANSACTION_PAGE_SIZE = 20
MAX_TRANSACTION_PAGE_SIZE = 100
from app.services.errors import DomainError
from app.services.position_math import (
    TRANSACTION_SELL,
    compute_position_from_transactions,
    compute_trade_total_amount,
    quantize_amount,
    quantize_price,
    quantize_quantity,
)


_TX_LOAD = (
    selectinload(Transaction.asset),
    selectinload(Transaction.brokerage_account).selectinload(BrokerageAccount.institution),
)


def _transaction_list_filters(
    current_user: User,
    *,
    brokerage_account_id: UUID | None,
    start_date: date | None,
    end_date: date | None,
) -> tuple:
    filters = [BrokerageAccount.user_id == current_user.id]
    if brokerage_account_id is not None:
        filters.append(Transaction.brokerage_account_id == brokerage_account_id)
    if start_date is not None:
        filters.append(Transaction.transaction_date >= start_date)
    if end_date is not None:
        filters.append(Transaction.transaction_date <= end_date)
    return tuple(filters)


async def list_transactions(
    session: AsyncSession,
    current_user: User,
    *,
    brokerage_account_id: UUID | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    page: int = 1,
    page_size: int = DEFAULT_TRANSACTION_PAGE_SIZE,
) -> TransactionListResponse:
    if page < 1:
        raise DomainError("page deve ser >= 1.", 400)
    if page_size < 1 or page_size > MAX_TRANSACTION_PAGE_SIZE:
        raise DomainError(
            f"page_size deve estar entre 1 e {MAX_TRANSACTION_PAGE_SIZE}.",
            400,
        )
    if start_date is not None and end_date is not None and start_date > end_date:
        raise DomainError("start_date não pode ser posterior a end_date.", 422)

    filters = _transaction_list_filters(
        current_user,
        brokerage_account_id=brokerage_account_id,
        start_date=start_date,
        end_date=end_date,
    )

    count_stmt = (
        select(func.count(Transaction.id))
        .select_from(Transaction)
        .join(BrokerageAccount, Transaction.brokerage_account_id == BrokerageAccount.id)
        .where(*filters)
    )
    total = await session.scalar(count_stmt)
    total_count = int(total or 0)

    stmt = (
        select(Transaction)
        .options(*_TX_LOAD)
        .join(BrokerageAccount, Transaction.brokerage_account_id == BrokerageAccount.id)
        .where(*filters)
        .order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc())
        .limit(page_size)
        .offset((page - 1) * page_size)
    )

    result = await session.execute(stmt)
    rows = list(result.scalars().all())

    items = [
        TransactionListItem(
            id=tx.id,
            brokerage_account_id=tx.brokerage_account_id,
            asset_id=tx.asset_id,
            transaction_type=tx.transaction_type,
            quantity=tx.quantity,
            unit_price=tx.unit_price,
            fees=tx.fees,
            total_amount=tx.total_amount,
            transaction_date=tx.transaction_date,
            created_at=tx.created_at,
            asset=TransactionAssetSummary(
                id=tx.asset.id,
                ticker=tx.asset.ticker,
                name=tx.asset.name,
                asset_type=tx.asset.asset_type,
            ),
            brokerage_account=TransactionAccountSummary(
                id=tx.brokerage_account.id,
                account_number=tx.brokerage_account.account_number,
                institution_name=tx.brokerage_account.institution.name,
            ),
        )
        for tx in rows
    ]

    return TransactionListResponse(
        items=items,
        total=total_count,
        page=page,
        page_size=page_size,
    )


async def create_transaction(
    session: AsyncSession,
    current_user_id: UUID,
    payload: TransactionCreate,
) -> Transaction:
    account = await session.get(BrokerageAccount, payload.brokerage_account_id)
    if account is None or account.user_id != current_user_id:
        raise DomainError("Conta não encontrada.", 404)

    asset = await session.get(Asset, payload.asset_id)
    if asset is None:
        raise DomainError("Ativo inválido.", 400)

    quantity = quantize_quantity(payload.quantity)
    unit_price = quantize_price(payload.unit_price)
    fees = quantize_amount(payload.fees)

    if payload.transaction_type == TRANSACTION_SELL:
        await _assert_sell_custody(
            session,
            account_id=account.id,
            asset_id=asset.id,
            sell_quantity=quantity,
        )

    total_amount = compute_trade_total_amount(
        payload.transaction_type,
        quantity,
        unit_price,
        fees,
    )

    transaction = Transaction(
        brokerage_account_id=account.id,
        asset_id=asset.id,
        transaction_type=payload.transaction_type,
        quantity=quantity,
        unit_price=unit_price,
        fees=fees,
        total_amount=total_amount,
        transaction_date=payload.transaction_date,
    )
    session.add(transaction)
    await session.commit()
    await session.refresh(transaction)
    return transaction


async def _assert_sell_custody(
    session: AsyncSession,
    *,
    account_id: UUID,
    asset_id: UUID,
    sell_quantity,
) -> None:
    stmt = (
        select(Transaction)
        .where(
            Transaction.brokerage_account_id == account_id,
            Transaction.asset_id == asset_id,
        )
        .order_by(Transaction.transaction_date, Transaction.created_at)
    )
    result = await session.execute(stmt)
    existing = list(result.scalars().all())
    current_qty, _, _ = compute_position_from_transactions(existing)

    if sell_quantity > current_qty:
        raise DomainError(
            "Saldo insuficiente do ativo nesta conta para a venda solicitada.",
            400,
        )