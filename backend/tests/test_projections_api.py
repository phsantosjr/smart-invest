from datetime import date
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import (
    create_asset,
    create_brokerage_account,
    create_institution,
    create_transaction,
    create_user,
    login_headers,
)


@pytest.mark.asyncio
async def test_projection_fii_requires_positions_and_yield(
    client: AsyncClient,
    db_session: AsyncSession,
):
    user = await create_user(db_session, email="proj@test.com", password="secret123")
    institution = await create_institution(db_session)
    account = await create_brokerage_account(db_session, user=user, institution=institution)
    asset = await create_asset(db_session, ticker="HGLG11", name="CSHG", asset_type="FII")
    headers = await login_headers(client, "proj@test.com", "secret123")

    empty = await client.post(
        "/api/v1/projections/run",
        headers=headers,
        json={
            "asset_scope": "FII",
            "monthly_contribution": "100.00",
            "horizon_years": 1,
            "group_by": "month",
            "allocate_contribution_by_last_dividend": True,
        },
    )
    assert empty.status_code == 422

    await create_transaction(db_session, account=account, asset=asset)

    no_yield = await client.post(
        "/api/v1/projections/run",
        headers=headers,
        json={
            "asset_scope": "FII",
            "monthly_contribution": "100.00",
            "horizon_years": 1,
            "group_by": "month",
        },
    )
    assert no_yield.status_code == 200
    assert any("Sem provento cadastrado" in n for n in no_yield.json()["notes"])

    await client.post(
        "/api/v1/income-events",
        headers=headers,
        json={
            "brokerage_account_id": str(account.id),
            "asset_id": str(asset.id),
            "income_type": "FII_YIELD",
            "gross_amount": "10.00",
            "tax_withheld": "0",
            "net_amount": "10.00",
            "payment_date": "2026-11-01",
        },
    )

    ok = await client.post(
        "/api/v1/projections/run",
        headers=headers,
        json={
            "asset_scope": "FII",
            "monthly_contribution": "500.00",
            "horizon_years": 1,
            "group_by": "month",
            "allocate_contribution_by_last_dividend": False,
        },
    )
    assert ok.status_code == 200
    body = ok.json()
    assert body["months_simulated"] == 12
    assert len(body["periods"]) == 12
    assert body["summary"]["final_patrimony"] > body["summary"]["initial_patrimony"]
    assert len(body["chart_bars"]) == 12