# Especificação: Controle de Cotação Atual e Cálculo Patrimonial

## 1. Objetivo de Negócio

Permitir o registro histórico e manual das cotações de mercado dos ativos negociados em bolsa (Ações, FIIs, ETFs, BDRs) com carimbo completo de **data e hora (`TIMESTAMPTZ`)**, garantindo que o cálculo do patrimônio atual exibido na Home/Dashboard utilize sempre o registro mais recente por ativo e preparando a base para futuras integrações automáticas via `QuoteProviderFactory`.

## 2. Regras de Negócio Fundamentais

1. **Histórico Imutável de Cotações (`asset_market_prices`):**
   * Cada atualização de preço gera um novo registro histórico contendo o ativo (`asset_id`), o preço unitário (`price`), a data/hora de referência (`quoted_at`) e a origem do dado (`source`, ex: `'MANUAL'`, `'YAHOO'`, `'B3'`).

2. **Regra do Registro Mais Recente (Latest by `quoted_at`):**
   * O cálculo do valor de mercado atual de qualquer posição em renda variável na Home/Dashboard deve selecionar estritamente o registro de `asset_market_prices` com o maior `quoted_at` (`ORDER BY quoted_at DESC, created_at DESC LIMIT 1`) para o respectivo `asset_id`.
   * Lançamentos retroativos com `quoted_at` anterior a um registro já existente são preservados no histórico, mas não sobrescrevem o valor vigente na Home.

3. **Fallback Quando Não Houver Cotação Registrada:**
   * Se um ativo ainda não possuir nenhum registro em `asset_market_prices`, o sistema deve utilizar o **Preço Médio** calculado a partir das compras/vendas como valor de referência provisório (indicando variação `0,00%` e sinalizando ausência de cotação de mercado), evitando que o patrimônio fique zerado incorretamente.

4. **Cálculo Patrimonial na Home/Dashboard:**
   * **Ativos com Cotação (`STOCK`, `FII`, etc.):**
     $$\text{Valor Atual} = \text{Quantidade Líquida} \times \text{Última Cotação (\texttt{quoted\_at} mais recente)}$$
   * **Ativos de Renda Fixa / Sem Ticker (`FIXED_INCOME`, `TREASURY`):**
     $$\text{Valor Atual} = \text{Último Saldo Bruto (`current_value`)}$$
     registrado em `fixed_income_valuations` (ordenado por `valuation_date DESC, created_at DESC`).
     O **valor aplicado** (`applied_value`) representa o capital inicial da posição quando não há compras em `transactions`; em atualizações subsequentes de saldo, o sistema reutiliza o `applied_value` da primeira marcação da dupla conta+ativo para calcular ganho/perda patrimonial.
   * **Patrimônio Total:** Soma do Valor Atual de todas as posições ativas ($\text{Quantidade Líquida} > 0$) das contas visíveis ao usuário (próprias + *household* com `can_view = true`).

5. **Preparação para Integração Futura (API):**
   * O campo `source` distingue registros lançados manualmente (`MANUAL`) de futuros registros ingeridos automaticamente via `QuoteProviderFactory` (`YAHOO`, `BRAPI`, `B3`), sem exigir alteração no modelo de dados nem nas queries de consolidação da Home.

## 3. Modelo de Dados (PostgreSQL 18)

### 3.1. DDL da Tabela `asset_market_prices`

```sql
CREATE TABLE asset_market_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    price NUMERIC(18, 4) NOT NULL,
    quoted_at TIMESTAMP WITH TIME ZONE NOT NULL, -- Data + Hora da cotação
    source VARCHAR(30) NOT NULL DEFAULT 'MANUAL', -- 'MANUAL', 'YAHOO', 'B3', etc.
    recorded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT chk_market_price_positive CHECK (price > 0)
);

-- Índice composto para busca ultra-rápida da cotação mais recente por ativo
CREATE INDEX idx_asset_market_prices_latest
ON asset_market_prices (asset_id, quoted_at DESC, created_at DESC);
```

### 3.2. Query de Consolidação da Posição + Última Cotação (PostgreSQL 18)

Uso de `LEFT JOIN LATERAL` aproveitando o índice `idx_asset_market_prices_latest`:

