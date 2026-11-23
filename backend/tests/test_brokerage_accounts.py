from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import (
    create_asset,
    create_brokerage_account,
    create_household,
    create_institution,
    create_permission,
    create_transaction,
    create_user,
    login_headers,
)


@pytest.mark.asyncio
async def test_create_brokerage_account(
    client: AsyncClient,
    db_session: AsyncSession,
):
    user = await create_user(db_session, email="user@test.com", password="secret123")
    institution = await create_institution(db_session)
    headers = await login_headers(client, "user@test.com", "secret123")

    response = await client.post(
        "/api/v1/brokerage-accounts",
        headers=headers,
        json={
            "institution_id": str(institution.id),
            "account_number": " 12345 ",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["user_id"] == str(user.id)
    assert body["institution_id"] == str(institution.id)
    assert body["account_number"] == "12345"
    assert body["institution"]["name"] == "XP Investimentos"


@pytest.mark.asyncio
async def test_create_duplicate_account_returns_409(
    client: AsyncClient,
    db_session: AsyncSession,
):
    user = await create_user(db_session, email="user@test.com", password="secret123")
    institution = await create_institution(db_session)
    await create_brokerage_account(
        db_session,
        user=user,
        institution=institution,
        account_number="12345",
    )
    headers = await login_headers(client, "user@test.com", "secret123")

    response = await client.post(
        "/api/v1/brokerage-accounts",
        headers=headers,
        json={
            "institution_id": str(institution.id),
            "account_number": "12345",
        },
    )

    assert response.status_code == 409
    assert "número" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_create_account_invalid_institution(
    client: AsyncClient,
    db_session: AsyncSession,
):
    await create_user(db_session, email="user@test.com", password="secret123")
    headers = await login_headers(client, "user@test.com", "secret123")

    response = await client.post(
        "/api/v1/brokerage-accounts",
        headers=headers,
        json={
            "institution_id": str(uuid4()),
            "account_number": "12345",
        },
    )

    assert response.status_code == 400


@pytest.mark.asyncio
async def test_list_own_accounts_without_filter(
    client: AsyncClient,
    db_session: AsyncSession,
):
    owner = await create_user(db_session, email="owner@test.com", password="secret123")
    other = await create_user(db_session, email="other@test.com", password="secret123")
    institution = await create_institution(db_session)
    await create_brokerage_account(
        db_session, user=owner, institution=institution, account_number="111"
    )
    await create_brokerage_account(
        db_session, user=other, institution=institution, account_number="222"
    )
    headers = await login_headers(client, "owner@test.com", "secret123")

    response = await client.get("/api/v1/brokerage-accounts", headers=headers)

    assert response.status_code == 200
    numbers = [item["account_number"] for item in response.json()]
    assert numbers == ["111"]


@pytest.mark.asyncio
async def test_list_other_member_accounts_with_can_view(
    client: AsyncClient,
    db_session: AsyncSession,
):
    household = await create_household(db_session)
    owner = await create_user(
        db_session,
        email="owner@test.com",
        password="secret123",
        household_id=household.id,
        is_household_owner=True,
    )
    viewer = await create_user(
        db_session,
        email="viewer@test.com",
        password="secret123",
        household_id=household.id,
    )
    institution = await create_institution(db_session)
    await create_brokerage_account(
        db_session, user=owner, institution=institution, account_number="999"
    )
    await create_permission(db_session, owner=owner, viewer=viewer, can_view=True)
    headers = await login_headers(client, "viewer@test.com", "secret123")

    response = await client.get(
        "/api/v1/brokerage-accounts",
        headers=headers,
        params={"user_id": str(owner.id)},
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["account_number"] == "999"
    assert body[0]["user_id"] == str(owner.id)


@pytest.mark.asyncio
async def test_list_other_member_accounts_without_permission_returns_403(
    client: AsyncClient,
    db_session: AsyncSession,
):
    household = await create_household(db_session)
    owner = await create_user(
        db_session,
        email="owner@test.com",
        password="secret123",
        household_id=household.id,
        is_household_owner=True,
    )
    viewer = await create_user(
        db_session,
        email="viewer@test.com",
        password="secret123",
        household_id=household.id,
    )
    await create_permission(db_session, owner=owner, viewer=viewer, can_view=False)
    headers = await login_headers(client, "viewer@test.com", "secret123")

    response = await client.get(
        "/api/v1/brokerage-accounts",
        headers=headers,
        params={"user_id": str(owner.id)},
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_household_owner_can_list_member_accounts(
    client: AsyncClient,
    db_session: AsyncSession,
):
    household = await create_household(db_session)
    owner = await create_user(
        db_session,
        email="owner@test.com",
        password="secret123",
        household_id=household.id,
        is_household_owner=True,
    )
    member = await create_user(
        db_session,
        email="member@test.com",
        password="secret123",
        household_id=household.id,
    )
    institution = await create_institution(db_session)
    await create_brokerage_account(
        db_session, user=member, institution=institution, account_number="777"
    )
    headers = await login_headers(client, "owner@test.com", "secret123")

    response = await client.get(
        "/api/v1/brokerage-accounts",
        headers=headers,
        params={"user_id": str(member.id)},
    )

    assert response.status_code == 200
    assert response.json()[0]["account_number"] == "777"


@pytest.mark.asyncio
async def test_update_own_account(
    client: AsyncClient,
    db_session: AsyncSession,
):
    user = await create_user(db_session, email="user@test.com", password="secret123")
    institution = await create_institution(db_session)
    account = await create_brokerage_account(
        db_session, user=user, institution=institution, account_number="111"
    )
    headers = await login_headers(client, "user@test.com", "secret123")

    response = await client.patch(
        f"/api/v1/brokerage-accounts/{account.id}",
        headers=headers,
        json={"account_number": "222"},
    )

    assert response.status_code == 200
    assert response.json()["account_number"] == "222"


@pytest.mark.asyncio
async def test_cannot_update_another_users_account(
    client: AsyncClient,
    db_session: AsyncSession,
):
    owner = await create_user(db_session, email="owner@test.com", password="secret123")
    await create_user(db_session, email="other@test.com", password="secret123")
    institution = await create_institution(db_session)
    account = await create_brokerage_account(
        db_session, user=owner, institution=institution
    )
    headers = await login_headers(client, "other@test.com", "secret123")

    response = await client.patch(
        f"/api/v1/brokerage-accounts/{account.id}",
        headers=headers,
        json={"account_number": "999"},
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_account_without_history(
    client: AsyncClient,
    db_session: AsyncSession,
):
    user = await create_user(db_session, email="user@test.com", password="secret123")
    institution = await create_institution(db_session)
    account = await create_brokerage_account(
        db_session, user=user, institution=institution
    )
    headers = await login_headers(client, "user@test.com", "secret123")

    response = await client.delete(
        f"/api/v1/brokerage-accounts/{account.id}",
        headers=headers,
    )

    assert response.status_code == 204

    listed = await client.get("/api/v1/brokerage-accounts", headers=headers)
    assert listed.json() == []


@pytest.mark.asyncio
async def test_delete_account_with_transaction_returns_409(
    client: AsyncClient,
    db_session: AsyncSession,
):
    user = await create_user(db_session, email="user@test.com", password="secret123")
    institution = await create_institution(db_session)
    account = await create_brokerage_account(
        db_session, user=user, institution=institution
    )
    asset = await create_asset(db_session)
    await create_transaction(db_session, account=account, asset=asset)
    headers = await login_headers(client, "user@test.com", "secret123")

    response = await client.delete(
        f"/api/v1/brokerage-accounts/{account.id}",
        headers=headers,
    )

    assert response.status_code == 409
    assert "movimentações" in response.json()["detail"].lower()
