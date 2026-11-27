from app.core.config import get_settings
from app.integrations.quotes.base import MarketQuoteProvider
from app.integrations.quotes.brapi_provider import BrapiQuoteProvider
from app.integrations.quotes.mock_provider import MockQuoteProvider
from app.integrations.quotes.yfinance_provider import YFinanceQuoteProvider


class QuoteProviderFactory:
    @staticmethod
    def get_provider(provider_name: str | None = None) -> MarketQuoteProvider:
        settings = get_settings()
        normalized = (provider_name or settings.market_quote_provider).strip().lower()
        if normalized == "mock":
            return MockQuoteProvider()
        if normalized == "brapi":
            return BrapiQuoteProvider(token=settings.brapi_token)
        if normalized in {"yahoo", "yfinance"}:
            return YFinanceQuoteProvider()
        raise ValueError(f"Provedor de cotação não suportado: {normalized}")

    @staticmethod
    def get_fallback_provider() -> MarketQuoteProvider:
        return YFinanceQuoteProvider()