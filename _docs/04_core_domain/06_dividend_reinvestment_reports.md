# Especificação: Abas de Dividendos e Regras de Reinvestimento (FIIs & Smart Invest Ações)

## 1. Objetivo de Negócio

Evoluir a página de **Proventos / Dividendos** para oferecer não apenas o histórico passivo recebido, mas também um **controle ativo de reinvestimento** que discipline o efeito bola de neve:

* **Para FIIs:** Garantir que os rendimentos recebidos no **mês de referência** $M$ sejam reinvestidos em FIIs (preferencialmente no mesmo ativo) **ainda no mês** $M$, destacando o saldo pendente de aporte por ativo.
* **Para Ações (Smart Invest):** Garantir que o total anual de Dividendos + JCP recebidos de ações seja reinvestido na classe **Ações (`STOCK`)** dentro do mesmo ano-calendário, alertando visualmente quando o volume comprado estiver abaixo dos proventos acumulados.

## 2. Estrutura de Navegação (3 Tabs — UI Minimalista)

A página `/dividends` (ou `/income-events`) deve ser organizada em exatamente **3 abas**, mantendo a diretriz de **zero copy de marketing** e apenas controles operacionais:

1. **Tab 1 — Consolidado por Ativo** *(Já existente)*
   * Total líquido acumulado recebido por ativo (`ticker`), quantidade de eventos e *Yield on Cost (YoC)*.
2. **Tab 2 — Histórico Mês a Mês**
   * **Filtros:** Seletor de Mês/Ano (ou intervalo) e seletor de Ativo (`Todos` ou ativo específico).
   * **Componentes:** Card compacto com o Total Líquido do filtro aplicado + tabela cronológica mensal (`Mês/Ano`, `Ativo`, `Tipo`, `Valor Líquido`).
3. **Tab 3 — Reinvestimento**
   * Subdividida em dois painéis objetivos na mesma tela:
     * **Seção A: Reinvestimento FIIs (Ciclo Mensal por Ativo)**
     * **Seção B: Smart Invest — Ações (Ciclo Anual Consolidado)**

## 3. Regras de Negócio e Fórmulas de Cálculo

### 3.1. Tab 2 — Relatório Mês a Mês

* Considera `asset_income_events.payment_date` agrupado por `YYYY-MM`.
* Soma `net_amount` (valor líquido efetivamente creditado na corretora) respeitando as permissões da *household* (`can_view = true`).
* Permite filtrar por `month` (`YYYY-MM`) e/ou `asset_id`.

### 3.2. Tab 3 (Seção A) — Reinvestimento de FIIs (Ciclo no Mês de Referência)

* **Escopo de Ativos:** Apenas ativos com `asset_type = 'FII'`.
* **Janela de Comparação:** Para cada FII $i$ que pagou proventos no mês de referência $M$ (parâmetro `target_month`):
  * $\text{Proventos Recebidos}_{i, M} = \sum \text{net\_amount}$ em `asset_income_events` onde `asset_id = i` e `payment_date` pertence ao mês $M$.
  * $\text{Total Comprado}_{i, M} = \sum (\text{quantity} \times \text{unit\_price}) + \text{fees}$ em `transactions` onde `asset_id = i`, `transaction_type = 'BUY'` e `transaction_date` pertence ao mês $M$.
* **Cálculo do Saldo Pendente (`missing_amount`):**

  $$\text{Saldo Pendente}_{i, M} = \max\left(0,\; \text{Proventos Recebidos}_{i, M} - \text{Total Comprado}_{i, M}\right)$$

* **Totais consolidados (card acima da tabela):** soma de proventos e de compras de **todos** os FIIs no mês $M$ (compras da classe, não apenas dos ativos que pagaram no mês).
* **Exemplo Prático:**
  * Em **Novembro/2026** ($M$), recebeu **R\$ 100,00** de `XRM11` e comprou **R\$ 60,00** de `XRM11` no mesmo mês.
  * **Resultado visual:** Status `Pendente`, **Falta comprar: R\$ 40,00**. Se comprou $\ge \text{R\$ } 100,00$, exibe `Concluído` ($\text{R\$ } 0,00$ pendente).

### 3.3. Tab 3 (Seção B) — Smart Invest: Reinvestimento de Ações (Acumulado no Ano)

* **Escopo de Ativos:** Todos os ativos com `asset_type = 'STOCK'` (Ações da B3), analisados de forma consolidada na classe (o dividendo de `PETR4` pode ser reinvestido em `VALE3` ou qualquer outra ação).
* **Janela de Comparação:** Ano-calendário selecionado (padrão: ano corrente, ex: `2026`, de `01/01/2026` a `31/12/2026`).
* **Cálculo:**
  * $\text{Total Proventos Ações}_{\text{Ano}} = \sum \text{net\_amount}$ em `asset_income_events` (`DIVIDEND` + `JCP` + `STOCK_YIELD`) de ativos `STOCK` no ano.
  * $\text{Total Comprado Ações}_{\text{Ano}} = \sum (\text{quantity} \times \text{unit\_price}) + \text{fees}$ em `transactions` (`transaction_type = 'BUY'`) de ativos `STOCK` no ano.
  * $\text{Déficit de Reinvestimento}_{\text{Ano}} = \max\left(0,\; \text{Total Proventos Ações}_{\text{Ano}} - \text{Total Comprado Ações}_{\text{Ano}}\right)$.
* **Regra de Alerta Visual:**
  * Se $\text{Total Comprado Ações}_{\text{Ano}} < \text{Total Proventos Ações}_{\text{Ano}}$, exibir banner/card de alerta visual destacado informando exatamente quanto em **R\$** precisa ser comprado em ações para suprir o reinvestimento do ano.

