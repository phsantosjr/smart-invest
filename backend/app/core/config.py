from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEFAULT_DATABASE_URL = (
    "postgresql+asyncpg://smart_invest:smart_invest_change_me@localhost:25030/smart_invest"
)
_DEFAULT_DATABASE_URL_SYNC = (
    "postgresql://smart_invest:smart_invest_change_me@localhost:25030/smart_invest"
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = Field(
        default=_DEFAULT_DATABASE_URL,
        validation_alias="DATABASE_URL",
    )
    database_url_sync: str = Field(
        default=_DEFAULT_DATABASE_URL_SYNC,
        validation_alias="DATABASE_URL_SYNC",
    )

    jwt_secret_key: str = Field(
        default="change-me-use-openssl-rand-hex-32",
        validation_alias="JWT_SECRET_KEY",
        min_length=16,
    )
    jwt_algorithm: str = "HS256"
    jwt_access_expire_minutes: int = Field(
        default=60 * 24,
        validation_alias="JWT_ACCESS_EXPIRE_MINUTES",
    )
    jwt_2fa_challenge_expire_minutes: int = Field(
        default=5,
        validation_alias="JWT_2FA_CHALLENGE_EXPIRE_MINUTES",
    )

    api_v1_prefix: str = "/api/v1"
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
    )

    market_quote_provider: str = Field(
        default="mock",
        validation_alias="MARKET_QUOTE_PROVIDER",
    )
    brapi_token: str = Field(default="", validation_alias="BRAPI_TOKEN")
    market_quote_fallback_enabled: bool = Field(
        default=True,
        validation_alias="MARKET_QUOTE_FALLBACK_ENABLED",
    )
    market_quote_schedule_enabled: bool = Field(
        default=True,
        validation_alias="MARKET_QUOTE_SCHEDULE_ENABLED",
    )
    market_quote_schedule_timezone: str = Field(
        default="America/Sao_Paulo",
        validation_alias="MARKET_QUOTE_SCHEDULE_TIMEZONE",
    )
    market_quote_schedule_hour: int = Field(
        default=19,
        validation_alias="MARKET_QUOTE_SCHEDULE_HOUR",
    )
    market_quote_schedule_minute: int = Field(
        default=0,
        validation_alias="MARKET_QUOTE_SCHEDULE_MINUTE",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()