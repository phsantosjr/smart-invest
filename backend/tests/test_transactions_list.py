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
from app.models.transaction import Transaction


@pytest.mark.asyncio
async def test_list_transactions_for_user_accounts(
    client: AsyncClient,
    db_session: AsyncSession,
):
    user = await create_user(db_session, email="list@test.com", password="secret123")
    other = await create_user(db_session, email="other@test.com", password="secret123")
    institution = await create_institution(db_session)
    account = await create_brokerage_account(
        db_session,
        user=user,
        institution=institution,
        account_number="111",
    )
    foreign_account = await create_brokerage_account(
        db_session,
        user=other,
        institution=institution,
        account_number="222",
    )
    asset = await create_asset(db_session, ticker="PETR4", name="Petrobras PN")

    tx = Transaction(
        brokerage_account_id=account.id,
        asset_id=asset.id,
        transaction_type="BUY",
        quantity=Decimal("10"),
        unit_price=Decimal("30"),
        fees=Decimal("0"),
        total_amount=Decimal("300"),
        transaction_date=date(2026, 3, 1),
    )
    db_session.add(tx)

    foreign_tx = Transaction(
        brokerage_account_id=foreign_account.id,
        asset_id=asset.id,
        transaction_type="BUY",
        quantity=Decimal("5"),
        unit_price=Decimal("30"),
        fees=Decimal("0"),
        total_amount=Decimal("150"),
        transaction_date=date(2026, 3, 2),
    )
    db_session.add(foreign_tx)
    await db_session.commit()

    headers = await login_headers(client, "list@test.com", "secret123")
    response = await client.get("/api/v1/transactions", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["page"] == 1
    assert body["page_size"] == 20
    assert len(body["items"]) == 1
    assert body["items"][0]["asset"]["ticker"] == "PETR4"
    assert body["items"][0]["brokerage_account"]["account_number"] == "111"

    filtered = await client.get(
        "/api/v1/transactions",
        headers=headers,
        params={"brokerage_account_id": str(account.id)},
    )
    assert filtered.status_code == 200
    assert len(filtered.json()["items"]) == 1


@pytest.mark.asyncio
async def test_list_transactions_pagination(
    client: AsyncClient,
    db_session: AsyncSession,
):
    user = await create_user(db_session, email="page@test.com", password="secret123")
    institution = await create_institution(db_session)
    account = await create_brokerage_account(
        db_session,
        user=user,
        institution=institution,
        account_number="333",
    )
    asset = await create_asset(db_session, ticker="VALE3", name="Vale")

    for day in range(1, 6):
        db_session.add(
            Transaction(
                brokerage_account_id=account.id,
                asset_id=asset.id,
                transaction_type="BUY",
                quantity=Decimal("1"),
                unit_price=Decimal("10"),
                fees=Decimal("0"),
                total_amount=Decimal("10"),
                transaction_date=date(2026, 4, day),
            ),
        )
    await db_session.commit()

    headers = await login_headers(client, "page@test.com", "secret123")
    page1 = await client.get(
        "/api/v1/transactions",
        headers=headers,
        params={"page": 1, "page_size": 2},
    )
    assert page1.status_code == 200
    payload = page1.json()
    assert payload["total"] == 5
    assert len(payload["items"]) == 2

    page3 = await client.get(
        "/api/v1/transactions",
        headers=headers,
        params={"page": 3, "page_size": 2},
    )
    assert page3.status_code == 200
    assert len(page3.json()["items"]) == 1