## 4. Contratos da API (FastAPI)

### 4.1. Relatório Mês a Mês (`GET /api/v1/income-events/monthly`)

* **Query Params:** `month` (`YYYY-MM`, opcional), `asset_id` (UUID, opcional), `user_id` (UUID, opcional).
* **Response (`200 OK`):**

```json
{
  "total_net_amount": "1450.80",
  "items": [
    {
      "month": "2026-11",
      "asset_id": "uuid-xrm11",
      "ticker": "XRM11",
      "asset_type": "FII",
      "total_net_amount": "100.00"
    }
  ]
}
```

### 4.2. Análise de Reinvestimento (`GET /api/v1/income-events/reinvestment`)

* **Query Params:** `target_month` (`YYYY-MM`, padrão: mês atual), `year` (`YYYY`, padrão: ano atual), `user_id` (UUID, opcional).
* **Response (`200 OK`):**

```json
{
  "fii_reinvestment": {
    "income_month": "2026-11",
    "purchase_month": "2026-11",
    "total_income_received": "100.00",
    "total_purchased": "60.00",
    "missing_amount": "40.00",
    "needs_reinvestment": true,
    "items": [
      {
        "asset_id": "uuid-xrm11",
        "ticker": "XRM11",
        "income_received": "100.00",
        "amount_purchased": "60.00",
        "missing_amount": "40.00",
        "status": "PENDING"
      }
    ]
  },
  "stocks_smart_invest": {
    "year": 2026,
    "total_income_received": "3200.00",
    "total_purchased": "2500.00",
    "missing_amount": "700.00",
    "needs_reinvestment": true
  }
}
```

## 5. Diretrizes Visuais (UI Minimalista & Paleta)

* **Tab 3 — Bloco FIIs:** Card com totais de proventos e compras no mês de referência; tabela com colunas `FII`, `Recebido no mês`, `Comprado no mês`, `Falta Comprar (R$)` e `Status`. Linhas com `missing_amount > 0` recebem destaque sutil com a cor de acento `#F9E2AF` (texto escuro de alto contraste) no valor pendente; linhas **concluídas** (`missing_amount = 0`) usam fundo verde claro (`b3-green-soft`) e status em verde.
* **Tab 3 — Bloco Smart Invest Ações:**
  * 3 KPIs lado a lado: `Dividendos + JCP (Ano)`, `Comprado em Ações (Ano)` e `Saldo a Reinvestir`.
  * Quando `needs_reinvestment == true`, exibir card de alerta operacional direto (sem textos longos): *"Reinvestimento pendente: compre R\$ 700,00 em ações para cobrir os proventos de 2026."*

## 6. Critérios de Aceite (BDD)

* **Cenário 1 — Filtro no relatório mês a mês**
  * **Given** que o usuário possui proventos lançados em múltiplos meses e ativos,
  * **When** ele acessa a Tab 2 ("Histórico Mês a Mês") e filtra pelo mês `2026-10` e ativo `XRM11`,
  * **Then** o sistema exibe apenas os proventos de `XRM11` pagos em Outubro/2026 e o somatório líquido correspondente.

* **Cenário 2 — Reinvestimento de FIIs com saldo pendente**
  * **Given** que o usuário recebeu R\$ 100,00 de rendimentos de `XRM11` e comprou R\$ 35,00 de `XRM11`, ambos em Novembro/2026,
  * **When** ele visualiza a Tab 3 ("Reinvestimento") com mês de referência Novembro/2026,
  * **Then** o sistema exibe `XRM11` com Recebido = R\$ 100,00, Comprado = R\$ 35,00 e destaque visual indicando **Falta comprar: R\$ 65,00**.

* **Cenário 3 — Smart Invest Ações com alerta de reinvestimento anual**
  * **Given** que no ano de 2026 o usuário recebeu R\$ 3.200,00 somando Dividendos e JCP de ações e realizou R\$ 2.500,00 em compras de ações no mesmo ano,
  * **When** ele consulta o painel Smart Invest na Tab 3,
  * **Then** o sistema exibe alerta visual informando que faltam **R\$ 700,00** em compras de ações para suprir o reinvestimento anual.

* **Cenário 4 — Smart Invest Ações com meta anual suprida**
  * **Given** que no ano de 2026 o total comprado em ações (`BUY`) é maior ou igual à soma de Dividendos + JCP recebidos de ações,
  * **When** ele consulta o painel Smart Invest,
  * **Then** o saldo a reinvestir exibe `R$ 0,00` e nenhum alerta de pendência é exibido.

## 7. Quebra de Tarefas (Roadmap Técnico)

1. **Backend (FastAPI + PostgreSQL 18):**
   * Implementar query agregada mensal em `asset_income_events` (`GET /api/v1/income-events/monthly`).
   * Implementar serviço de cálculo de reinvestimento (`GET /api/v1/income-events/reinvestment`) cruzando `asset_income_events` e compras de FIIs no mesmo mês $M$; ano $Y$ para `STOCK`, com `transactions` (`transaction_type = 'BUY'`).
2. **Frontend (React + TypeScript + Redux Toolkit):**
   * Refatorar a página de Dividendos para navegação em **3 tabs** (`Consolidado`, `Mês a Mês`, `Reinvestimento`).
   * Implementar filtros de mês/ativo na Tab 2 e os dois blocos visuais (FIIs + Smart Invest Ações) na Tab 3 seguindo a paleta `#4A249D`, `#009FBD`, `#F9E2AF` e `#F6F5F5`.