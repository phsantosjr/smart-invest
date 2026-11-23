from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, CreatedAtMixin, UUIDPrimaryKeyMixin


class Household(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    __tablename__ = "households"

    name: Mapped[str] = mapped_column(String(150), nullable=False)