from typing import Annotated, NoReturn
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.brokerage_account import (
    BrokerageAccountCreate,
    BrokerageAccountRead,
    BrokerageAccountUpdate,
)
from app.services import brokerage_account_service
from app.services.errors import DomainError

router = APIRouter(prefix="/brokerage-accounts", tags=["brokerage-accounts"])


def _raise_domain(exc: DomainError) -> NoReturn:
    raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.get("", response_model=list[BrokerageAccountRead])
async def list_brokerage_accounts(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
    user_id: Annotated[UUID | None, Query()] = None,
) -> list[BrokerageAccountRead]:
    try:
        accounts = await brokerage_account_service.list_brokerage_accounts(
            session,
            current_user,
            user_id,
        )
    except DomainError as exc:
        _raise_domain(exc)
    return [BrokerageAccountRead.model_validate(item) for item in accounts]


@router.post(
    "",
    response_model=BrokerageAccountRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_brokerage_account(
    body: BrokerageAccountCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> BrokerageAccountRead:
    try:
        account = await brokerage_account_service.create_brokerage_account(
            session,
            current_user,
            body,
        )
    except DomainError as exc:
        _raise_domain(exc)
    return BrokerageAccountRead.model_validate(account)


@router.patch("/{account_id}", response_model=BrokerageAccountRead)
async def update_brokerage_account(
    account_id: UUID,
    body: BrokerageAccountUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> BrokerageAccountRead:
    try:
        account = await brokerage_account_service.update_brokerage_account(
            session,
            current_user,
            account_id,
            body,
        )
    except DomainError as exc:
        _raise_domain(exc)
    return BrokerageAccountRead.model_validate(account)


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_brokerage_account(
    account_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    try:
        await brokerage_account_service.delete_brokerage_account(
            session,
            current_user,
            account_id,
        )
    except DomainError as exc:
        _raise_domain(exc)
