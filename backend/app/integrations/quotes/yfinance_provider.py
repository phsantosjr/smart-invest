import asyncio
from datetime import UTC, datetime, timezone
from decimal import Decimal

from app.integrations.quotes.base import MarketQuoteProvider, QuoteProviderError, QuoteResult


def _fetch_yfinance_quote_sync(ticker: str) -> QuoteResult:
    import yfinance as yf

    clean = ticker.strip().upper()
    symbol = f"{clean}.SA"
    ticker_obj = yf.Ticker(symbol)
    fast = getattr(ticker_obj, "fast_info", None)
    raw_price = None
    market_ts = None

    if fast is not None:
        raw_price = fast.get("lastPrice") or fast.get("regularMarketPrice")
        market_ts = fast.get("regularMarketTime") or fast.get("lastMarketTime")

    if raw_price is None:
        history = ticker_obj.history(period="1d")
        if history.empty:
            raise QuoteProviderError(f"yfinance sem cotação para {clean}")
        raw_price = float(history["Close"].iloc[-1])

    price = Decimal(str(raw_price))
    if price <= 0:
        raise QuoteProviderError(f"yfinance preço inválido para {clean}")

    if market_ts is not None:
        quoted_at = datetime.fromtimestamp(float(market_ts), tz=timezone.utc)
    else:
        quoted_at = datetime.now(UTC)

    return QuoteResult(
        ticker=clean,
        price=price,
        quoted_at=quoted_at,
        source="YAHOO",
    )


class YFinanceQuoteProvider(MarketQuoteProvider):
    @property
    def source_name(self) -> str:
        return "YAHOO"

    async def get_quote(self, ticker: str) -> QuoteResult:
        try:
            return await asyncio.to_thread(_fetch_yfinance_quote_sync, ticker)
        except QuoteProviderError:
            raise
        except Exception as exc:  # noqa: BLE001 — boundary for third-party lib
            clean = ticker.strip().upper()
            raise QuoteProviderError(f"yfinance falhou para {clean}: {exc}") from exc