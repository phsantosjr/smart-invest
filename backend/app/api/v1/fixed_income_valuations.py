from typing import Annotated, NoReturn
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.fixed_income_valuation import (
    FixedIncomeValuationCreate,
    FixedIncomeValuationRead,
)
from app.services import fixed_income_valuation_service
from app.services.errors import DomainError

router = APIRouter(prefix="/fixed-income-valuations", tags=["fixed-income-valuations"])


def _raise_domain(exc: DomainError) -> NoReturn:
    raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.post(
    "",
    response_model=FixedIncomeValuationRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_fixed_income_valuation(
    body: FixedIncomeValuationCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> FixedIncomeValuationRead:
    try:
        record = await fixed_income_valuation_service.create_fixed_income_valuation(
            session,
            current_user,
            body,
        )
    except DomainError as exc:
        _raise_domain(exc)
    return FixedIncomeValuationRead.model_validate(record)


@router.get("", response_model=list[FixedIncomeValuationRead])
async def list_fixed_income_valuations(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
    brokerage_account_id: Annotated[UUID | None, Query()] = None,
    asset_id: Annotated[UUID | None, Query()] = None,
) -> list[FixedIncomeValuationRead]:
    rows = await fixed_income_valuation_service.list_fixed_income_valuations(
        session,
        current_user,
        brokerage_account_id=brokerage_account_id,
        asset_id=asset_id,
    )
    return [FixedIncomeValuationRead.model_validate(row) for row in rows]