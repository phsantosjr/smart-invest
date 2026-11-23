from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.institution import InstitutionRead
from app.services import institution_service

router = APIRouter(prefix="/institutions", tags=["institutions"])


@router.get("", response_model=list[InstitutionRead])
async def list_institutions(
    _current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> list[InstitutionRead]:
    institutions = await institution_service.list_institutions(session)
    return [InstitutionRead.model_validate(item) for item in institutions]