```sql
SELECT
    a.id AS asset_id,
    a.ticker,
    a.name,
    a.asset_type,
    pos.net_quantity,
    pos.avg_price,
    COALESCE(latest_quote.price, pos.avg_price) AS current_price,
    latest_quote.quoted_at AS last_quoted_at,
    latest_quote.source AS quote_source,
    (pos.net_quantity * COALESCE(latest_quote.price, pos.avg_price)) AS current_total_value
FROM (
    -- Subquery de posição líquida e preço médio por ativo
    SELECT
        t.asset_id,
        SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.quantity ELSE -t.quantity END) AS net_quantity,
        CASE
            WHEN SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.quantity ELSE 0 END) > 0
            THEN SUM(CASE WHEN t.transaction_type = 'BUY' THEN (t.quantity * t.unit_price) + t.fees ELSE 0 END)
                 / SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.quantity ELSE 0 END)
            ELSE 0
        END AS avg_price
    FROM transactions t
    WHERE t.brokerage_account_id = ANY(:allowed_account_ids)
    GROUP BY t.asset_id
    HAVING SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.quantity ELSE -t.quantity END) > 0
) pos
JOIN assets a ON a.id = pos.asset_id
LEFT JOIN LATERAL (
    SELECT amp.price, amp.quoted_at, amp.source
    FROM asset_market_prices amp
    WHERE amp.asset_id = a.id
    ORDER BY amp.quoted_at DESC, amp.created_at DESC
    LIMIT 1
) latest_quote ON TRUE;
```

## 4. Contratos da API (FastAPI)

### 4.1. Registrar Cotação Atual Manual (`POST /api/v1/market-prices`)

* **Request Body:**

```json
{
  "asset_id": "uuid-do-ativo",
  "price": "38.45",
  "quoted_at": "2026-11-21T16:45:00-03:00"
}
```

* **Regras:**
  * Se `quoted_at` não for enviado pelo cliente, o backend assume `NOW()` em UTC.
  * Define `source = "MANUAL"` e `recorded_by_user_id = current_user.id`.
  * Retorna `201 Created` com o registro criado.

### 4.2. Histórico de Cotações de um Ativo (`GET /api/v1/market-prices/{asset_id}`)

* Retorna a lista ordenada por `quoted_at DESC, created_at DESC` para auditoria ou gráfico futuro de evolução de preço.

## 5. Impacto no Frontend (UI Minimalista)

* **Ação Rápida na Tabela da Carteira / Tela de Cotações:**
  * Botão direto na linha do ativo (ou modal compacto **"Atualizar Cotação"**) com apenas 3 campos: `Ativo`, `Preço Atual (R$)` e `Data/Hora` (pré-preenchida com a data/hora atual local, editável caso o usuário esteja lançando o fechamento de um pregão anterior).
  * Exibição discreta da data/hora da última cotação (`quoted_at`) na coluna de preço atual da Home para transparência operacional, mantendo formatação `tabular-nums` e zero texto explicativo.

## 6. Critérios de Aceite (BDD)

* **Cenário 1 — Seleção estrita pela Data + Hora mais recente**
  * **Given** que o ativo `PETR4` possui uma cotação registrada em `2026-11-21 10:00` a R$ 37,50 e outra em `2026-11-21 16:30` a R$ 38,20,
  * **When** o usuário acessa a Home/Dashboard,
  * **Then** o patrimônio do ativo deve ser calculado exclusivamente com base na cotação de R$ 38,20 (`16:30`).

* **Cenário 2 — Lançamento retroativo com data/hora anterior não sobrescreve cotação mais nova**
  * **Given** que já existe uma cotação para `VALE3` às `17:00` de hoje por R$ 62,00,
  * **When** o usuário insere manualmente uma cotação retroativa das `11:00` de hoje por R$ 60,50,
  * **Then** ambos os registros permanecem no histórico, mas o patrimônio na Home continua utilizando R$ 62,00 (`17:00`).

* **Cenário 3 — Fallback para Preço Médio na ausência de cotação**
  * **Given** que o usuário comprou 100 cotas de `HGLG11` ao Preço Médio de R$ 158,00 e ainda não registrou nenhuma cotação em `asset_market_prices`,
  * **When** a Home/Dashboard carrega o patrimônio consolidado,
  * **Then** o ativo deve compor o patrimônio pelo valor de R$ 15.800,00 ($100 \times \text{R\$ } 158,00$) com indicador visual de que ainda não há cotação de mercado lançada.