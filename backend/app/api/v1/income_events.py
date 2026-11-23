from datetime import date
from typing import Annotated, NoReturn
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.income_event import (
    IncomeAssetSummaryResponse,
    IncomeEventCreate,
    IncomeEventListResponse,
    IncomeEventRead,
    IncomeMonthlyResponse,
    ReinvestmentAnalysisResponse,
)
from app.services import income_event_service
from app.services.errors import DomainError

router = APIRouter(prefix="/income-events", tags=["income-events"])


def _raise_domain(exc: DomainError) -> NoReturn:
    raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.post(
    "",
    response_model=IncomeEventRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_income_event(
    body: IncomeEventCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> IncomeEventRead:
    try:
        record = await income_event_service.create_income_event(session, current_user, body)
    except DomainError as exc:
        _raise_domain(exc)
    return IncomeEventRead.model_validate(record)


@router.get("", response_model=IncomeEventListResponse)
async def list_income_events(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
    scope: Annotated[str, Query()] = "self",
    user_id: Annotated[UUID | None, Query()] = None,
    start_date: Annotated[date | None, Query()] = None,
    end_date: Annotated[date | None, Query()] = None,
    asset_id: Annotated[UUID | None, Query()] = None,
    brokerage_account_id: Annotated[UUID | None, Query()] = None,
) -> IncomeEventListResponse:
    try:
        return await income_event_service.list_income_events(
            session,
            current_user,
            scope=scope,
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            asset_id=asset_id,
            brokerage_account_id=brokerage_account_id,
        )
    except DomainError as exc:
        _raise_domain(exc)


@router.get("/monthly", response_model=IncomeMonthlyResponse)
async def monthly_income_report(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
    scope: Annotated[str, Query()] = "self",
    user_id: Annotated[UUID | None, Query()] = None,
    month: Annotated[str | None, Query()] = None,
    asset_id: Annotated[UUID | None, Query()] = None,
) -> IncomeMonthlyResponse:
    try:
        return await income_event_service.monthly_income_report(
            session,
            current_user,
            scope=scope,
            user_id=user_id,
            month=month,
            asset_id=asset_id,
        )
    except DomainError as exc:
        _raise_domain(exc)


@router.get("/reinvestment", response_model=ReinvestmentAnalysisResponse)
async def reinvestment_analysis(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
    scope: Annotated[str, Query()] = "self",
    user_id: Annotated[UUID | None, Query()] = None,
    target_month: Annotated[str | None, Query()] = None,
    year: Annotated[int | None, Query()] = None,
) -> ReinvestmentAnalysisResponse:
    try:
        return await income_event_service.reinvestment_analysis(
            session,
            current_user,
            scope=scope,
            user_id=user_id,
            target_month=target_month,
            year=year,
        )
    except DomainError as exc:
        _raise_domain(exc)


@router.get("/summary-by-asset", response_model=IncomeAssetSummaryResponse)
async def summarize_income_by_asset(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
    scope: Annotated[str, Query()] = "self",
    user_id: Annotated[UUID | None, Query()] = None,
) -> IncomeAssetSummaryResponse:
    try:
        return await income_event_service.summarize_income_by_asset(
            session,
            current_user,
            scope=scope,
            user_id=user_id,
        )
    except DomainError as exc:
        _raise_domain(exc)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_income_event(
    event_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    try:
        await income_event_service.delete_income_event(session, current_user, event_id)
    except DomainError as exc:
        _raise_domain(exc)