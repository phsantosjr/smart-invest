from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, CreatedAtMixin, UUIDPrimaryKeyMixin


class Institution(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    __tablename__ = "institutions"

    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    institution_type: Mapped[str] = mapped_column(String(30), nullable=False)