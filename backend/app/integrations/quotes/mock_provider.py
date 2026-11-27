from datetime import UTC, datetime
from decimal import Decimal

from app.integrations.quotes.base import MarketQuoteProvider, QuoteResult


class MockQuoteProvider(MarketQuoteProvider):
    @property
    def source_name(self) -> str:
        return "MOCK"

    async def get_quote(self, ticker: str) -> QuoteResult:
        clean = ticker.strip().upper()
        seed = sum(ord(ch) for ch in clean)
        price = Decimal("50.00") + Decimal(seed % 500) / Decimal("10")
        return QuoteResult(
            ticker=clean,
            price=price.quantize(Decimal("0.0001")),
            quoted_at=datetime.now(UTC),
            source=self.source_name,
        )