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
async def test_create_fixed_income_valuation(client: AsyncClient, db_session: AsyncSession):
    user = await create_user(db_session, email="fi@test.com", password="secret123")
    institution = await create_institution(db_session)
    account = await create_brokerage_account(
        db_session,
        user=user,
        institution=institution,
    )
    asset = await create_asset(
        db_session,
        name="CDB Banco X",
        ticker=None,
        asset_type="FIXED_INCOME",
    )
    headers = await login_headers(client, "fi@test.com", "secret123")

    response = await client.post(
        "/api/v1/fixed-income-valuations",
        headers=headers,
        json={
            "brokerage_account_id": str(account.id),
            "asset_id": str(asset.id),
            "applied_value": "10000.00",
            "current_value": "10500.00",
            "valuation_date": "2026-11-20",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["applied_value"] == "10000.0000"
    assert body["current_value"] == "10500.0000"
    assert body["valuation_date"] == "2026-11-20"


@pytest.mark.asyncio
async def test_reject_valuation_for_stock_asset(client: AsyncClient, db_session: AsyncSession):
    user = await create_user(db_session, email="badfi@test.com", password="secret123")
    institution = await create_institution(db_session)
    account = await create_brokerage_account(
        db_session,
        user=user,
        institution=institution,
    )
    asset = await create_asset(db_session, ticker="PETR4", name="Petrobras")
    headers = await login_headers(client, "badfi@test.com", "secret123")

    response = await client.post(
        "/api/v1/fixed-income-valuations",
        headers=headers,
        json={
            "brokerage_account_id": str(account.id),
            "asset_id": str(asset.id),
            "current_value": "1000.00",
            "valuation_date": "2026-11-20",
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_portfolio_uses_latest_valuation(client: AsyncClient, db_session: AsyncSession):
    user = await create_user(db_session, email="pf-fi@test.com", password="secret123")
    institution = await create_institution(db_session)
    account = await create_brokerage_account(
        db_session,
        user=user,
        institution=institution,
    )
    asset = await create_asset(
        db_session,
        name="Tesouro Selic",
        ticker=None,
        asset_type="TREASURY",
    )
    headers = await login_headers(client, "pf-fi@test.com", "secret123")

    buy = await client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "brokerage_account_id": str(account.id),
            "asset_id": str(asset.id),
            "transaction_type": "BUY",
            "quantity": "1",
            "unit_price": "10000",
            "fees": "0",
            "transaction_date": "2026-01-01",
        },
    )
    assert buy.status_code == 201

    valuation = await client.post(
        "/api/v1/fixed-income-valuations",
        headers=headers,
        json={
            "brokerage_account_id": str(account.id),
            "asset_id": str(asset.id),
            "applied_value": "10000.00",
            "current_value": "11250.00",
            "valuation_date": "2026-11-20",
        },
    )
    assert valuation.status_code == 201

    portfolio = await client.get("/api/v1/portfolio", headers=headers)
    position = portfolio.json()["positions"][0]
    assert position["current_value"] == "11250.0000"
    assert position["has_market_quote"] is True


@pytest.mark.asyncio
async def test_portfolio_includes_valuation_without_buy_transaction(
    client: AsyncClient,
    db_session: AsyncSession,
):
    user = await create_user(db_session, email="fi-only@test.com", password="secret123")
    institution = await create_institution(db_session)
    account = await create_brokerage_account(
        db_session,
        user=user,
        institution=institution,
    )
    asset = await create_asset(
        db_session,
        name="CDB 120% CDI",
        ticker=None,
        asset_type="FIXED_INCOME",
    )
    headers = await login_headers(client, "fi-only@test.com", "secret123")

    valuation = await client.post(
        "/api/v1/fixed-income-valuations",
        headers=headers,
        json={
            "brokerage_account_id": str(account.id),
            "asset_id": str(asset.id),
            "applied_value": "40000.00",
            "current_value": "43682.92",
            "valuation_date": "2026-11-22",
        },
    )
    assert valuation.status_code == 201

    portfolio = await client.get("/api/v1/portfolio", headers=headers)
    assert portfolio.status_code == 200
    positions = portfolio.json()["positions"]
    assert len(positions) == 1
    assert positions[0]["asset_type"] == "FIXED_INCOME"
    assert positions[0]["current_value"] == "43682.9200"
    assert positions[0]["invested_amount"] == "40000.0000"


@pytest.mark.asyncio
async def test_fixed_income_valuation_reuses_applied_value_on_update(
    client: AsyncClient,
    db_session: AsyncSession,
):
    user = await create_user(db_session, email="fi-reuse@test.com", password="secret123")
    institution = await create_institution(db_session)
    account = await create_brokerage_account(
        db_session,
        user=user,
        institution=institution,
    )
    asset = await create_asset(
        db_session,
        name="LCI Itau",
        ticker=None,
        asset_type="FIXED_INCOME",
    )
    headers = await login_headers(client, "fi-reuse@test.com", "secret123")

    first = await client.post(
        "/api/v1/fixed-income-valuations",
        headers=headers,
        json={
            "brokerage_account_id": str(account.id),
            "asset_id": str(asset.id),
            "applied_value": "25000.00",
            "current_value": "26200.00",
            "valuation_date": "2026-10-01",
        },
    )
    assert first.status_code == 201

    second = await client.post(
        "/api/v1/fixed-income-valuations",
        headers=headers,
        json={
            "brokerage_account_id": str(account.id),
            "asset_id": str(asset.id),
            "current_value": "27000.00",
            "valuation_date": "2026-11-20",
        },
    )
    assert second.status_code == 201
    assert second.json()["applied_value"] == "25000.0000"