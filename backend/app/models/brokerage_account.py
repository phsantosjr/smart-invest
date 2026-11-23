import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CreatedAtMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.institution import Institution


class BrokerageAccount(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    __tablename__ = "brokerage_accounts"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "institution_id",
            "account_number",
            name="uq_brokerage_accounts_user_institution_account",
        ),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("institutions.id", ondelete="RESTRICT"),
        nullable=False,
    )
    account_number: Mapped[str] = mapped_column(String(50), nullable=False)
    institution: Mapped["Institution"] = relationship(lazy="raise")