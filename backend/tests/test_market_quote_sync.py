from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.asset_market_price import AssetMarketPrice
from app.models.market_quote_sync_run import TRIGGER_MANUAL, MarketQuoteSyncRun
from tests.conftest import (
    create_asset,
    create_brokerage_account,
    create_institution,
    create_transaction,
    create_user,
    login_headers,
)


@pytest.mark.asyncio
async def test_sync_persists_mock_quote_for_open_position(
    client: AsyncClient,
    db_session: AsyncSession,
):
    user = await create_user(db_session, email="sync@test.com", password="secret123")
    institution = await create_institution(db_session)
    account = await create_brokerage_account(db_session, user=user, institution=institution)
    stock = await create_asset(db_session, ticker="PETR4", asset_type="STOCK")
    fixed = await create_asset(
        db_session,
        ticker=None,
        name="CDB",
        asset_type="FIXED_INCOME",
    )
    await create_transaction(db_session, account=account, asset=stock)
    await create_transaction(db_session, account=account, asset=fixed)

    headers = await login_headers(client, "sync@test.com", "secret123")
    response = await client.post("/api/v1/market-prices/sync", headers=headers, json={})
    assert response.status_code == 200
    body = response.json()
    assert body["updated_count"] == 1
    assert body["failed_tickers"] == []
    assert body["provider"] == "MOCK"

    prices = await db_session.execute(
        select(AssetMarketPrice).where(AssetMarketPrice.asset_id == stock.id)
    )
    rows = list(prices.scalars().all())
    assert len(rows) == 1
    assert rows[0].source == "MOCK"
    assert rows[0].price > Decimal("0")


@pytest.mark.asyncio
async def test_sync_run_visible_to_user(client: AsyncClient, db_session: AsyncSession):
    user = await create_user(db_session, email="runs@test.com", password="secret123")
    institution = await create_institution(db_session)
    account = await create_brokerage_account(db_session, user=user, institution=institution)
    stock = await create_asset(db_session, ticker="VALE3", asset_type="STOCK")
    await create_transaction(db_session, account=account, asset=stock)

    headers = await login_headers(client, "runs@test.com", "secret123")
    await client.post("/api/v1/market-prices/sync", headers=headers, json={})

    listed = await client.get("/api/v1/market-prices/sync-runs", headers=headers)
    assert listed.status_code == 200
    runs = listed.json()
    assert len(runs) == 1
    assert runs[0]["trigger"] == TRIGGER_MANUAL
    assert runs[0]["updated_count"] == 1


@pytest.mark.asyncio
async def test_superuser_sees_scheduled_runs(
    client: AsyncClient,
    db_session: AsyncSession,
):
    from datetime import UTC, datetime

    from app.models.market_quote_sync_run import STATUS_COMPLETED, TRIGGER_SCHEDULED

    admin = await create_user(db_session, email="admin@test.com", password="secret123")
    admin.is_superuser = True
    await db_session.commit()

    regular = await create_user(db_session, email="user@test.com", password="secret123")
    run = MarketQuoteSyncRun(
        triggered_by_user_id=None,
        trigger=TRIGGER_SCHEDULED,
        status=STATUS_COMPLETED,
        started_at=datetime.now(UTC),
        finished_at=datetime.now(UTC),
        primary_provider="BRAPI",
        updated_count=5,
        failed_tickers=[],
    )
    db_session.add(run)
    manual = MarketQuoteSyncRun(
        triggered_by_user_id=regular.id,
        trigger=TRIGGER_MANUAL,
        status=STATUS_COMPLETED,
        started_at=datetime.now(UTC),
        finished_at=datetime.now(UTC),
        primary_provider="MOCK",
        updated_count=1,
        failed_tickers=[],
    )
    db_session.add(manual)
    await db_session.commit()

    user_headers = await login_headers(client, "user@test.com", "secret123")
    user_runs = await client.get("/api/v1/market-prices/sync-runs", headers=user_headers)
    assert user_runs.status_code == 200
    assert len(user_runs.json()) == 1

    admin_headers = await login_headers(client, "admin@test.com", "secret123")
    admin_runs = await client.get("/api/v1/market-prices/sync-runs", headers=admin_headers)
    assert admin_runs.status_code == 200
    assert len(admin_runs.json()) == 2