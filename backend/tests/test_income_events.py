from datetime import date

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
async def test_create_fii_yield_income_event(
    client: AsyncClient,
    db_session: AsyncSession,
):
    user = await create_user(db_session, email="yield@test.com", password="secret123")
    institution = await create_institution(db_session)
    account = await create_brokerage_account(
        db_session,
        user=user,
        institution=institution,
    )
    asset = await create_asset(
        db_session,
        ticker="HGLG11",
        name="CSHG Logística",
        asset_type="FII",
    )
    headers = await login_headers(client, "yield@test.com", "secret123")

    response = await client.post(
        "/api/v1/income-events",
        headers=headers,
        json={
            "brokerage_account_id": str(account.id),
            "asset_id": str(asset.id),
            "income_type": "FII_YIELD",
            "gross_amount": "120.50",
            "tax_withheld": "0.00",
            "net_amount": "120.50",
            "payment_date": "2026-11-15",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["income_type"] == "FII_YIELD"
    assert body["net_amount"] == "120.5000"

    portfolio = await client.get("/api/v1/portfolio", headers=headers)
    assert portfolio.status_code == 200
    assert portfolio.json()["positions"] == []


@pytest.mark.asyncio
async def test_create_stock_yield_income_event(
    client: AsyncClient,
    db_session: AsyncSession,
):
    user = await create_user(db_session, email="styield@test.com", password="secret123")
    institution = await create_institution(db_session)
    account = await create_brokerage_account(
        db_session,
        user=user,
        institution=institution,
    )
    asset = await create_asset(db_session, ticker="ITUB4", name="Itau")
    headers = await login_headers(client, "styield@test.com", "secret123")

    response = await client.post(
        "/api/v1/income-events",
        headers=headers,
        json={
            "brokerage_account_id": str(account.id),
            "asset_id": str(asset.id),
            "income_type": "STOCK_YIELD",
            "gross_amount": "88.40",
            "tax_withheld": "0.00",
            "net_amount": "88.40",
            "payment_date": "2026-11-18",
        },
    )
    assert response.status_code == 201
    assert response.json()["income_type"] == "STOCK_YIELD"


@pytest.mark.asyncio
async def test_reject_fii_yield_on_stock_asset(
    client: AsyncClient,
    db_session: AsyncSession,
):
    user = await create_user(db_session, email="badstock@test.com", password="secret123")
    institution = await create_institution(db_session)
    account = await create_brokerage_account(
        db_session,
        user=user,
        institution=institution,
    )
    asset = await create_asset(db_session, ticker="BBDC4", name="Bradesco")
    headers = await login_headers(client, "badstock@test.com", "secret123")

    response = await client.post(
        "/api/v1/income-events",
        headers=headers,
        json={
            "brokerage_account_id": str(account.id),
            "asset_id": str(asset.id),
            "income_type": "FII_YIELD",
            "gross_amount": "10.00",
            "tax_withheld": "0.00",
            "net_amount": "10.00",
            "payment_date": "2026-11-18",
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_jcp_with_tax_withheld(
    client: AsyncClient,
    db_session: AsyncSession,
):
    user = await create_user(db_session, email="jcp@test.com", password="secret123")
    institution = await create_institution(db_session)
    account = await create_brokerage_account(
        db_session,
        user=user,
        institution=institution,
    )
    asset = await create_asset(db_session, ticker="PETR4", name="Petrobras")
    headers = await login_headers(client, "jcp@test.com", "secret123")

    response = await client.post(
        "/api/v1/income-events",
        headers=headers,
        json={
            "brokerage_account_id": str(account.id),
            "asset_id": str(asset.id),
            "income_type": "JCP",
            "gross_amount": "200.00",
            "tax_withheld": "30.00",
            "net_amount": "170.00",
            "payment_date": "2026-11-20",
        },
    )
    assert response.status_code == 201
    assert response.json()["net_amount"] == "170.0000"

    listing = await client.get("/api/v1/income-events", headers=headers)
    assert listing.status_code == 200
    assert listing.json()["total_net_amount"] == "170.0000"


@pytest.mark.asyncio
async def test_create_duplicate_income_event_returns_409(
    client: AsyncClient,
    db_session: AsyncSession,
):
    user = await create_user(db_session, email="dup@test.com", password="secret123")
    institution = await create_institution(db_session)
    account = await create_brokerage_account(
        db_session,
        user=user,
        institution=institution,
    )
    asset = await create_asset(db_session, ticker="VALE3", name="Vale")
    headers = await login_headers(client, "dup@test.com", "secret123")

    payload = {
        "brokerage_account_id": str(account.id),
        "asset_id": str(asset.id),
        "income_type": "DIVIDEND",
        "gross_amount": "50.00",
        "tax_withheld": "0.00",
        "net_amount": "50.00",
        "payment_date": "2026-11-10",
    }
    first = await client.post("/api/v1/income-events", headers=headers, json=payload)
    assert first.status_code == 201

    duplicate = await client.post("/api/v1/income-events", headers=headers, json=payload)
    assert duplicate.status_code == 409
    assert "provento" in duplicate.json()["detail"].lower()

    different_type = await client.post(
        "/api/v1/income-events",
        headers=headers,
        json={**payload, "income_type": "JCP", "tax_withheld": "7.50", "net_amount": "42.50"},
    )
    assert different_type.status_code == 201


@pytest.mark.asyncio
async def test_income_event_rejects_net_mismatch(
    client: AsyncClient,
    db_session: AsyncSession,
):
    user = await create_user(db_session, email="bad@test.com", password="secret123")
    institution = await create_institution(db_session)
    account = await create_brokerage_account(
        db_session,
        user=user,
        institution=institution,
    )
    asset = await create_asset(db_session)
    headers = await login_headers(client, "bad@test.com", "secret123")

    response = await client.post(
        "/api/v1/income-events",
        headers=headers,
        json={
            "brokerage_account_id": str(account.id),
            "asset_id": str(asset.id),
            "income_type": "JCP",
            "gross_amount": "200.00",
            "tax_withheld": "30.00",
            "net_amount": "150.00",
            "payment_date": "2026-11-20",
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_income_does_not_change_position_after_buy(
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
    asset = await create_asset(db_session, ticker="PETR4", name="Petrobras")
    headers = await login_headers(client, "pm@test.com", "secret123")

    buy = await client.post(
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
    assert buy.status_code == 201

    portfolio_before = await client.get("/api/v1/portfolio", headers=headers)
    qty_before = portfolio_before.json()["positions"][0]["quantity"]
    pm_before = portfolio_before.json()["positions"][0]["average_price"]

    income = await client.post(
        "/api/v1/income-events",
        headers=headers,
        json={
            "brokerage_account_id": str(account.id),
            "asset_id": str(asset.id),
            "income_type": "DIVIDEND",
            "gross_amount": "50.00",
            "tax_withheld": "0.00",
            "net_amount": "50.00",
            "payment_date": "2026-11-15",
        },
    )
    assert income.status_code == 201

    portfolio_after = await client.get("/api/v1/portfolio", headers=headers)
    position = portfolio_after.json()["positions"][0]
    assert position["quantity"] == qty_before
    assert position["average_price"] == pm_before


@pytest.mark.asyncio
async def test_summarize_income_by_asset(
    client: AsyncClient,
    db_session: AsyncSession,
):
    user = await create_user(db_session, email="sum@test.com", password="secret123")
    institution = await create_institution(db_session)
    account = await create_brokerage_account(
        db_session,
        user=user,
        institution=institution,
    )
    petr = await create_asset(db_session, ticker="PETR4", name="Petrobras")
    vale = await create_asset(db_session, ticker="VALE3", name="Vale")
    headers = await login_headers(client, "sum@test.com", "secret123")

    for asset, amount in ((petr, "50.00"), (petr, "25.00"), (vale, "100.00")):
        response = await client.post(
            "/api/v1/income-events",
            headers=headers,
            json={
                "brokerage_account_id": str(account.id),
                "asset_id": str(asset.id),
                "income_type": "DIVIDEND",
                "gross_amount": amount,
                "tax_withheld": "0",
                "net_amount": amount,
                "payment_date": "2026-06-01",
            },
        )
        assert response.status_code == 201

    summary = await client.get(
        "/api/v1/income-events/summary-by-asset",
        headers=headers,
    )
    assert summary.status_code == 200
    body = summary.json()
    assert body["grand_total_net"] == "175.0000"
    by_ticker = {row["ticker"]: row for row in body["rows"]}
    assert by_ticker["PETR4"]["total_net_amount"] == "75.0000"
    assert by_ticker["PETR4"]["event_count"] == 2
    assert by_ticker["VALE3"]["total_net_amount"] == "100.0000"


async def test_list_income_events_by_date_range(
    client: AsyncClient,
    db_session: AsyncSession,
):
    user = await create_user(db_session, email="list@test.com", password="secret123")
    institution = await create_institution(db_session)
    account = await create_brokerage_account(
        db_session,
        user=user,
        institution=institution,
    )
    asset = await create_asset(db_session)
    headers = await login_headers(client, "list@test.com", "secret123")

    for payment_date, amount in (
        ("2026-03-01", "10.00"),
        ("2026-08-01", "20.00"),
    ):
        response = await client.post(
            "/api/v1/income-events",
            headers=headers,
            json={
                "brokerage_account_id": str(account.id),
                "asset_id": str(asset.id),
                "income_type": "DIVIDEND",
                "gross_amount": amount,
                "tax_withheld": "0",
                "net_amount": amount,
                "payment_date": payment_date,
            },
        )
        assert response.status_code == 201

    filtered = await client.get(
        "/api/v1/income-events",
        headers=headers,
        params={"start_date": date(2026, 1, 1), "end_date": date(2026, 6, 30)},
    )
    assert filtered.status_code == 200
    body = filtered.json()
    assert len(body["items"]) == 1
    assert body["total_net_amount"] == "10.0000"


@pytest.mark.asyncio
async def test_monthly_income_report_filters_by_month_and_asset(
    client: AsyncClient,
    db_session: AsyncSession,
):
    user = await create_user(db_session, email="monthly@test.com", password="secret123")
    institution = await create_institution(db_session)
    account = await create_brokerage_account(
        db_session,
        user=user,
        institution=institution,
    )
    xrm = await create_asset(
        db_session,
        ticker="XRM11",
        name="XReal",
        asset_type="FII",
    )
    other = await create_asset(db_session, ticker="PETR4", name="Petrobras")
    headers = await login_headers(client, "monthly@test.com", "secret123")

    for asset, payment_date, amount in (
        (xrm, "2026-10-15", "100.00"),
        (xrm, "2026-11-10", "50.00"),
        (other, "2026-10-20", "30.00"),
    ):
        response = await client.post(
            "/api/v1/income-events",
            headers=headers,
            json={
                "brokerage_account_id": str(account.id),
                "asset_id": str(asset.id),
                "income_type": "FII_YIELD" if asset.asset_type == "FII" else "DIVIDEND",
                "gross_amount": amount,
                "tax_withheld": "0",
                "net_amount": amount,
                "payment_date": payment_date,
            },
        )
        assert response.status_code == 201

    filtered = await client.get(
        "/api/v1/income-events/monthly",
        headers=headers,
        params={"month": "2026-10", "asset_id": str(xrm.id)},
    )
    assert filtered.status_code == 200
    body = filtered.json()
    assert body["total_net_amount"] == "100.0000"
    assert len(body["items"]) == 1
    assert body["items"][0]["month"] == "2026-10"
    assert body["items"][0]["total_net_amount"] == "100.0000"

    consolidated = await client.get(
        "/api/v1/income-events/monthly",
        headers=headers,
    )
    assert consolidated.status_code == 200
    by_month = {row["month"]: row["total_net_amount"] for row in consolidated.json()["items"]}
    assert by_month["2026-10"] == "130.0000"
    assert by_month["2026-11"] == "50.0000"


@pytest.mark.asyncio
async def test_reinvestment_fii_pending_and_stocks_alert(
    client: AsyncClient,
    db_session: AsyncSession,
):
    user = await create_user(db_session, email="reinv@test.com", password="secret123")
    institution = await create_institution(db_session)
    account = await create_brokerage_account(
        db_session,
        user=user,
        institution=institution,
    )
    xrm = await create_asset(
        db_session,
        ticker="XRM11",
        name="XReal",
        asset_type="FII",
    )
    petr = await create_asset(db_session, ticker="PETR4", name="Petrobras")
    headers = await login_headers(client, "reinv@test.com", "secret123")

    income_nov = await client.post(
        "/api/v1/income-events",
        headers=headers,
        json={
            "brokerage_account_id": str(account.id),
            "asset_id": str(xrm.id),
            "income_type": "FII_YIELD",
            "gross_amount": "100.00",
            "tax_withheld": "0",
            "net_amount": "100.00",
            "payment_date": "2026-11-15",
        },
    )
    assert income_nov.status_code == 201

    for asset, tx_date, qty, price, fees in (
        (xrm, "2026-11-05", "1", "35", "0"),
        (petr, "2026-06-01", "10", "30", "0"),
    ):
        buy = await client.post(
            "/api/v1/transactions",
            headers=headers,
            json={
                "brokerage_account_id": str(account.id),
                "asset_id": str(asset.id),
                "transaction_type": "BUY",
                "quantity": qty,
                "unit_price": price,
                "fees": fees,
                "transaction_date": tx_date,
            },
        )
        assert buy.status_code == 201

    for amount, payment_date in (
        ("2000.00", "2026-05-01"),
        ("1200.00", "2026-08-01"),
    ):
        div = await client.post(
            "/api/v1/income-events",
            headers=headers,
            json={
                "brokerage_account_id": str(account.id),
                "asset_id": str(petr.id),
                "income_type": "DIVIDEND",
                "gross_amount": amount,
                "tax_withheld": "0",
                "net_amount": amount,
                "payment_date": payment_date,
            },
        )
        assert div.status_code == 201

    analysis = await client.get(
        "/api/v1/income-events/reinvestment",
        headers=headers,
        params={"target_month": "2026-11", "year": 2026},
    )
    assert analysis.status_code == 200
    body = analysis.json()
    assert body["fii_reinvestment"]["income_month"] == "2026-11"
    assert body["fii_reinvestment"]["purchase_month"] == "2026-11"
    assert body["fii_reinvestment"]["total_income_received"] == "100.0000"
    assert body["fii_reinvestment"]["total_purchased"] == "35.0000"
    assert body["fii_reinvestment"]["missing_amount"] == "65.0000"
    assert body["fii_reinvestment"]["needs_reinvestment"] is True
    fii_row = body["fii_reinvestment"]["items"][0]
    assert fii_row["ticker"] == "XRM11"
    assert fii_row["income_received"] == "100.0000"
    assert fii_row["amount_purchased"] == "35.0000"
    assert fii_row["missing_amount"] == "65.0000"
    assert fii_row["status"] == "PENDING"

    stocks = body["stocks_smart_invest"]
    assert stocks["total_income_received"] == "3200.0000"
    assert stocks["total_purchased"] == "300.0000"
    assert stocks["missing_amount"] == "2900.0000"
    assert stocks["needs_reinvestment"] is True