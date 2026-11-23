from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.brokerage_account import BrokerageAccount
from app.models.asset_income_event import AssetIncomeEvent
from app.models.fixed_income_valuation import FixedIncomeValuation
from app.models.institution import Institution
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.brokerage_account import BrokerageAccountCreate, BrokerageAccountUpdate
from app.services.errors import DomainError
from app.services.household_access import assert_can_view_user_accounts

_ACCOUNT_LOAD = selectinload(BrokerageAccount.institution)


async def list_brokerage_accounts(
    session: AsyncSession,
    current_user: User,
    target_user_id: UUID | None = None,
) -> list[BrokerageAccount]:
    owner_id = target_user_id or current_user.id
    await assert_can_view_user_accounts(session, current_user, owner_id)

    stmt = (
        select(BrokerageAccount)
        .options(_ACCOUNT_LOAD)
        .where(BrokerageAccount.user_id == owner_id)
        .order_by(BrokerageAccount.created_at.desc())
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def create_brokerage_account(
    session: AsyncSession,
    current_user: User,
    payload: BrokerageAccountCreate,
) -> BrokerageAccount:
    await _require_institution(session, payload.institution_id)
    await _assert_unique_account(
        session,
        user_id=current_user.id,
        institution_id=payload.institution_id,
        account_number=payload.account_number,
    )

    account = BrokerageAccount(
        user_id=current_user.id,
        institution_id=payload.institution_id,
        account_number=payload.account_number,
    )
    session.add(account)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise DomainError(
            "Já existe uma conta com este número nesta instituição.",
            409,
        ) from None

    return await _get_account_or_404(session, account.id)


async def update_brokerage_account(
    session: AsyncSession,
    current_user: User,
    account_id: UUID,
    payload: BrokerageAccountUpdate,
) -> BrokerageAccount:
    account = await _get_owned_account(session, current_user, account_id)

    institution_id = payload.institution_id or account.institution_id
    account_number = payload.account_number or account.account_number

    if payload.institution_id is not None:
        await _require_institution(session, payload.institution_id)

    if (
        institution_id != account.institution_id
        or account_number != account.account_number
    ):
        await _assert_unique_account(
            session,
            user_id=current_user.id,
            institution_id=institution_id,
            account_number=account_number,
            exclude_account_id=account.id,
        )

    account.institution_id = institution_id
    account.account_number = account_number
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise DomainError(
            "Já existe uma conta com este número nesta instituição.",
            409,
        ) from None

    return await _get_account_or_404(session, account.id)


async def delete_brokerage_account(
    session: AsyncSession,
    current_user: User,
    account_id: UUID,
) -> None:
    account = await _get_owned_account(session, current_user, account_id)
    if await _has_financial_history(session, account.id):
        raise DomainError("A conta possui movimentações vinculadas.", 409)

    await session.delete(account)
    await session.commit()


async def _require_institution(session: AsyncSession, institution_id: UUID) -> Institution:
    institution = await session.get(Institution, institution_id)
    if institution is None:
        raise DomainError("Instituição inválida.", 400)
    return institution


async def _assert_unique_account(
    session: AsyncSession,
    *,
    user_id: UUID,
    institution_id: UUID,
    account_number: str,
    exclude_account_id: UUID | None = None,
) -> None:
    stmt = select(BrokerageAccount.id).where(
        BrokerageAccount.user_id == user_id,
        BrokerageAccount.institution_id == institution_id,
        BrokerageAccount.account_number == account_number,
    )
    if exclude_account_id is not None:
        stmt = stmt.where(BrokerageAccount.id != exclude_account_id)
    existing_id = await session.scalar(stmt)
    if existing_id is not None:
        raise DomainError(
            "Já existe uma conta com este número nesta instituição.",
            409,
        )


async def _get_account_or_404(
    session: AsyncSession,
    account_id: UUID,
) -> BrokerageAccount:
    stmt = (
        select(BrokerageAccount)
        .options(_ACCOUNT_LOAD)
        .where(BrokerageAccount.id == account_id)
    )
    account = await session.scalar(stmt)
    if account is None:
        raise DomainError("Conta não encontrada.", 404)
    return account


async def _get_owned_account(
    session: AsyncSession,
    current_user: User,
    account_id: UUID,
) -> BrokerageAccount:
    account = await _get_account_or_404(session, account_id)
    if account.user_id != current_user.id:
        raise DomainError("Conta não encontrada.", 404)
    return account


async def _has_financial_history(session: AsyncSession, account_id: UUID) -> bool:
    transaction_id = await session.scalar(
        select(Transaction.id)
        .where(Transaction.brokerage_account_id == account_id)
        .limit(1)
    )
    if transaction_id is not None:
        return True

    valuation_id = await session.scalar(
        select(FixedIncomeValuation.id)
        .where(FixedIncomeValuation.brokerage_account_id == account_id)
        .limit(1)
    )
    if valuation_id is not None:
        return True

    income_id = await session.scalar(
        select(AssetIncomeEvent.id)
        .where(AssetIncomeEvent.brokerage_account_id == account_id)
        .limit(1)
    )
    return income_id is not None
