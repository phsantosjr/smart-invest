# Especificação: Proventos (Dividendos, JCP e Rendimentos)

## 1. Objetivo de Negócio
Permitir que o investidor (PF) e membros autorizados da *household* registrem e acompanhem todos os proventos recebidos dos ativos em carteira — incluindo **Dividendos**, **Juros sobre Capital Próprio (JCP)** e **Rendimento** de Ações (`income_type`: `DIVIDEND`, `JCP`, `STOCK_YIELD`), **Rendimentos** de FIIs (`FII_YIELD`) e **Cupons/Juros Semestrais** de Tesouro Direto ou Renda Fixa (`COUPON`) — separando claramente o fluxo de caixa passivo do custo de aquisição (Preço Médio).

## 2. Regras de Negócio Fundamentais
1. **Não Altera Preço Médio nem Quantidade:** O recebimento de proventos (`DIVIDEND`, `JCP`, `STOCK_YIELD`, `FII_YIELD`, `COUPON`) nunca altera a quantidade de ações/cotas em custódia nem reduz o Preço Médio calculado via query de compras/vendas (`BUY`/`SELL`).
2. **Compatibilidade Ativo × Tipo:** Para `STOCK`, o sistema aceita somente `DIVIDEND`, `JCP` e `STOCK_YIELD`; para `FII`, somente `FII_YIELD`; para `TREASURY`/`FIXED_INCOME`/`FUND`, somente `COUPON`.
3. **Distinção Líquido vs. Bruto (IR na Fonte):**
   * **Dividendos, Rendimento de Ações e Rendimentos de FIIs:** Isentos de IR na fonte para PF (`gross_amount == net_amount`).
   * **JCP (Juros sobre Capital Próprio) e Cupons Tributáveis:** Sujeitos a retenção de Imposto de Renda na fonte (ex: 15% no JCP), exigindo o registro do valor bruto (`gross_amount`), imposto retido (`tax_withheld`) e valor líquido efetivamente creditado (`net_amount`).
4. **Vínculo Obrigatório com Conta e Ativo:** Todo provento deve estar vinculado a uma `brokerage_account_id` (onde o recurso foi creditado) e a um `asset_id` (ativo pagador).
5. **Datas de Referência:**
   * `ex_date` (Data Com / Data Ex, opcional no MVP): Data de corte para direito ao provento.
   * `payment_date` (Data de Pagamento, obrigatória): Data efetiva em que o provento entra na conta da corretora, usada para totalização mensal/anual e cálculo de *Yield on Cost (YoC)*.
6. **Visibilidade na Household:** Segue estritamente a matriz `household_permissions` (`can_view = true`): cada membro vê seus próprios proventos, e o *main user* ou membros autorizados podem consultar os proventos consolidados das carteiras liberadas.

## 3. Desenho da Arquitetura e Banco de Dados (PostgreSQL 18)

### 3.1. Por que uma tabela dedicada (`asset_income_events`)?
Manter proventos em uma tabela dedicada — separada de `transactions` (`BUY`/`SELL`) — evita poluir a query de cálculo dinâmico de Preço Médio com filtros extras, permite armazenar campos específicos de tributação (`gross_amount`, `tax_withheld`, `net_amount`) e facilita relatórios de renda passiva mensal e *Yield on Cost*.