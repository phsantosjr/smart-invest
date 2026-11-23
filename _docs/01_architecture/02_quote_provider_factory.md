---

### Arquivo: `_docs/01_architecture/02_quote_provider_factory.md`

```markdown
# Design Pattern: Factory para Provedores de Cotação

## 1. Motivação
Fontes públicas ou comerciais de cotação de mercado podem sofrer instabilidade, mudanças de rate-limit ou alterações de payload. O uso do **Factory Pattern** isola a lógica de integração externa atrás de uma interface comum (`MarketQuoteProvider`), permitindo adicionar ou substituir provedores sem alterar as regras de negócio da carteira.

## 2. Componentes do Padrão
* **Interface (`MarketQuoteProvider`):** Define o contrato assíncrono `get_price(ticker: str) -> Decimal`.
* **Produtos Concretos:** Implementações específicas (ex: `YahooFinanceProvider`, `MockQuoteProvider`, e futuros provedores como B3/API comercial).
* **Fábrica (`QuoteProviderFactory`):** Instancia e retorna o provedor adequado com base na configuração ativa da aplicação.

## 3. Exemplo de Implementação
```python
from abc import ABC, abstractmethod
from decimal import Decimal
import httpx


class MarketQuoteProvider(ABC):
    @abstractmethod
    async def get_price(self, ticker: str) -> Decimal:
        raise NotImplementedError


class YahooFinanceProvider(MarketQuoteProvider):
    async def get_price(self, ticker: str) -> Decimal:
        url = f"[https://query1.finance.yahoo.com/v8/finance/chart/](https://query1.finance.yahoo.com/v8/finance/chart/){ticker}.SA"
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            raw_price = data["chart"]["result"][0]["meta"]["regularMarketPrice"]
            return Decimal(str(raw_price))


class MockQuoteProvider(MarketQuoteProvider):
    async def get_price(self, ticker: str) -> Decimal:
        return Decimal("100.0000")


class QuoteProviderFactory:
    @staticmethod
    def get_provider(provider_name: str) -> MarketQuoteProvider:
        normalized = provider_name.strip().lower()
        if normalized == "yahoo":
            return YahooFinanceProvider()
        if normalized == "mock":
            return MockQuoteProvider()
        raise ValueError(f"Provedor de cotação não suportado: {provider_name}")