from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.asset import Asset
from app.schemas.asset import AssetCreate, AssetUpdate, VARIABLE_INCOME_TYPES
from app.services.errors import DomainError


async def list_assets(session: AsyncSession) -> list[Asset]:
    stmt = select(Asset).order_by(Asset.ticker.asc().nulls_last(), Asset.name.asc())
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_asset(session: AsyncSession, asset_id: UUID) -> Asset:
    asset = await session.get(Asset, asset_id)
    if asset is None:
        raise DomainError("Ativo não encontrado.", 404)
    return asset


async def create_asset(session: AsyncSession, payload: AssetCreate) -> Asset:
    asset = Asset(
        ticker=payload.ticker,
        name=payload.name,
        asset_type=payload.asset_type,
        issuer=payload.issuer,
        maturity_date=payload.maturity_date,
        indexer=payload.indexer,
    )
    session.add(asset)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise DomainError("Já existe um ativo com este ticker.", 409) from None
    await session.refresh(asset)
    return asset


async def update_asset(
    session: AsyncSession,
    asset_id: UUID,
    payload: AssetUpdate,
) -> Asset:
    asset = await get_asset(session, asset_id)
    data = payload.model_dump(exclude_unset=True)

    if "name" in data and data["name"] is not None:
        asset.name = data["name"]
    if "asset_type" in data and data["asset_type"] is not None:
        asset.asset_type = data["asset_type"]
    if "ticker" in data:
        asset.ticker = data["ticker"]
    if "issuer" in data:
        asset.issuer = data["issuer"]
    if "maturity_date" in data:
        asset.maturity_date = data["maturity_date"]
    if "indexer" in data:
        asset.indexer = data["indexer"]

    asset_type = asset.asset_type
    if asset_type in VARIABLE_INCOME_TYPES and not asset.ticker:
        raise DomainError(
            "Ativos de renda variável (STOCK, FII) exigem ticker válido.",
            400,
        )

    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise DomainError("Já existe um ativo com este ticker.", 409) from None
    await session.refresh(asset)
    return asset