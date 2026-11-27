# Especificação: Projeção de carteira — FII (MVP)

## 1. Objetivo de negócio

Permitir que o investidor **visualize cenários futuros** da carteira de **fundos imobiliários (FII)** com base na posição atual, no último rendimento registrado, na cota mais recente e em aportes mensais recorrentes, incluindo **reinvestimento simulado** de proventos conforme regras explícitas de compra de cotas.

A projeção é **ilustrativa**: não grava transações, não atualiza custódia real e não substitui aconselhamento financeiro.

## 2. Tela e fluxo (`/projection`)

* Menu lateral: **Projeção** (`icon: timeline`).
* Parâmetros antes de processar:
  * **Escopo da carteira:** `ALL` (somente FIIs incluídos nesta versão, com aviso) ou `FII`.
  * **Aporte mensal** (R$, ≥ 0).
  * **Horizonte:** 1 a 20 anos (simulação sempre **mês a mês** internamente).
  * **Agrupar resultado:** `month` (mês a mês) ou `year` (ano a ano).
  * **Distribuir aporte pelos últimos rendimentos** (`allocate_contribution_by_last_dividend`): se ativo, peso proporcional ao rendimento do mês simulado por fundo; se inativo, partes **iguais** entre os FIIs.
* Botão **Processar** → `POST /api/v1/projections/run`.
* Após resposta:
  * **Cards:** patrimônio inicial (FIIs) e patrimônio ao final do horizonte + resumo de ganho % e proventos totais.
  * **Abas:** Tabela | Gráfico de barras (patrimônio por período).

Outras classes (`STOCK`, `FIXED_INCOME`, `TREASURY`) permanecem desabilitadas na UI até entrega das specs em [02_roadmap_other_asset_classes.md](./02_roadmap_other_asset_classes.md).

## 3. Pré-requisitos de dados

Para cada `asset_type = FII` com posição líquida agregada (soma de contas no escopo):

1. **Quantidade em custódia** — derivada de `transactions` (igual à carteira).
2. **Cota unitária** — último `asset_market_prices.price` por `quoted_at`; se ausente, **preço médio** da posição.
3. **Último provento** — último `asset_income_events` com `income_type = FII_YIELD` e `payment_date` mais recente por `asset_id` (`net_amount`).

Ausência de posição FII, cota/preço inválido ou ausência de provento por fundo → `422` com mensagem clara.

## 4. Premissas da simulação (FII)

| Premissa | Descrição |
|----------|-----------|
| **Frequência** | Um ciclo por **mês civil**; rendimento FII projetado **mensal** (alinhado ao pedido de produto). |
| **Rendimento por cota** | `unit_monthly_dividend = último_net_amount / quantidade_no_início_da_projeção` (por fundo, agregado). O rendimento do mês escala com a quantidade: `rendimento_mês = unit_monthly_dividend × quantidade_atual`. |
| **Preço da cota** | Constante no horizonte (última cota conhecida). Sem mark-to-market futuro. |
| **Sem venda** | Apenas compras simuladas (reinvestimento + aporte). |
| **Household** | Mesmas regras de `scope` / `can_view` que a carteira. |

## 5. Regras de reinvestimento (motor)

Referência: `backend/app/services/fii_projection_engine.py`. Valores em `Decimal`; cotas inteiras via **piso** (`ROUND_FLOOR`).

### 5.1. Pool do mês

No início de cada mês:

$$\text{pool} = \text{aporte\_mensal} + \text{sobra\_carregada\_do\_mês\_anterior}$$

### 5.2. Fase 1 — Rendimento de cada FII

Para cada fundo $i$ com preço de cota $P_i$ e quantidade $Q_i$:

1. Calcular rendimento líquido do mês $R_i = \text{unit\_monthly\_dividend}_i \times Q_i$.
2. Tentar comprar cotas apenas com $R_i$: $n = \lfloor R_i / P_i \rfloor$.
3. Se $n \ge 1$: aumentar $Q_i$ em $n$; somar o troco $R_i - n \cdot P_i$ ao **pool**.
4. Se $n = 0$ e $R_i > 0$:
   * Calcular déficit para uma cota: $\text{need} = P_i - R_i$.
   * Se $\text{pool} \ge \text{need}$: debitar `need` do pool, comprar **1** cota.
   * Senão: devolver $R_i$ integralmente ao **pool** (não compra neste fundo na fase 1).

### 5.3. Fase 2 — Alocar o pool restante

Com o pool após a fase 1:

1. Calcular rendimentos **do mês já atualizados** $R'_i$ (com quantidades pós-fase 1).
2. **Pesos:**
   * `allocate_contribution_by_last_dividend = true` e $\sum R'_i > 0$: peso $w_i = R'_i / \sum R'_i$.
   * Caso contrário: $w_i = 1 / N$.
