from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.household_permission import HouseholdPermission
from app.models.user import User
from app.services.errors import DomainError

PortfolioScope = str  # "self" | "household"


async def assert_can_view_user_accounts(
    session: AsyncSession,
    viewer: User,
    target_user_id: UUID,
) -> None:
    """Raise 403 unless the viewer may list the target user's brokerage accounts.

    Own accounts are always allowed. Cross-member access requires the same
    household and either household ownership or an explicit can_view grant.
    """
    if viewer.id == target_user_id:
        return

    target = await session.get(User, target_user_id)
    if (
        target is None
        or viewer.household_id is None
        or target.household_id is None
        or viewer.household_id != target.household_id
    ):
        raise DomainError("Sem permissão para consultar contas deste usuário.", 403)

    if viewer.is_household_owner:
        return

    stmt = select(HouseholdPermission.id).where(
        HouseholdPermission.owner_user_id == target_user_id,
        HouseholdPermission.viewer_user_id == viewer.id,
        HouseholdPermission.can_view.is_(True),
    )
    permission_id = await session.scalar(stmt)
    if permission_id is None:
        raise DomainError("Sem permissão para consultar contas deste usuário.", 403)


async def resolve_portfolio_user_ids(
    session: AsyncSession,
    viewer: User,
    *,
    scope: PortfolioScope = "self",
    target_user_id: UUID | None = None,
) -> list[UUID]:
    """Return user IDs whose portfolio positions the viewer may query."""
    if target_user_id is not None:
        await assert_can_view_user_accounts(session, viewer, target_user_id)
        return [target_user_id]

    if scope == "household":
        ids: list[UUID] = [viewer.id]
        if viewer.household_id is None:
            return ids

        stmt = select(HouseholdPermission.owner_user_id).where(
            HouseholdPermission.viewer_user_id == viewer.id,
            HouseholdPermission.can_view.is_(True),
        )
        owner_ids = list(await session.scalars(stmt))

        for owner_id in owner_ids:
            owner = await session.get(User, owner_id)
            if (
                owner is not None
                and owner.household_id is not None
                and owner.household_id == viewer.household_id
                and owner_id not in ids
            ):
                ids.append(owner_id)
        return ids

    return [viewer.id]
