from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.institution import InstitutionRead


def _normalize_account_number(value: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise ValueError("Número da conta é obrigatório.")
    return normalized


class BrokerageAccountCreate(BaseModel):
    institution_id: UUID
    account_number: str = Field(min_length=1, max_length=50)

    @field_validator("account_number")
    @classmethod
    def strip_account_number(cls, value: str) -> str:
        return _normalize_account_number(value)


class BrokerageAccountUpdate(BaseModel):
    institution_id: UUID | None = None
    account_number: str | None = Field(default=None, min_length=1, max_length=50)

    @field_validator("account_number")
    @classmethod
    def strip_account_number(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return _normalize_account_number(value)


class BrokerageAccountRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    institution_id: UUID
    account_number: str
    created_at: datetime
    institution: InstitutionRead
