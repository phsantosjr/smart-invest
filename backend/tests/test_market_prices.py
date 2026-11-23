from datetime import UTC, datetime
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
async def test_create_manual_market_price_defaults_quoted_at(
    client: AsyncClient,
    db_session: AsyncSession,
):
    user = await create_user(db_session, email="quotes@test.com", password="secret123")
    asset = await create_asset(db_session, ticker="PETR4", name="Petrobras")
    headers = await login_headers(client, "quotes@test.com", "secret123")

    response = await client.post(
        "/api/v1/market-prices",
        headers=headers,
        json={
            "asset_id": str(asset.id),
            "price": "38.45",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["asset_id"] == str(asset.id)
    assert body["price"] == "38.4500"
    assert body["source"] == "MANUAL"
    assert body["recorded_by_user_id"] == str(user.id)
    assert body["quoted_at"] is not None


@pytest.mark.asyncio
async def test_list_market_prices_ordered_by_quoted_at(
    client: AsyncClient,
    db_session: AsyncSession,
):
    await create_user(db_session, email="hist@test.com", password="secret123")
    asset = await create_asset(db_session, ticker="VALE3", name="Vale")
    headers = await login_headers(client, "hist@test.com", "secret123")

    older = datetime(2026, 11, 21, 10, 0, tzinfo=UTC)
    newer = datetime(2026, 11, 21, 16, 30, tzinfo=UTC)
    for price, quoted_at in (("37.50", older), ("38.20", newer)):
        post = await client.post(
            "/api/v1/market-prices",
            headers=headers,
            json={
                "asset_id": str(asset.id),
                "price": price,
                "quoted_at": quoted_at.isoformat(),
            },
        )
        assert post.status_code == 201

    response = await client.get(f"/api/v1/market-prices/{asset.id}", headers=headers)
    assert response.status_code == 200
    rows = response.json()
    assert len(rows) == 2
    assert rows[0]["price"] == "38.2000"
    assert rows[1]["price"] == "37.5000"


@pytest.mark.asyncio
async def test_portfolio_uses_latest_quote_by_quoted_at(
    client: AsyncClient,
    db_session: AsyncSession,
):
    user = await create_user(db_session, email="pf@test.com", password="secret123")
    institution = await create_institution(db_session)
    account = await create_brokerage_account(
        db_session,
        user=user,
        institution=institution,
    )
    asset = await create_asset(db_session, ticker="PETR4", name="Petrobras")
    headers = await login_headers(client, "pf@test.com", "secret123")

    tx = await client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "brokerage_account_id": str(account.id),
            "asset_id": str(asset.id),
            "transaction_type": "BUY",
            "quantity": "100",
            "unit_price": "30",
            "fees": "0",
            "transaction_date": "2026-01-01",
        },
    )
    assert tx.status_code == 201

    morning = datetime(2026, 11, 21, 10, 0, tzinfo=UTC)
    afternoon = datetime(2026, 11, 21, 16, 30, tzinfo=UTC)
    for price, quoted_at in (("37.50", morning), ("38.20", afternoon)):
        quote = await client.post(
            "/api/v1/market-prices",
            headers=headers,
            json={
                "asset_id": str(asset.id),
                "price": price,
                "quoted_at": quoted_at.isoformat(),
            },
        )
        assert quote.status_code == 201

    portfolio = await client.get("/api/v1/portfolio", headers=headers)
    assert portfolio.status_code == 200
    position = portfolio.json()["positions"][0]
    assert position["current_price"] == "38.2000"
    assert position["current_value"] == "3820.0000"
    assert position["has_market_quote"] is True


@pytest.mark.asyncio
async def test_retroactive_quote_does_not_override_newer(
    client: AsyncClient,
    db_session: AsyncSession,
):
    user = await create_user(db_session, email="retro@test.com", password="secret123")
    institution = await create_institution(db_session)
    account = await create_brokerage_account(
        db_session,
        user=user,
        institution=institution,
    )
    asset = await create_asset(db_session, ticker="VALE3", name="Vale")
    headers = await login_headers(client, "retro@test.com", "secret123")

    tx = await client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "brokerage_account_id": str(account.id),
            "asset_id": str(asset.id),
            "transaction_type": "BUY",
            "quantity": "10",
            "unit_price": "50",
            "fees": "0",
            "transaction_date": "2026-01-01",
        },
    )
    assert tx.status_code == 201

    newer = datetime(2026, 11, 21, 17, 0, tzinfo=UTC)
    older = datetime(2026, 11, 21, 11, 0, tzinfo=UTC)

    assert (
        await client.post(
            "/api/v1/market-prices",
            headers=headers,
            json={
                "asset_id": str(asset.id),
                "price": "62.00",
                "quoted_at": newer.isoformat(),
            },
        )
    ).status_code == 201

    assert (
        await client.post(
            "/api/v1/market-prices",
            headers=headers,
            json={
                "asset_id": str(asset.id),
                "price": "60.50",
                "quoted_at": older.isoformat(),
            },
        )
    ).status_code == 201

    history = await client.get(f"/api/v1/market-prices/{asset.id}", headers=headers)
    assert len(history.json()) == 2

    portfolio = await client.get("/api/v1/portfolio", headers=headers)
    position = portfolio.json()["positions"][0]
    assert position["current_price"] == "62.0000"
    assert position["current_value"] == "620.0000"


@pytest.mark.asyncio
async def test_portfolio_fallback_to_average_without_quote(
    client: AsyncClient,
    db_session: AsyncSession,
):
    user = await create_user(db_session, email="pm@test.com", password="secret123")
    institution = await create_institution(db_session)
    account = await create_brokerage_account(
        db_session,
        user=user,
        institution=institution,
    )
    asset = await create_asset(
        db_session,
        name="CSHGLG FII",
        ticker="HGLG11",
        asset_type="FII",
    )
    headers = await login_headers(client, "pm@test.com", "secret123")

    buy = await client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "brokerage_account_id": str(account.id),
            "asset_id": str(asset.id),
            "transaction_type": "BUY",
            "quantity": "100",
            "unit_price": "158",
            "fees": "0",
            "transaction_date": "2026-01-01",
        },
    )
    assert buy.status_code == 201

    portfolio = await client.get("/api/v1/portfolio", headers=headers)
    position = portfolio.json()["positions"][0]
    assert position["current_price"] == "158.0000"
    assert position["current_value"] == "15800.0000"
    assert position["has_market_quote"] is False
    assert position["last_quoted_at"] is None