# Épico 04: Carteira Consolidada, Transações e Preço Médio Dinâmico

## 1. Visão Geral do Épico
* **ID do Épico:** `EP-04`
* **Título:** Gestão de Transações (Compra/Venda), Consolidação de Carteira e Cálculo Dinâmico de Preço Médio
* **Objetivo de Negócio:** Permitir que o investidor (PF) lance operações de compra (`BUY`) e venda (`SELL`) de ativos vinculados às suas contas em corretoras/bancos (`brokerage_accounts`) e consulte sua carteira consolidada com o **Preço Médio (PM)** e a posição líquida calculados dinamicamente em tempo de consulta via query no PostgreSQL 18.

## 2. Escopo do MVP

### 2.1. In-Scope
* Lançamento manual de compras (`BUY`) e vendas (`SELL`) de ativos (`STOCK`, `FII`, `TREASURY`, `FIXED_INCOME`, `FUND`) em contas pertencentes ao usuário autenticado.
* Inclusão de taxas operacionais (`fees`) na formação do custo de aquisição nas compras e abatimento no valor líquido de vendas.
* Cálculo dinâmico da **quantidade em custódia** e do **Preço Médio ponderado** diretamente via consulta SQL/SQLAlchemy no PostgreSQL 18 ao chamar o endpoint da carteira (sem coluna mutável cacheada de preço médio).
* Validação de saldo em custódia para impedir venda descoberta maior que a posição disponível naquela conta/ativo.
* Consolidação da carteira individual e visão agregada/filtrada de membros autorizados da *household* (`can_view = true`).
* Interface web minimalista (React + TypeScript + Redux Toolkit) exibindo posições, preço médio, cotação/valor atual, variação e formulário rápido de lançamento.

### 2.2. Out-of-Scope
* Cálculo automático de imposto de renda (DARF mensal, compensação de prejuízo acumulado ou regra de isenção de R$ 20 mil).
* Operações complexas de derivativos (opções, termo, mercado futuro) ou venda a descoberto (*short selling*).
* Eventos corporativos automatizados (desdobramento, grupamento, bonificação automática sem lançamento).

## 3. Regras de Negócio
1. **Cálculo Dinâmico via Banco de Dados:** O Preço Médio **não** é armazenado estaticamente na tabela de ativos ou posições. Ele é derivado via query agregada sobre `transactions` no PostgreSQL 18 no momento da requisição.
2. **Fórmula do Preço Médio Ponderado:**
   * Nas **Compras (`BUY`)**: aumentam a quantidade em custódia e somam ao custo total o valor da operação mais taxas:
     $$\text{Custo da Compra} = (\text{quantity} \times \text{unit\_price}) + \text{fees}$$
     $$\text{PM} = \frac{\sum \text{Custo das Compras}}{\sum \text{Quantidade Comprada}}$$
   * Nas **Vendas (`SELL`)**: reduzem a quantidade em custódia mantendo o Preço Médio unitário vigente das cotas remanescentes (se a posição zerar, quantidade = `0` e custo em aberto = `0`).
3. **Bloqueio de Venda Maior que Posição Atual:** Ao registrar uma operação `SELL`, o sistema verifica a quantidade líquida atual do ativo na `brokerage_account_id`; se `sell_quantity > current_quantity`, a transação é rejeitada.
4. **Precisão Numérica:** Todos os cálculos no PostgreSQL e Python devem usar `NUMERIC` / `Decimal`, preservando 6 casas decimais para quantidades e 4 casas para preços/valores unitários.
5. **Segregação na Household:** Um usuário só pode lançar transações nas suas próprias contas (`brokerage_accounts.user_id == current_user.id`). Para visualização, pode consultar apenas carteiras próprias ou de membros com `can_view = true`.

## 4. User Stories e Critérios de Aceite (BDD)

### US-04.1 — Lançar Compra de Ativo (`BUY`)
* **Como** investidor autenticado,
* **Quero** registrar a compra de um ativo informando conta, ativo, quantidade, preço unitário, taxas e data,
* **Para** compor minha posição e atualizar meu custo médio de aquisição.
* **Critérios de Aceite:**
  * **Given** que o usuário possui uma conta vinculada e seleciona um ativo válido,
  * **When** ele envia `POST /api/v1/transactions` com `transaction_type = "BUY"`, `quantity = 100`, `unit_price = 35.50`, `fees = 2.50` e `transaction_date`,
  * **Then** a API grava a transação com `total_amount = 3552.50` e retorna `201 Created`.

### US-04.2 — Lançar Venda de Ativo (`SELL`) com Validação de Custódia
* **Como** investidor autenticado,
* **Quero** registrar a venda parcial ou total de um ativo que possuo em carteira,
* **Para** atualizar minha quantidade líquida em custódia.
* **Critérios de Aceite:**
  * **Given** que o usuário possui `100` unidades de `PETR4` em uma conta específica,
  * **When** ele registra uma venda (`SELL`) de `40` unidades na mesma conta,
  * **Then** o sistema persiste a venda e a posição líquida consultada passa a ser `60` unidades mantendo o Preço Médio unitário anterior.
  * **Given** que o usuário possui `60` unidades de `PETR4`,
  * **When** ele tenta registrar uma venda de `70` unidades na mesma conta,
  * **Then** a API rejeita a requisição com `400 Bad Request` informando saldo insuficiente do ativo.

### US-04.3 — Consultar Carteira com Preço Médio Calculado via Query no PostgreSQL
* **Como** investidor autenticado,
* **Quero** consultar minha carteira consolidada,
* **Para** visualizar quantidade líquida, preço médio ponderado, custo total investido e valor atual de cada ativo.
* **Critérios de Aceite:**
  * **Given** que o usuário realizou duas compras de `HGLG11` (10 cotas a R$ 160,00 sem taxas e 10 cotas a R$ 150,00 com R$ 2,00 de taxas),
  * **When** ele chama `GET /api/v1/portfolio`,
  * **Then** a query no PostgreSQL 18 calcula dinamicamente `quantity = 20` e `average_price = 155.1000` (`(1600 + 1502) / 20`), retornando os dados consolidados.

### US-04.4 — Visão Consolidada ou Filtrada da Household
* **Como** membro de uma *household* com permissões liberadas,
* **Quero** alternar entre minha carteira, a carteira de um familiar autorizado ou o consolidado permitido,
* **Para** acompanhar o patrimônio familiar respeitando os limites de privacidade.
* **Critérios de Aceite:**
  * **Given** que o *main user* liberou `can_view = true` da carteira de um dependente,
  * **When** ele consulta `GET /api/v1/portfolio?scope=household`,
  * **Then** o endpoint agrega apenas as posições do próprio usuário e dos membros com `can_view = true`, omitindo membros sem permissão.

## 5. Dependências Técnicas
* **Banco de Dados (PostgreSQL 18):** Tabelas `transactions`, `brokerage_accounts` e `assets` indexadas por `(brokerage_account_id, asset_id, transaction_date)` para performance da query agregada de Preço Médio.
* **Backend (FastAPI + SQLAlchemy Async):** Query agregada (usando CTEs ou `SUM(CASE WHEN ...)` em SQLAlchemy Core/ORM) e integração com `QuoteProviderFactory` para enriquecer ativos de renda variável com cotação atual.
* **Frontend (React + Redux Toolkit):** Tela `/portfolio` e modal/página `/transactions/new` seguindo a UI minimalista com `tabular-nums` e paleta definida (`#4A249D`, `#009FBD`, `#F9E2AF`, `#F6F5F5`).