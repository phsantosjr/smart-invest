import pyotp
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import TOKEN_TYPE_ACCESS, TOKEN_TYPE_2FA_CHALLENGE, decode_token
from tests.conftest import create_user


@pytest.mark.asyncio
async def test_login_success_without_2fa(client: AsyncClient, db_session: AsyncSession):
    await create_user(db_session, email="user@test.com", password="secret123")

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "user@test.com", "password": "secret123"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["requires_2fa"] is False
    assert body["token_type"] == "bearer"
    assert body["access_token"]

    payload = decode_token(body["access_token"])
    assert payload["type"] == TOKEN_TYPE_ACCESS


@pytest.mark.asyncio
async def test_login_requires_2fa(client: AsyncClient, db_session: AsyncSession):
    secret = pyotp.random_base32()
    await create_user(
        db_session,
        email="2fa@test.com",
        password="secret123",
        is_2fa_enabled=True,
        two_factor_secret=secret,
    )

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "2fa@test.com", "password": "secret123"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["requires_2fa"] is True
    assert body["temp_token"]
    assert "access_token" not in body

    payload = decode_token(body["temp_token"])
    assert payload["type"] == TOKEN_TYPE_2FA_CHALLENGE


@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient, db_session: AsyncSession):
    await create_user(db_session, email="user@test.com", password="secret123")

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "user@test.com", "password": "wrong"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Credenciais inválidas."

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "missing@test.com", "password": "secret123"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_2fa_challenge_rejected_on_me(
    client: AsyncClient,
    db_session: AsyncSession,
):
    secret = pyotp.random_base32()
    await create_user(
        db_session,
        email="2fa@test.com",
        password="secret123",
        is_2fa_enabled=True,
        two_factor_secret=secret,
    )

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "2fa@test.com", "password": "secret123"},
    )
    temp_token = login.json()["temp_token"]

    me = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {temp_token}"},
    )
    assert me.status_code == 401


@pytest.mark.asyncio
async def test_2fa_verify_success(client: AsyncClient, db_session: AsyncSession):
    secret = pyotp.random_base32()
    await create_user(
        db_session,
        email="2fa@test.com",
        password="secret123",
        is_2fa_enabled=True,
        two_factor_secret=secret,
    )

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "2fa@test.com", "password": "secret123"},
    )
    temp_token = login.json()["temp_token"]
    code = pyotp.TOTP(secret).now()

    verify = await client.post(
        "/api/v1/auth/2fa/verify",
        json={"temp_token": temp_token, "code": code},
    )
    assert verify.status_code == 200
    access_token = verify.json()["access_token"]

    me = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert me.status_code == 200
    assert me.json()["email"] == "2fa@test.com"