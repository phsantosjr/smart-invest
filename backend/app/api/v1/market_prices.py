from typing import Annotated, NoReturn
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.integrations.quotes.base import QuoteProviderError
from app.schemas.market_price import MarketPriceCreate, MarketPriceRead
from app.schemas.market_quote_sync import (
    MarketQuoteSyncRequest,
    MarketQuoteSyncResponse,
    MarketQuoteSyncRunRead,
)
from app.services import market_price_service, market_quote_sync_service
from app.services.errors import DomainError

router = APIRouter(prefix="/market-prices", tags=["market-prices"])


def _raise_domain(exc: DomainError) -> NoReturn:
    raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.post(
    "",
    response_model=MarketPriceRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_market_price(
    body: MarketPriceCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> MarketPriceRead:
    try:
        record = await market_price_service.create_manual_market_price(
            session,
            body,
            recorded_by=current_user,
        )
    except DomainError as exc:
        _raise_domain(exc)
    return MarketPriceRead.model_validate(record)


@router.post("/sync", response_model=MarketQuoteSyncResponse)
async def sync_market_prices(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
    body: MarketQuoteSyncRequest | None = None,
) -> MarketQuoteSyncResponse:
    asset_ids = None
    if body and body.asset_ids:
        asset_ids = set(body.asset_ids)
    try:
        return await market_quote_sync_service.sync_for_user(
            session,
            current_user,
            asset_ids=asset_ids,
        )
    except QuoteProviderError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc


@router.get("/sync-runs", response_model=list[MarketQuoteSyncRunRead])
async def list_market_price_sync_runs(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> list[MarketQuoteSyncRunRead]:
    rows = await market_quote_sync_service.list_sync_runs(session, current_user)
    return [MarketQuoteSyncRunRead.model_validate(row) for row in rows]


@router.get("/{asset_id}", response_model=list[MarketPriceRead])
async def list_market_prices(
    asset_id: UUID,
    _current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> list[MarketPriceRead]:
    try:
        rows = await market_price_service.list_market_prices_for_asset(session, asset_id)
    except DomainError as exc:
        _raise_domain(exc)
    return [MarketPriceRead.model_validate(row) for row in rows]