"""Create local dev user admin@local.test / changeme123 if missing."""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from app.core.database import async_session_factory
from app.core.security import hash_password
from app.models.user import User

DEV_EMAIL = "ph@phgr.tech"
DEV_PASSWORD = ""


async def seed() -> None:
    async with async_session_factory() as session:
        result = await session.execute(select(User).where(User.email == DEV_EMAIL))
        existing = result.scalar_one_or_none()
        if existing is not None:
            print(f"User already exists: {DEV_EMAIL}")
            return

        user = User(
            name="Paulo Henrique",
            email=DEV_EMAIL,
            password_hash=hash_password(DEV_PASSWORD),
            is_2fa_enabled=False,
        )
        session.add(user)
        await session.commit()
        print(f"Created dev user: {DEV_EMAIL}")


def main() -> None:
    asyncio.run(seed())


if __name__ == "__main__":
    main()