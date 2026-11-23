from datetime import date
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import (
    create_asset,
    create_brokerage_account,
    create_institution,
    create_user,
    login_headers,
)


@pytest.mark.asyncio
async def test_create_buy_transaction(client: AsyncClient, db_session: AsyncSession):
    user = await create_user(db_session, email="buyer@test.com", password="secret123")
    institution = await create_institution(db_session)
    account = await create_brokerage_account(
        db_session,
        user=user,
        institution=institution,
    )
    asset = await create_asset(db_session)
    headers = await login_headers(client, "buyer@test.com", "secret123")

    response = await client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "brokerage_account_id": str(account.id),
            "asset_id": str(asset.id),
            "transaction_type": "BUY",
            "quantity": "100",
            "unit_price": "35.50",
            "fees": "2.50",
            "transaction_date": "2026-03-10",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["total_amount"] == "3552.5000"
    assert body["transaction_type"] == "BUY"


@pytest.mark.asyncio
async def test_sell_updates_portfolio_quantity(
    client: AsyncClient,
    db_session: AsyncSession,
):
    user = await create_user(db_session, email="seller@test.com", password="secret123")
    institution = await create_institution(db_session)
    account = await create_brokerage_account(
        db_session,
        user=user,
        institution=institution,
    )
    asset = await create_asset(db_session, name="Petrobras PN")
    headers = await login_headers(client, "seller@test.com", "secret123")

    buy = await client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "brokerage_account_id": str(account.id),
            "asset_id": str(asset.id),
            "transaction_type": "BUY",
            "quantity": "100",
            "unit_price": "35.50",
            "fees": "0",
            "transaction_date": "2026-01-10",
        },
    )
    assert buy.status_code == 201

    sell = await client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "brokerage_account_id": str(account.id),
            "asset_id": str(asset.id),
            "transaction_type": "SELL",
            "quantity": "40",
            "unit_price": "36.00",
            "fees": "0",
            "transaction_date": "2026-02-10",
        },
    )
    assert sell.status_code == 201

    portfolio = await client.get("/api/v1/portfolio", headers=headers)
    assert portfolio.status_code == 200
    positions = portfolio.json()["positions"]
    assert len(positions) == 1
    assert positions[0]["quantity"] == "60.000000"
    assert positions[0]["average_price"] == "35.5000"


@pytest.mark.asyncio
async def test_sell_exceeding_custody_is_rejected(
    client: AsyncClient,
    db_session: AsyncSession,
):
    user = await create_user(db_session, email="reject@test.com", password="secret123")
    institution = await create_institution(db_session)
    account = await create_brokerage_account(
        db_session,
        user=user,
        institution=institution,
    )
    asset = await create_asset(db_session, name="Petrobras PN")
    headers = await login_headers(client, "reject@test.com", "secret123")

    await client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "brokerage_account_id": str(account.id),
            "asset_id": str(asset.id),
            "transaction_type": "BUY",
            "quantity": "60",
            "unit_price": "35.50",
            "fees": "0",
            "transaction_date": "2026-01-10",
        },
    )

    response = await client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "brokerage_account_id": str(account.id),
            "asset_id": str(asset.id),
            "transaction_type": "SELL",
            "quantity": "70",
            "unit_price": "36.00",
            "fees": "0",
            "transaction_date": "2026-02-10",
        },
    )

    assert response.status_code == 400
    assert "saldo insuficiente" in response.json()["detail"].lower()