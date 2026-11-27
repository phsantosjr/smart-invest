from typing import Annotated, NoReturn

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.projection import ProjectionRunRequest, ProjectionRunResponse
from app.services import projection_service
from app.services.errors import DomainError

router = APIRouter(prefix="/projections", tags=["projections"])


def _raise_domain(exc: DomainError) -> NoReturn:
    raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.post("/run", response_model=ProjectionRunResponse)
async def run_projection(
    body: ProjectionRunRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> ProjectionRunResponse:
    try:
        return await projection_service.run_projection(session, current_user, body)
    except DomainError as exc:
        _raise_domain(exc)