3. Alocar pool: faixa $A_i = \text{pool} \times w_i$ (último fundo absorve arredondamento).
4. Em cada fundo, comprar $\lfloor A_i / P_i \rfloor$ cotas e debitar do pool o valor efetivamente gasto.

### 5.4. Sobra entre meses

O que restar no pool após a fase 2 é **carregado** para o mês seguinte (não é descartado).

### 5.5. Patrimônio do mês

$$\text{patrimônio} = \sum_i Q_i \times P_i$$

## 6. Métricas de saída

### 6.1. Resumo (`summary`)

| Campo | Significado |
|-------|-------------|
| `initial_patrimony` | $\sum Q_i P_i$ no momento da projeção |
| `final_patrimony` | Patrimônio após o último mês simulado |
| `total_dividends` | Soma dos rendimentos projetados em todos os meses |
| `total_contributions` | `aporte_mensal × meses` |
| `gain_percent` | $\dfrac{\text{final} - \text{initial} - \text{total\_contributions}}{\text{initial}} \times 100$ (se `initial > 0`) |

### 6.2. Linhas por período (`periods`)

| Campo | Significado |
|-------|-------------|
| `period_label` | `YYYY-MM` ou `YYYY` conforme `group_by` |
| `portfolio_value` | Patrimônio ao **fim** do período (total acumulado em carteira) |
| `dividends_in_period` | Rendimentos no período |
| `contributions_in_period` | Aportes no período |
| `cumulative_dividends` | Proventos acumulados |
| `cumulative_contributions` | Aportes acumulados |
| `gain_percent` | Ganho % acumulado vs. patrimônio inicial e aportes acumulados até o fim do período |

`chart_bars`: mesmo `period_label` com `portfolio_value` para o gráfico de barras.

## 7. Contrato da API

### `POST /api/v1/projections/run`

**Auth:** JWT `type: access`.

**Body (JSON):**

```json
{
  "asset_scope": "FII",
  "monthly_contribution": "500.00",
  "horizon_years": 5,
  "group_by": "month",
  "allocate_contribution_by_last_dividend": true,
  "scope": "self",
  "user_id": null
}
```

| Campo | Tipo | Regras |
|-------|------|--------|
| `asset_scope` | enum | `FII` ou `ALL` (somente FIIs). Outros → `501`. |
| `monthly_contribution` | decimal | ≥ 0, quantizado 4 casas |
| `horizon_years` | int | 1–20 |
| `group_by` | `month` \| `year` | Agregação da resposta |
| `allocate_contribution_by_last_dividend` | bool | Pesos do pool na fase 2 |
| `scope` | `self` \| `household` | Igual à carteira |
| `user_id` | UUID \| null | Filtro household quando permitido |

**Response:** `ProjectionRunResponse` (ver `backend/app/schemas/projection.py`).

**Notas (`notes`):** quando `asset_scope = ALL`, incluir texto informando que apenas FIIs foram considerados.

## 8. Critérios de aceite (BDD)

### CA-PR-01 — Projeção FII com dados completos

* **Given** posição FII, cota ou PM válidos e ao menos um `FII_YIELD` por fundo,
* **When** o usuário envia `POST /projections/run` com `horizon_years = 1` e aporte positivo,
* **Then** `200 OK` com 12 períodos mensais, `final_patrimony > initial_patrimony` e `chart_bars` com 12 itens.

### CA-PR-02 — Falha sem provento

* **Given** posição FII sem `FII_YIELD`,
* **When** processar projeção,
* **Then** `422` informando necessidade de provento.

### CA-PR-03 — Distribuição de aporte por rendimento

* **Given** dois FIIs com rendimentos projetados 60% e 40% do total no mês,
* **When** `allocate_contribution_by_last_dividend = true`,
* **Then** a fase 2 aloca o pool nessa proporção (validável via teste unitário do motor).

### CA-PR-04 — Tela

* **Given** usuário autenticado em `/projection`,
* **When** preenche parâmetros e clica Processar,
* **Then** exibe cards inicial/final, abas Tabela e Gráfico com dados da API.

## 9. Testes

| Arquivo | Cobertura |
|---------|-----------|
| `backend/tests/test_fii_projection_engine.py` | Motor (reinvestimento, pesos) |
| `backend/tests/test_projections_api.py` | API integrada (pré-requisitos, happy path) |

## 10. Limitações conhecidas (MVP)

* Não projeta variação de cota nem mudança de DY/dividendo ao longo do tempo.
* Não considera taxas de corretagem nas compras simuladas.
* Não integra com agenda futura de proventos B3.
* **Não altera** `transactions`, `asset_income_events` nem Preço Médio real.

## 11. Relação com outros módulos

* Análise **retrospectiva** de reinvestimento (mês corrente): `GET /income-events/reinvestment` — `_docs/04_core_domain/06_dividend_reinvestment_reports.md`.
* Projeção é **prospectiva** e independente dessa rota.