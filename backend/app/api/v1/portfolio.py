from typing import Annotated, NoReturn
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.portfolio import PortfolioRead
from app.services import portfolio_service
from app.services.errors import DomainError

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


def _raise_domain(exc: DomainError) -> NoReturn:
    raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.get("", response_model=PortfolioRead)
async def get_portfolio(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
    scope: Annotated[str, Query()] = "self",
    user_id: Annotated[UUID | None, Query()] = None,
) -> PortfolioRead:
    try:
        return await portfolio_service.get_portfolio(
            session,
            current_user,
            scope=scope,
            user_id=user_id,
        )
    except DomainError as exc:
        _raise_domain(exc)