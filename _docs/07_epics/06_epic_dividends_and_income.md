# Épico 06: Gestão de Proventos (Dividendos, JCP e Rendimentos)

## 1. Visão Geral do Épico

* **ID do Épico:** `EP-06`
* **Título:** Registro e Acompanhamento de Proventos (Dividendos, JCP, Rendimentos de FIIs e Cupons)
* **Objetivo de Negócio:** Permitir que pessoas físicas (PF) e membros autorizados da *household* registrem, consultem e consolidem os fluxos de renda passiva recebidos em suas contas de investimento (`DIVIDEND`, `JCP`, `FII_YIELD`, `COUPON`), mantendo separação estrita entre o recebimento de proventos e o custo de aquisição (Preço Médio) dos ativos.

## 2. Escopo do MVP

### 2.1. In-Scope
* Cadastro manual de eventos de proventos (`asset_income_events`) vinculados a uma conta (`brokerage_account_id`) e a um ativo (`asset_id`) pertencentes ao usuário autenticado.
* Suporte a proventos isentos (`DIVIDEND`, `STOCK_YIELD`, `FII_YIELD`) e tributáveis na fonte (`JCP`, `COUPON`), distinguindo `gross_amount`, `tax_withheld` e `net_amount`.
* Para ações (`STOCK`), o lançamento de provento deve permitir escolher entre **Dividendos**, **JCP** e **Rendimento** (`STOCK_YIELD`).
* Registro de data de pagamento (`payment_date`, obrigatória) e data com / data ex (`ex_date`, opcional).
* Listagem filtrável por período (`start_date`, `end_date`), ativo, conta ou membro autorizado da *household* (`can_view = true`).
* Consolidação de renda passiva líquida recebida (total mensal, acumulado no ano e cálculo de *Yield on Cost* com base no custo médio dinâmico).
* Interface web minimalista (React + TypeScript + Redux Toolkit) exibindo KPIs compactos, tabela tabular e formulário rápido de lançamento.

### 2.2. Out-of-Scope
* Sincronização automática de agenda de proventos via B3 / CEI / Open Finance ou leitura automática de extratos bancários.
* Cálculo automatizado de impostos anuais ou geração de informe de rendimentos para IRPF.
* Reinvestimento automático de dividendos (DRIP) gerando ordens de compra sem ação explícita do usuário.

## 3. Regras de Negócio

1. **Isolamento do Preço Médio:** Proventos são persistidos exclusivamente em `asset_income_events` e **nunca** interferem na quantidade de ativos em custódia nem no Preço Médio calculado via `transactions`.
2. **Integridade Financeira (Bruto vs. Líquido):**
   * Todos os valores (`gross_amount`, `tax_withheld`, `net_amount`) devem ser não negativos (`>= 0`) e respeitar a relação:
     $$\text{net\_amount} = \text{gross\_amount} - \text{tax\_withheld}$$
   * Para `DIVIDEND` e `FII_YIELD`, `tax_withheld` assume `0.0000` por padrão.
3. **Titularidade e Escrita Restrita:** Apenas o dono da conta (`brokerage_accounts.user_id == current_user.id`) pode criar, editar ou excluir seus próprios registros de proventos.
4. **Visibilidade na Household:** A consulta de proventos de outro membro da *household* só é permitida quando existir registro ativo em `household_permissions` com `can_view = true`; caso contrário, a API retorna `403 Forbidden`.
5. **Base de Apuração por Data de Pagamento:** Todos os totalizadores mensais, anuais e de período utilizam `payment_date` como critério oficial de caixa.

## 4. User Stories e Critérios de Aceite (BDD)

### US-06.1 — Lançar Provento Isento (Dividendo ou Rendimento de FII)
* **Como** investidor autenticado,
* **Quero** registrar o recebimento de dividendos de ações ou rendimentos de FIIs,
* **Para** acompanhar minha renda passiva mensal sem alterar meu preço médio.
* **Critérios de Aceite:**
  * **Given** que o usuário possui uma conta vinculada e um ativo cadastrado (`PETR4` ou `HGLG11`),
  * **When** ele envia `POST /api/v1/income-events` com `income_type = "FII_YIELD"`, `gross_amount = 120.50`, `tax_withheld = 0.00`, `net_amount = 120.50` e `payment_date = "2026-11-15"`,
  * **Then** o sistema persiste o registro em `asset_income_events`, retorna `201 Created` e mantém inalterados a quantidade e o Preço Médio do ativo.

### US-06.2 — Lançar JCP ou Cupom com Retenção de IR na Fonte
* **Como** investidor autenticado,
* **Quero** informar o valor bruto e o imposto retido na fonte ao lançar JCP ou juros semestrais,
* **Para** que o sistema contabilize o valor líquido efetivamente creditado na minha conta.
* **Critérios de Aceite:**
  * **Given** que o usuário informa `income_type = "JCP"`, `gross_amount = 200.00` e `tax_withheld = 30.00`,
  * **When** ele submete `POST /api/v1/income-events` com `net_amount = 170.00`,
  * **Then** a API grava o evento e utiliza `170.00` nas somas de proventos líquidos recebidos.
  * **Given** que `net_amount` enviado diverge de `gross_amount - tax_withheld`,
  * **When** a requisição é enviada,
  * **Then** a API rejeita o payload com `422 Unprocessable Entity` (ou `400 Bad Request`).

### US-06.3 — Consultar Histórico e Consolidado de Proventos por Período
* **Como** investidor autenticado,
* **Quero** filtrar meus proventos por intervalo de datas, ativo ou classe de ativo,
* **Para** analisar a evolução mensal e o total líquido recebido.
* **Critérios de Aceite:**
  * **Given** que existem proventos lançados em diferentes datas de pagamento,
  * **When** o usuário consulta `GET /api/v1/income-events?start_date=2026-01-01&end_date=2026-11-30`,
  * **Then** a API retorna `200 OK` contendo a lista ordenada por `payment_date` decrescente e os totalizadores líquidos agregados por mês e classe de ativo.

### US-06.4 — Visualização Compartilhada na Household
* **Como** membro da *household*,
* **Quero** visualizar os proventos consolidados dos familiares que liberaram acesso para mim,
* **Para** acompanhar a geração de renda passiva da família sem comprometer a privacidade de quem não compartilhou.
* **Critérios de Aceite:**
  * **Given** que existe permissão `can_view = true` para um membro da *household*,
  * **When** o usuário consulta `GET /api/v1/income-events?scope=household`,
  * **Then** a API agrega apenas os proventos próprios e dos membros autorizados; se tentar filtrar especificamente por um `user_id` sem `can_view = true`, retorna `403 Forbidden`.

## 5. Dependências Técnicas

* **Banco de Dados (PostgreSQL 18):** Tabela `asset_income_events` criada com índices em `(brokerage_account_id, payment_date)` e `(asset_id)`, além de constraint de validação numérica (`chk_income_amounts`).
* **Backend (FastAPI + SQLAlchemy Async):** Endpoints `POST /api/v1/income-events`, `GET /api/v1/income-events` e `DELETE /api/v1/income-events/{id}`, integrados ao middleware JWT e à verificação de `household_permissions`.
* **Frontend (React + TypeScript + Redux Toolkit):** Slice de proventos, cards resumidos com `tabular-nums`, tabela operacional e formulário rápido seguindo a paleta (`#4A249D`, `#009FBD`, `#F9E2AF`, `#F6F5F5`) e a diretriz de UI minimalista.