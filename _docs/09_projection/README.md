# Projeção de investimentos

Módulo de **simulação** (não persiste ordens nem altera `transactions` / Preço Médio) a partir da carteira atual e parâmetros informados pelo usuário.

| Documento | Conteúdo |
|-----------|----------|
| [01_fii_projection_mvp.md](./01_fii_projection_mvp.md) | Especificação FII — regras, motor, API e tela `/projection` |
| [02_roadmap_other_asset_classes.md](./02_roadmap_other_asset_classes.md) | Ações, renda fixa e Tesouro — escopo futuro |

## Implementação (código)

| Camada | Caminho |
|--------|---------|
| Motor (puro) | `backend/app/services/fii_projection_engine.py` |
| Montagem de dados + API | `backend/app/services/projection_service.py`, `backend/app/schemas/projection.py` |
| Endpoint | `POST /api/v1/projections/run` — `backend/app/api/v1/projections.py` |
| Frontend | `frontend/src/features/projection/` — rota `/projection`, menu **Projeção** em `appNav.ts` |

## Dependências de domínio

* Carteira consolidada — mesmo escopo `self` / `household` que `GET /portfolio` (`_docs/07_epics/04_epic_portfolio_and_transactions.md`).
* Proventos FII — último `FII_YIELD` por ativo (`_docs/04_core_domain/04_dividends_and_income_events.md`).
* Cotação — último `asset_market_prices.quoted_at`; fallback preço médio (`_docs/04_core_domain/05_asset_market_prices.md`).
* Precisão — `Decimal` / `NUMERIC` (`_docs/00_overview/02_glossary_and_domain_rules.md`).

## Status

| Classe | Status |
|--------|--------|
| **FII** | Implementado (MVP) |
| Ações (`STOCK`) | Planejado — projeção anual |
| Renda fixa / Tesouro | Planejado — taxa derivada do histórico de valuations |