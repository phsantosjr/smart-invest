import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import create_user, login_headers


@pytest.mark.asyncio
async def test_create_stock_normalizes_ticker(
    client: AsyncClient,
    db_session: AsyncSession,
):
    await create_user(db_session, email="asset@test.com", password="secret123")
    headers = await login_headers(client, "asset@test.com", "secret123")

    response = await client.post(
        "/api/v1/assets",
        headers=headers,
        json={
            "ticker": " petr4 ",
            "name": "Petrobras PN",
            "asset_type": "STOCK",
        },
    )

    assert response.status_code == 201
    assert response.json()["ticker"] == "PETR4"


@pytest.mark.asyncio
async def test_create_fixed_income_without_ticker(
    client: AsyncClient,
    db_session: AsyncSession,
):
    await create_user(db_session, email="rf@test.com", password="secret123")
    headers = await login_headers(client, "rf@test.com", "secret123")

    response = await client.post(
        "/api/v1/assets",
        headers=headers,
        json={
            "ticker": "",
            "name": "CDB Banco Inter 110% CDI",
            "asset_type": "FIXED_INCOME",
            "issuer": "Banco Inter",
            "indexer": "CDI",
            "maturity_date": "2029-12-31",
        },
    )

    assert response.status_code == 201
    assert response.json()["ticker"] is None


@pytest.mark.asyncio
async def test_duplicate_ticker_returns_409(
    client: AsyncClient,
    db_session: AsyncSession,
):
    await create_user(db_session, email="dup@test.com", password="secret123")
    headers = await login_headers(client, "dup@test.com", "secret123")

    payload = {
        "ticker": "VALE3",
        "name": "Vale ON",
        "asset_type": "STOCK",
    }
    first = await client.post("/api/v1/assets", headers=headers, json=payload)
    assert first.status_code == 201

    second = await client.post(
        "/api/v1/assets",
        headers=headers,
        json={**payload, "name": "Outro nome"},
    )
    assert second.status_code == 409


@pytest.mark.asyncio
async def test_stock_without_ticker_is_rejected(
    client: AsyncClient,
    db_session: AsyncSession,
):
    await create_user(db_session, email="bad@test.com", password="secret123")
    headers = await login_headers(client, "bad@test.com", "secret123")

    response = await client.post(
        "/api/v1/assets",
        headers=headers,
        json={
            "name": "Sem ticker",
            "asset_type": "STOCK",
        },
    )

    assert response.status_code == 422