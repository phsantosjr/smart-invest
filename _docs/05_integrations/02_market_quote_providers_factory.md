# Especificação: Integração de Cotações de Mercado via Factory Pattern

## 1. Objetivo de Negócio

Estabelecer o contrato técnico e operacional para obtenção automatizada ou sob demanda de cotações de ativos negociados em bolsa (Ações, FIIs, ETFs, BDRs) por meio do **Factory Pattern (`QuoteProviderFactory`)**, persistindo cada leitura no histórico imutável `asset_market_prices` com carimbo completo de **data e hora (`TIMESTAMPTZ`)** e origem (`source`), garantindo coexistência perfeita com lançamentos manuais (`source = 'MANUAL'`).

## 2. Escopo e Regras de Negócio

1. **Desacoplamento Total de Provedores:** O domínio da carteira nunca depende diretamente de bibliotecas ou URLs de terceiros (Yahoo Finance, BRAPI, B3 etc.). Toda consulta passa pela interface `MarketQuoteProvider` instanciada via `QuoteProviderFactory`.
2. **Persistência Histórica com Data + Hora (`quoted_at`):**
   * Toda cotação obtida por um provedor externo gera um novo registro em `asset_market_prices` com `price > 0`, `quoted_at` (data/hora da cotação retornada pelo provedor ou timestamp da coleta) e `source` identificando o provedor (ex: `'YAHOO'`, `'BRAPI'`).
3. **Regra Única de Vigência na Home/Dashboard:**
   * Independentemente de a cotação ter origem `MANUAL` ou de integração externa (`YAHOO`, `BRAPI`), o cálculo patrimonial da Home utiliza estritamente o registro mais recente ordenado por `quoted_at DESC, created_at DESC LIMIT 1`.
   * Se um usuário lançar manualmente uma cotação com `quoted_at` mais recente que a última coleta automática, a cotação manual prevalece (e vice-versa).
4. **Escopo de Ativos Elegíveis:**
   * Apenas ativos com `ticker IS NOT NULL` (ex: `STOCK`, `FII`) são consultados nos provedores externos de cotação.
   * Ativos sem ticker (`FIXED_INCOME`, `TREASURY`, `FUND`) são ignorados pelo serviço de cotação externa e seguem o fluxo próprio de `fixed_income_valuations`.
5. **Resiliência e Fallback:**
   * Falhas de rede, *timeout* ou *rate limit* em um provedor externo não devem quebrar o carregamento da carteira. Em caso de indisponibilidade, o sistema mantém a última cotação válida registrada em `asset_market_prices` (ou o Preço Médio como fallback caso nunca tenha havido cotação).

## 3. Arquitetura e Implementação Técnica (Backend FastAPI)

