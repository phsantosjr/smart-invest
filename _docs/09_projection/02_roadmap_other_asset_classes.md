# Projeção — roadmap (outras classes de ativo)

Documento de **intenção de produto** para iterações após o MVP FII. Não implementado.

## 1. Escopo por classe (pedido original)

| Classe | Agrupamento do retorno | Base do rendimento projetado |
|--------|------------------------|------------------------------|
| **FII** | Mês a mês | Último `FII_YIELD`; reinvestimento com regras de cotas → [01_fii_projection_mvp.md](./01_fii_projection_mvp.md) |
| **Ações (`STOCK`)** | Ano a ano | Dividendos / JCP / `STOCK_YIELD`; reinvestimento anual consolidado (espelhar regra Smart Invest em `06_dividend_reinvestment_reports.md`) |
| **Renda fixa (`FIXED_INCOME`)** | Ano a ano | Taxa anual inferida do **ganho percentual entre as duas últimas** `fixed_income_valuations` (`valuation_date` desc) por posição |
| **Tesouro (`TREASURY`)** | Ano a ano | Mesma lógica de valuations que renda fixa |
| **ALL** | Conforme classe | Agregar submotores; totais consolidados na tabela e no gráfico |

## 2. Renda fixa e Tesouro (rascunho de regra)

Para cada par `(brokerage_account_id, asset_id)` com saldo em aberto:

1. Obter as duas marcações mais recentes em `fixed_income_valuations` (`current_value`, `valuation_date`).
2. Calcular variação relativa no intervalo entre as datas (anualizar se o intervalo ≠ 12 meses — decisão pendente).
3. Aplicar taxa no saldo atual mês a mês ou ano a ano **sem** simular novas aplicações além do aporte mensal informado (definir se aporte entra como nova aplicação no mesmo indexador — pendente).

## 3. Ações (rascunho de regra)

1. Posição via `transactions`; últimos proventos por tipo (`DIVIDEND`, `JCP`, `STOCK_YIELD`).
2. Simulação **anual**: acumular proventos no ano, meta de reinvestir 100% em compras `STOCK` no ano (comparável à seção B de `06_dividend_reinvestment_reports.md`).
3. Projeção de preço: última cotação ou PM (mesma premissa flat do FII, salvo decisão contrária).

## 4. Decisões pendentes antes de implementar

* Anualizar ganho RF com menos de dois meses de histórico — bloquear ou usar taxa zero?
* Aporte mensal em RF: novo principal na mesma taxa ou distribuir entre títulos?
* Consolidado `ALL`: uma linha de patrimônio ou colunas por classe na tabela?
* Endpoint único `POST /projections/run` com `asset_scope` ou sub-recursos por classe?

## 5. Critério de entrada em sprint

* Spec aprovada nesta pasta + critérios de aceite BDD.
* Atualizar `01_fii_projection_mvp.md` apenas se o contrato compartilhado (`ProjectionRunRequest/Response`) mudar.
* Atualizar `_docs/06_frontend/02_screens_and_user_flows.md` com parâmetros habilitados na UI.