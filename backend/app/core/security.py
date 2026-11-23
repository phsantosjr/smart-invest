from datetime import UTC, datetime, timedelta
from enum import StrEnum
from uuid import UUID

import jwt
from passlib.context import CryptContext

from app.core.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TokenType(StrEnum):
    ACCESS = "access"
    TWO_FA_CHALLENGE = "2fa_challenge"


TOKEN_TYPE_ACCESS = TokenType.ACCESS.value
TOKEN_TYPE_2FA_CHALLENGE = TokenType.TWO_FA_CHALLENGE.value


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def create_token(
    *,
    subject: UUID,
    token_type: TokenType,
    expires_delta: timedelta,
) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": str(subject),
        "type": token_type.value,
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(user_id: UUID) -> str:
    settings = get_settings()
    return create_token(
        subject=user_id,
        token_type=TokenType.ACCESS,
        expires_delta=timedelta(minutes=settings.jwt_access_expire_minutes),
    )


def create_2fa_challenge_token(user_id: UUID) -> str:
    settings = get_settings()
    return create_token(
        subject=user_id,
        token_type=TokenType.TWO_FA_CHALLENGE,
        expires_delta=timedelta(minutes=settings.jwt_2fa_challenge_expire_minutes),
    )


def decode_token(token: str) -> dict:
    settings = get_settings()
    return jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
    )