### 3.1. Estrutura de Módulos (`app/integrations/quotes/`)
* `base.py`: Interface abstrata `MarketQuoteProvider` e DTO `QuoteResult`.
* `brapi_provider.py`: Implementação concreta para [BRAPI](https://brapi.dev/).
* `yfinance_provider.py`: Fallback via biblioteca [yfinance](https://github.com/ranaroussi/yfinance) (`{TICKER}.SA`).
* `mock_provider.py`: Provedor determinístico para ambientes de teste automatizado e desenvolvimento offline.
* `factory.py`: `QuoteProviderFactory` selecionando o provedor ativo via variável de ambiente (`MARKET_QUOTE_PROVIDER`).
* `service.py`: `MarketQuoteSyncService` responsável por consultar o provedor, validar o retorno (`Decimal > 0`) e persistir em `asset_market_prices`.

### 3.2. Contrato da Interface e Factory

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
import httpx


@dataclass(frozen=True)
class QuoteResult:
    ticker: str
    price: Decimal
    quoted_at: datetime
    source: str


class MarketQuoteProvider(ABC):
    @property
    @abstractmethod
    def source_name(self) -> str:
        raise NotImplementedError

    @abstractmethod
    async def get_quote(self, ticker: str) -> QuoteResult:
        raise NotImplementedError


class YahooFinanceProvider(MarketQuoteProvider):
    @property
    def source_name(self) -> str:
        return "YAHOO"

    async def get_quote(self, ticker: str) -> QuoteResult:
        clean_ticker = ticker.strip().upper()
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{clean_ticker}.SA"
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            meta = data["chart"]["result"][0]["meta"]
            raw_price = meta["regularMarketPrice"]
            market_ts = meta.get("regularMarketTime")
            quoted_at = (
                datetime.fromtimestamp(market_ts, tz=timezone.utc)
                if market_ts
                else datetime.now(timezone.utc)
            )
            return QuoteResult(
                ticker=clean_ticker,
                price=Decimal(str(raw_price)),
                quoted_at=quoted_at,
                source=self.source_name,
            )


class MockQuoteProvider(MarketQuoteProvider):
    @property
    def source_name(self) -> str:
        return "MOCK"

    async def get_quote(self, ticker: str) -> QuoteResult:
        return QuoteResult(
            ticker=ticker.strip().upper(),
            price=Decimal("100.0000"),
            quoted_at=datetime.now(timezone.utc),
            source=self.source_name,
        )


class QuoteProviderFactory:
    @staticmethod
    def get_provider(provider_name: str) -> MarketQuoteProvider:
        normalized = provider_name.strip().lower()
        if normalized == "yahoo":
            return YahooFinanceProvider()
        if normalized == "mock":
            return MockQuoteProvider()
        raise ValueError(f"Provedor de cotação não suportado: {provider_name}")
```

## 4. Endpoints da API (FastAPI)

### 4.1. Sincronizar Cotação Sob Demanda (`POST /api/v1/market-prices/sync`)
* **Descrição:** Dispara atualização sob demanda para um ativo específico (`asset_id`) ou para todos os ativos com `ticker` ativo na carteira do usuário autenticado utilizando o provedor configurado na `QuoteProviderFactory`.
* **Request Body (Opcional):**
```json
{
  "asset_ids": ["uuid-petr4", "uuid-hglg11"]
}
```
* **Response (`200 OK`):**
```json
{
  "provider": "YAHOO",
  "updated_count": 2,
  "failed_tickers": []
}
```

## 5. Critérios de Aceite (BDD)

* **Cenário 1 — Resolução de provedor via Factory Pattern**
  * **Given** que a configuração `MARKET_QUOTE_PROVIDER` está definida como `"yahoo"` (ou `"mock"`),
  * **When** o serviço de cotações solicita uma instância a `QuoteProviderFactory.get_provider()`,
  * **Then** a fábrica retorna a implementação concreta correspondente sem expor detalhes HTTP ao domínio da carteira.

* **Cenário 2 — Persistência de cotação automática com data/hora e origem**
  * **Given** que o ativo `PETR4` está cadastrado com `ticker = "PETR4"`,
  * **When** a sincronização executa com sucesso retornando preço `38.90` e timestamp `2026-11-27T15:30:00Z`,
  * **Then** um novo registro é inserido em `asset_market_prices` com `price = 38.9000`, `quoted_at = 2026-11-27T15:30:00Z` e `source = "YAHOO"`.

* **Cenário 3 — Resiliência quando o provedor externo falha**
  * **Given** que o provedor externo retorna erro HTTP `503` ou timeout durante uma tentativa de sincronização,
  * **When** o serviço processa o ativo,
  * **Then** o erro é registrado em log estruturado, o ticker é listado em `failed_tickers` e o cálculo patrimonial da Home continua funcionando normalmente usando a última cotação válida existente no banco.

* **Cenário 4 — Ignorar ativos sem ticker (Renda Fixa)**
  * **Given** que o usuário possui títulos de Renda Fixa com `ticker = NULL`,
  * **When** a sincronização de cotações de mercado é executada,
  * **Then** esses ativos não são enviados ao provedor externo de bolsa.

## 6. Dependências e Próximos Passos
* **Configuração:** `MARKET_QUOTE_PROVIDER` (padrão `"mock"` em dev/testes e `"brapi"` em produção), `BRAPI_TOKEN` obrigatório com BRAPI, `MARKET_QUOTE_FALLBACK_ENABLED` (yfinance), agendamento diário 19:00 `America/Sao_Paulo` (`MARKET_QUOTE_SCHEDULE_*`).
* **Backend:** `app/integrations/quotes/`, `POST /api/v1/market-prices/sync`, `GET /api/v1/market-prices/sync-runs`, tabela `market_quote_sync_runs`.
* **Frontend:** Botão **Atualizar cotações** na carteira, rota `/market-quotes/logs` para histórico de execuções (investidor: só as próprias; superuser: todas).