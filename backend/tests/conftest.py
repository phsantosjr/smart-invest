import os

# Ensure settings validate before app modules load (backend/.env may set a short JWT).
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret-key-for-pytest-only")
os.environ.setdefault("MARKET_QUOTE_PROVIDER", "mock")
os.environ.setdefault("MARKET_QUOTE_SCHEDULE_ENABLED", "false")
if len(os.environ["JWT_SECRET_KEY"]) < 16:
    os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-key-for-pytest-only"

from collections.abc import AsyncGenerator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import app.models  # noqa: F401 — register all tables on Base.metadata
from app.core.database import get_db
from app.core.security import hash_password
from app.main import app
from app.models.asset import Asset
from app.models.base import Base
from app.models.brokerage_account import BrokerageAccount
from app.models.household import Household
from app.models.household_permission import HouseholdPermission
from app.models.institution import Institution
from app.models.transaction import Transaction
from app.models.user import User


@pytest_asyncio.fixture
async def db_engine():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    session_factory = async_sessionmaker(
        db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    async with session_factory() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


async def create_user(
    session: AsyncSession,
    *,
    email: str,
    password: str,
    name: str = "Test User",
    is_2fa_enabled: bool = False,
    two_factor_secret: str | None = None,
    household_id=None,
    is_household_owner: bool = False,
    is_superuser: bool = False,
) -> User:
    user = User(
        name=name,
        email=email.lower(),
        password_hash=hash_password(password),
        is_2fa_enabled=is_2fa_enabled,
        two_factor_secret=two_factor_secret,
        household_id=household_id,
        is_household_owner=is_household_owner,
        is_superuser=is_superuser,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def login_headers(client: AsyncClient, email: str, password: str) -> dict[str, str]:
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def create_household(session: AsyncSession, name: str = "Família Teste") -> Household:
    household = Household(name=name)
    session.add(household)
    await session.commit()
    await session.refresh(household)
    return household


async def create_institution(
    session: AsyncSession,
    *,
    name: str = "XP Investimentos",
    code: str | None = "102",
    institution_type: str = "BROKERAGE",
) -> Institution:
    institution = Institution(name=name, code=code, institution_type=institution_type)
    session.add(institution)
    await session.commit()
    await session.refresh(institution)
    return institution


async def create_brokerage_account(
    session: AsyncSession,
    *,
    user: User,
    institution: Institution,
    account_number: str = "12345",
) -> BrokerageAccount:
    account = BrokerageAccount(
        user_id=user.id,
        institution_id=institution.id,
        account_number=account_number,
    )
    session.add(account)
    await session.commit()
    await session.refresh(account)
    return account


async def create_permission(
    session: AsyncSession,
    *,
    owner: User,
    viewer: User,
    can_view: bool,
) -> HouseholdPermission:
    permission = HouseholdPermission(
        owner_user_id=owner.id,
        viewer_user_id=viewer.id,
        can_view=can_view,
    )
    session.add(permission)
    await session.commit()
    await session.refresh(permission)
    return permission


async def create_asset(
    session: AsyncSession,
    *,
    name: str = "Petrobras PN",
    ticker: str | None = "PETR4",
    asset_type: str = "STOCK",
) -> Asset:
    asset = Asset(ticker=ticker, name=name, asset_type=asset_type)
    session.add(asset)
    await session.commit()
    await session.refresh(asset)
    return asset


async def create_transaction(
    session: AsyncSession,
    *,
    account: BrokerageAccount,
    asset: Asset,
) -> Transaction:
    from datetime import date
    from decimal import Decimal

    transaction = Transaction(
        brokerage_account_id=account.id,
        asset_id=asset.id,
        transaction_type="BUY",
        quantity=Decimal("10"),
        unit_price=Decimal("30.00"),
        total_amount=Decimal("300.00"),
        transaction_date=date(2026, 1, 15),
    )
    session.add(transaction)
    await session.commit()
    await session.refresh(transaction)
    return transaction