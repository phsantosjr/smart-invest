from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    LoginResponse2faRequired,
    LoginResponseNo2fa,
    TwoFactorVerifyRequest,
    TwoFactorVerifyResponse,
)
from app.schemas.user import UserRead
from app.services import auth_service
from app.services.auth_service import AuthError

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/login",
    response_model=LoginResponseNo2fa | LoginResponse2faRequired,
)
async def login(
    body: LoginRequest,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> LoginResponseNo2fa | LoginResponse2faRequired:
    try:
        user = await auth_service.authenticate_user(session, body.email, body.password)
    except AuthError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas.",
        ) from None

    token, requires_2fa = auth_service.build_login_tokens(user)
    if requires_2fa:
        return LoginResponse2faRequired(temp_token=token)
    return LoginResponseNo2fa(access_token=token)


@router.post("/2fa/verify", response_model=TwoFactorVerifyResponse)
async def verify_2fa(
    body: TwoFactorVerifyRequest,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> TwoFactorVerifyResponse:
    try:
        access_token = await auth_service.verify_2fa_and_issue_access(
            session,
            body.temp_token,
            body.code,
        )
    except AuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc
    return TwoFactorVerifyResponse(access_token=access_token)


@router.get("/me", response_model=UserRead)
async def me(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    return current_user