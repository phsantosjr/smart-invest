from datetime import date

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import (
    create_asset,
    create_brokerage_account,
    create_household,
    create_institution,
    create_permission,
    create_user,
    login_headers,
)


@pytest.mark.asyncio
async def test_portfolio_average_price_from_buys(
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
    asset = await create_asset(
        db_session,
        name="CSHGLG FII",
        ticker="HGLG11",
        asset_type="FII",
    )
    headers = await login_headers(client, "pf@test.com", "secret123")

    for payload in (
        {
            "quantity": "10",
            "unit_price": "160",
            "fees": "0",
            "transaction_date": "2026-01-05",
        },
        {
            "quantity": "10",
            "unit_price": "150",
            "fees": "2",
            "transaction_date": "2026-02-05",
        },
    ):
        response = await client.post(
            "/api/v1/transactions",
            headers=headers,
            json={
                "brokerage_account_id": str(account.id),
                "asset_id": str(asset.id),
                "transaction_type": "BUY",
                **payload,
            },
        )
        assert response.status_code == 201

    portfolio = await client.get("/api/v1/portfolio", headers=headers)
    assert portfolio.status_code == 200
    positions = portfolio.json()["positions"]
    assert len(positions) == 1
    assert positions[0]["quantity"] == "20.000000"
    assert positions[0]["average_price"] == "155.1000"
    assert positions[0]["invested_amount"] == "3102.0000"


@pytest.mark.asyncio
async def test_household_scope_honors_can_view(
    client: AsyncClient,
    db_session: AsyncSession,
):
    household = await create_household(db_session)
    main_user = await create_user(
        db_session,
        email="main@test.com",
        password="secret123",
        household_id=household.id,
        is_household_owner=True,
    )
    dependent = await create_user(
        db_session,
        email="dep@test.com",
        password="secret123",
        household_id=household.id,
        name="Dependente",
    )
    other_member = await create_user(
        db_session,
        email="other@test.com",
        password="secret123",
        household_id=household.id,
        name="Sem permissão",
    )
    await create_permission(
        db_session,
        owner=dependent,
        viewer=main_user,
        can_view=True,
    )

    institution = await create_institution(db_session)
    dependent_account = await create_brokerage_account(
        db_session,
        user=dependent,
        institution=institution,
        account_number="dep-1",
    )
    other_account = await create_brokerage_account(
        db_session,
        user=other_member,
        institution=institution,
        account_number="other-1",
    )
    asset = await create_asset(db_session, ticker="PETR4", name="Petrobras")

    headers_dependent = await login_headers(client, "dep@test.com", "secret123")
    await client.post(
        "/api/v1/transactions",
        headers=headers_dependent,
        json={
            "brokerage_account_id": str(dependent_account.id),
            "asset_id": str(asset.id),
            "transaction_type": "BUY",
            "quantity": "10",
            "unit_price": "30",
            "fees": "0",
            "transaction_date": "2026-01-01",
        },
    )

    headers_other = await login_headers(client, "other@test.com", "secret123")
    await client.post(
        "/api/v1/transactions",
        headers=headers_other,
        json={
            "brokerage_account_id": str(other_account.id),
            "asset_id": str(asset.id),
            "transaction_type": "BUY",
            "quantity": "50",
            "unit_price": "30",
            "fees": "0",
            "transaction_date": "2026-01-01",
        },
    )

    main_headers = await login_headers(client, "main@test.com", "secret123")
    response = await client.get(
        "/api/v1/portfolio",
        headers=main_headers,
        params={"scope": "household"},
    )

    assert response.status_code == 200
    positions = response.json()["positions"]
    user_ids = {row["user_id"] for row in positions}

    assert str(dependent.id) in user_ids
    assert str(other_member.id) not in user_ids