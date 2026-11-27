from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.asset import Asset
from app.models.asset_market_price import SOURCE_MANUAL, AssetMarketPrice
from app.integrations.quotes.base import QuoteResult
from app.models.user import User
from app.schemas.market_price import MarketPriceCreate
from app.services.errors import DomainError
from app.services.position_math import quantize_price


async def _get_asset_or_raise(session: AsyncSession, asset_id: UUID) -> Asset:
    asset = await session.get(Asset, asset_id)
    if asset is None:
        raise DomainError("Ativo não encontrado.", 404)
    return asset


def _pick_latest_per_asset(
    rows: list[AssetMarketPrice],
) -> dict[UUID, AssetMarketPrice]:
    latest: dict[UUID, AssetMarketPrice] = {}
    for row in rows:
        current = latest.get(row.asset_id)
        if current is None:
            latest[row.asset_id] = row
            continue
        if row.quoted_at > current.quoted_at:
            latest[row.asset_id] = row
        elif row.quoted_at == current.quoted_at and row.created_at > current.created_at:
            latest[row.asset_id] = row
    return latest


async def fetch_latest_quotes_by_asset_ids(
    session: AsyncSession,
    asset_ids: set[UUID],
) -> dict[UUID, AssetMarketPrice]:
    if not asset_ids:
        return {}

    stmt = (
        select(AssetMarketPrice)
        .where(AssetMarketPrice.asset_id.in_(asset_ids))
        .order_by(
            AssetMarketPrice.asset_id,
            AssetMarketPrice.quoted_at.desc(),
            AssetMarketPrice.created_at.desc(),
        )
    )
    result = await session.execute(stmt)
    return _pick_latest_per_asset(list(result.scalars().all()))


async def create_manual_market_price(
    session: AsyncSession,
    body: MarketPriceCreate,
    *,
    recorded_by: User,
) -> AssetMarketPrice:
    await _get_asset_or_raise(session, body.asset_id)

    quoted_at = body.quoted_at
    if quoted_at is None:
        quoted_at = datetime.now(UTC)
    elif quoted_at.tzinfo is None:
        quoted_at = quoted_at.replace(tzinfo=UTC)

    record = AssetMarketPrice(
        asset_id=body.asset_id,
        price=quantize_price(body.price),
        quoted_at=quoted_at,
        source=SOURCE_MANUAL,
        recorded_by_user_id=recorded_by.id,
    )
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return record


async def create_provider_market_price(
    session: AsyncSession,
    *,
    asset_id: UUID,
    quote: QuoteResult,
) -> AssetMarketPrice:
    await _get_asset_or_raise(session, asset_id)

    quoted_at = quote.quoted_at
    if quoted_at.tzinfo is None:
        quoted_at = quoted_at.replace(tzinfo=UTC)

    record = AssetMarketPrice(
        asset_id=asset_id,
        price=quantize_price(quote.price),
        quoted_at=quoted_at,
        source=quote.source,
        recorded_by_user_id=None,
    )
    session.add(record)
    await session.flush()
    return record


async def list_market_prices_for_asset(
    session: AsyncSession,
    asset_id: UUID,
) -> list[AssetMarketPrice]:
    await _get_asset_or_raise(session, asset_id)
    stmt = (
        select(AssetMarketPrice)
        .where(AssetMarketPrice.asset_id == asset_id)
        .order_by(
            AssetMarketPrice.quoted_at.desc(),
            AssetMarketPrice.created_at.desc(),
        )
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())