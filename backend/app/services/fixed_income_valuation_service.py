from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.asset import Asset
from app.models.brokerage_account import BrokerageAccount
from app.models.fixed_income_valuation import FixedIncomeValuation
from app.models.user import User
from app.schemas.fixed_income_valuation import FixedIncomeValuationCreate
from app.services.errors import DomainError
from app.services.position_math import quantize_amount

_FIXED_INCOME_ASSET_TYPES = frozenset({"FIXED_INCOME", "TREASURY"})


async def _get_owned_account(
    session: AsyncSession,
    account_id: UUID,
    user_id: UUID,
) -> BrokerageAccount:
    account = await session.get(BrokerageAccount, account_id)
    if account is None or account.user_id != user_id:
        raise DomainError("Conta não encontrada.", 404)
    return account


async def _get_fixed_income_asset_or_raise(session: AsyncSession, asset_id: UUID) -> Asset:
    asset = await session.get(Asset, asset_id)
    if asset is None:
        raise DomainError("Ativo não encontrado.", 404)
    if asset.asset_type not in _FIXED_INCOME_ASSET_TYPES:
        raise DomainError(
            "Marcação de renda fixa exige ativo do tipo TREASURY ou FIXED_INCOME.",
            422,
        )
    return asset


def _pick_latest_per_position(
    rows: list[FixedIncomeValuation],
) -> dict[tuple[UUID, UUID], FixedIncomeValuation]:
    latest: dict[tuple[UUID, UUID], FixedIncomeValuation] = {}
    for row in rows:
        key = (row.brokerage_account_id, row.asset_id)
        current = latest.get(key)
        if current is None:
            latest[key] = row
            continue
        if row.valuation_date > current.valuation_date:
            latest[key] = row
        elif (
            row.valuation_date == current.valuation_date
            and row.created_at > current.created_at
        ):
            latest[key] = row
    return latest


async def fetch_latest_valuations_for_accounts(
    session: AsyncSession,
    account_ids: set[UUID],
) -> dict[tuple[UUID, UUID], FixedIncomeValuation]:
    if not account_ids:
        return {}

    stmt = (
        select(FixedIncomeValuation)
        .where(FixedIncomeValuation.brokerage_account_id.in_(account_ids))
        .order_by(
            FixedIncomeValuation.brokerage_account_id,
            FixedIncomeValuation.asset_id,
            FixedIncomeValuation.valuation_date.desc(),
            FixedIncomeValuation.created_at.desc(),
        )
    )
    result = await session.execute(stmt)
    return _pick_latest_per_position(list(result.scalars().all()))


async def _resolve_applied_value(
    session: AsyncSession,
    *,
    brokerage_account_id: UUID,
    asset_id: UUID,
    applied_value: Decimal | None,
) -> Decimal:
    if applied_value is not None:
        return quantize_amount(applied_value)

    stmt = (
        select(FixedIncomeValuation)
        .where(
            FixedIncomeValuation.brokerage_account_id == brokerage_account_id,
            FixedIncomeValuation.asset_id == asset_id,
        )
        .order_by(
            FixedIncomeValuation.valuation_date.asc(),
            FixedIncomeValuation.created_at.asc(),
        )
        .limit(1)
    )
    result = await session.execute(stmt)
    prior = result.scalar_one_or_none()
    if prior is not None:
        return prior.applied_value

    raise DomainError(
        "Informe o valor aplicado no primeiro lançamento de renda fixa para esta posição.",
        422,
    )


async def create_fixed_income_valuation(
    session: AsyncSession,
    current_user: User,
    body: FixedIncomeValuationCreate,
) -> FixedIncomeValuation:
    await _get_owned_account(session, body.brokerage_account_id, current_user.id)
    await _get_fixed_income_asset_or_raise(session, body.asset_id)

    applied_value = await _resolve_applied_value(
        session,
        brokerage_account_id=body.brokerage_account_id,
        asset_id=body.asset_id,
        applied_value=body.applied_value,
    )

    record = FixedIncomeValuation(
        brokerage_account_id=body.brokerage_account_id,
        asset_id=body.asset_id,
        applied_value=applied_value,
        current_value=quantize_amount(body.current_value),
        valuation_date=body.valuation_date,
    )
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return record


async def list_fixed_income_valuations(
    session: AsyncSession,
    current_user: User,
    *,
    brokerage_account_id: UUID | None = None,
    asset_id: UUID | None = None,
) -> list[FixedIncomeValuation]:
    stmt = (
        select(FixedIncomeValuation)
        .join(
            BrokerageAccount,
            FixedIncomeValuation.brokerage_account_id == BrokerageAccount.id,
        )
        .where(BrokerageAccount.user_id == current_user.id)
        .order_by(
            FixedIncomeValuation.valuation_date.desc(),
            FixedIncomeValuation.created_at.desc(),
        )
    )
    if brokerage_account_id is not None:
        stmt = stmt.where(FixedIncomeValuation.brokerage_account_id == brokerage_account_id)
    if asset_id is not None:
        stmt = stmt.where(FixedIncomeValuation.asset_id == asset_id)

    result = await session.execute(stmt)
    return list(result.scalars().all())