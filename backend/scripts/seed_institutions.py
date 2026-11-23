"""Seed the Brazilian institutions catalog used by brokerage accounts."""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from app.core.database import async_session_factory
from app.models.institution import Institution

SEED_INSTITUTIONS: tuple[dict[str, str | None], ...] = (
    {"name": "XP Investimentos", "code": "102", "institution_type": "BROKERAGE"},
    {"name": "Banco Inter", "code": "077", "institution_type": "BOTH"},
    {"name": "BTG Pactual", "code": "208", "institution_type": "BOTH"},
    {"name": "NuInvest / Nubank", "code": "260", "institution_type": "BOTH"},
    {"name": "Itaú", "code": "341", "institution_type": "BANK"},
    {"name": "Clear", "code": None, "institution_type": "BROKERAGE"},
    {"name": "Rico", "code": None, "institution_type": "BROKERAGE"},
)


async def seed() -> None:
    async with async_session_factory() as session:
        created = 0
        for item in SEED_INSTITUTIONS:
            result = await session.execute(
                select(Institution).where(Institution.name == item["name"])
            )
            if result.scalar_one_or_none() is not None:
                continue
            session.add(
                Institution(
                    name=item["name"],
                    code=item["code"],
                    institution_type=item["institution_type"],
                )
            )
            created += 1
        await session.commit()
        print(f"Institutions seeded. Created: {created}.")


def main() -> None:
    asyncio.run(seed())


if __name__ == "__main__":
    main()
