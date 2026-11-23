from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.institution import Institution


async def list_institutions(session: AsyncSession) -> list[Institution]:
    stmt = select(Institution).order_by(Institution.name.asc())
    result = await session.execute(stmt)
    return list(result.scalars().all())
