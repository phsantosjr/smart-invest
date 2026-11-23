import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import create_institution, create_user, login_headers


@pytest.mark.asyncio
async def test_list_institutions_requires_auth(client: AsyncClient):
    response = await client.get("/api/v1/institutions")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_institutions_ordered_by_name(
    client: AsyncClient,
    db_session: AsyncSession,
):
    await create_user(db_session, email="user@test.com", password="secret123")
    await create_institution(db_session, name="XP Investimentos", code="102")
    await create_institution(
        db_session,
        name="Banco Inter",
        code="077",
        institution_type="BOTH",
    )
    headers = await login_headers(client, "user@test.com", "secret123")

    response = await client.get("/api/v1/institutions", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert [item["name"] for item in body] == ["Banco Inter", "XP Investimentos"]
    assert set(body[0].keys()) == {"id", "name", "code", "institution_type"}
    assert body[0]["institution_type"] == "BOTH"
    assert body[1]["code"] == "102"
