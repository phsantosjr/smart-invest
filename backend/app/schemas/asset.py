from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

AssetTypeLiteral = Literal["STOCK", "FII", "TREASURY", "FIXED_INCOME", "FUND"]

VARIABLE_INCOME_TYPES = frozenset({"STOCK", "FII"})


def _normalize_optional_ticker(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    if not stripped:
        return None
    return stripped.upper()


class AssetBaseFields(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    asset_type: AssetTypeLiteral
    ticker: str | None = Field(default=None, max_length=20)
    issuer: str | None = Field(default=None, max_length=100)
    maturity_date: date | None = None
    indexer: str | None = Field(default=None, max_length=50)

    @field_validator("name", "issuer", "indexer", mode="before")
    @classmethod
    def strip_optional_strings(cls, value: object) -> object:
        if value is None:
            return None
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value

    @field_validator("ticker", mode="before")
    @classmethod
    def normalize_ticker(cls, value: object) -> str | None:
        if value is None:
            return None
        if isinstance(value, str):
            return _normalize_optional_ticker(value)
        return value

    @model_validator(mode="after")
    def validate_ticker_for_type(self) -> "AssetBaseFields":
        if self.asset_type in VARIABLE_INCOME_TYPES and not self.ticker:
            raise ValueError(
                "Ativos de renda variável (STOCK, FII) exigem ticker válido.",
            )
        return self


class AssetCreate(AssetBaseFields):
    pass


class AssetUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    asset_type: AssetTypeLiteral | None = None
    ticker: str | None = Field(default=None, max_length=20)
    issuer: str | None = Field(default=None, max_length=100)
    maturity_date: date | None = None
    indexer: str | None = Field(default=None, max_length=50)

    @field_validator("name", "issuer", "indexer", mode="before")
    @classmethod
    def strip_optional_strings(cls, value: object) -> object:
        if value is None:
            return None
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value

    @field_validator("ticker", mode="before")
    @classmethod
    def normalize_ticker(cls, value: object) -> str | None:
        if value is None:
            return None
        if isinstance(value, str):
            return _normalize_optional_ticker(value)
        return value


class AssetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    ticker: str | None
    name: str
    asset_type: str
    issuer: str | None = None
    maturity_date: date | None = None
    indexer: str | None = None
    created_at: datetime