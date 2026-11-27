from datetime import UTC, datetime, timezone
from decimal import Decimal

import httpx

from app.integrations.quotes.base import MarketQuoteProvider, QuoteProviderError, QuoteResult


class BrapiQuoteProvider(MarketQuoteProvider):
    def __init__(self, *, token: str, timeout_seconds: float = 12.0) -> None:
        self._token = token.strip()
        self._timeout = timeout_seconds

    @property
    def source_name(self) -> str:
        return "BRAPI"

    async def get_quote(self, ticker: str) -> QuoteResult:
        if not self._token:
            raise QuoteProviderError("BRAPI_TOKEN não configurado.")

        clean = ticker.strip().upper()
        url = f"https://brapi.dev/api/quote/{clean}"
        params = {"token": self._token}

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.get(url, params=params)

        if response.status_code >= 400:
            raise QuoteProviderError(
                f"BRAPI HTTP {response.status_code} para {clean}",
            )

        payload = response.json()
        results = payload.get("results") or []
        if not results:
            raise QuoteProviderError(f"BRAPI sem cotação para {clean}")

        row = results[0]
        raw_price = row.get("regularMarketPrice")
        if raw_price is None:
            raise QuoteProviderError(f"BRAPI preço ausente para {clean}")

        price = Decimal(str(raw_price))
        if price <= 0:
            raise QuoteProviderError(f"BRAPI preço inválido para {clean}")

        market_ts = row.get("regularMarketTime")
        if market_ts is not None:
            quoted_at = datetime.fromtimestamp(float(market_ts), tz=timezone.utc)
        else:
            quoted_at = datetime.now(UTC)

        return QuoteResult(
            ticker=clean,
            price=price,
            quoted_at=quoted_at,
            source=self.source_name,
        )