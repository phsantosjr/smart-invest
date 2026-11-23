from typing import Annotated, NoReturn
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.asset import AssetCreate, AssetRead, AssetUpdate
from app.services import asset_service
from app.services.errors import DomainError

router = APIRouter(prefix="/assets", tags=["assets"])


def _raise_domain(exc: DomainError) -> NoReturn:
    raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.get("", response_model=list[AssetRead])
async def list_assets(
    _current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> list[AssetRead]:
    assets = await asset_service.list_assets(session)
    return [AssetRead.model_validate(item) for item in assets]


@router.get("/{asset_id}", response_model=AssetRead)
async def get_asset(
    asset_id: UUID,
    _current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> AssetRead:
    try:
        asset = await asset_service.get_asset(session, asset_id)
    except DomainError as exc:
        _raise_domain(exc)
    return AssetRead.model_validate(asset)


@router.post(
    "",
    response_model=AssetRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_asset(
    body: AssetCreate,
    _current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> AssetRead:
    try:
        asset = await asset_service.create_asset(session, body)
    except DomainError as exc:
        _raise_domain(exc)
    return AssetRead.model_validate(asset)


@router.patch("/{asset_id}", response_model=AssetRead)
async def update_asset(
    asset_id: UUID,
    body: AssetUpdate,
    _current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> AssetRead:
    try:
        asset = await asset_service.update_asset(session, asset_id, body)
    except DomainError as exc:
        _raise_domain(exc)
    return AssetRead.model_validate(asset)