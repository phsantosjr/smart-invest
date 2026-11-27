from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal


@dataclass(frozen=True)
class QuoteResult:
    ticker: str
    price: Decimal
    quoted_at: datetime
    source: str


class QuoteProviderError(Exception):
    """Raised when an external quote provider cannot return a valid price."""


class MarketQuoteProvider(ABC):
    @property
    @abstractmethod
    def source_name(self) -> str:
        raise NotImplementedError

    @abstractmethod
    async def get_quote(self, ticker: str) -> QuoteResult:
        raise NotImplementedError