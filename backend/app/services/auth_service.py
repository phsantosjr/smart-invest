import jwt
import pyotp
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    TOKEN_TYPE_2FA_CHALLENGE,
    create_2fa_challenge_token,
    create_access_token,
    decode_token,
    verify_password,
)
from app.models.user import User


class AuthError(Exception):
    """Generic authentication failure (invalid credentials or 2FA)."""


async def get_user_by_email(session: AsyncSession, email: str) -> User | None:
    stmt = select(User).where(User.email == email)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def authenticate_user(session: AsyncSession, email: str, password: str) -> User:
    user = await get_user_by_email(session, email.lower())
    if user is None or not verify_password(password, user.password_hash):
        raise AuthError("Credenciais inválidas.")
    return user


def build_login_tokens(user: User) -> tuple[str, bool]:
    if user.is_2fa_enabled:
        return create_2fa_challenge_token(user.id), True
    return create_access_token(user.id), False


async def verify_2fa_and_issue_access(
    session: AsyncSession,
    temp_token: str,
    code: str,
) -> str:
    invalid_2fa = "Código 2FA incorreto ou expirado."
    try:
        payload = decode_token(temp_token)
    except jwt.PyJWTError:
        raise AuthError(invalid_2fa) from None

    if payload.get("type") != TOKEN_TYPE_2FA_CHALLENGE:
        raise AuthError(invalid_2fa)

    user_id = payload.get("sub")
    if not user_id:
        raise AuthError(invalid_2fa)

    try:
        uid = UUID(user_id)
    except (TypeError, ValueError):
        raise AuthError(invalid_2fa) from None

    stmt = select(User).where(User.id == uid)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    if user is None or not user.is_2fa_enabled:
        raise AuthError(invalid_2fa)
    if not user.two_factor_secret:
        raise AuthError(invalid_2fa)

    totp = pyotp.TOTP(user.two_factor_secret)
    if not totp.verify(code, valid_window=1):
        raise AuthError(invalid_2fa)

    return create_access_token(user.id)