# Domínio Pro Plus — referência para BA / PM

Use para enquadrar ideias; não invente módulo que não exista sem validar em `.specs/` ou no código.

## Produto

**SaaS de gestão para investimento:** workspace para gestão de investimento, insights sobre oportunidades de investimentos, relatórios inteligentes para **pessoas fisica** 

## Personas (resumo)

Não há `_docs/00-overview/personas.md`. Extraído de `_docs/00_overview/`, `_docs/03_household/`, `_docs/04_core_domain/03_admin_permissions_and_audit.md` e `_docs/06_frontend/02_screens_and_user_flows.md`.

| Persona | Papel técnico | Superfície |
|---------|---------------|------------|
| **Investidor PF** | Usuário autenticado (`users`); JWT `type: access` + TOTP (`is_2fa_enabled`); dono das próprias `brokerage_accounts` | `/login`, `/portfolio`, `/transactions/new`, `/accounts`, `/imports/brokerage-note`, `/settings/security`, `/dividends` |
| **Titular da Household** (*main user*) | `is_household_owner = true`; concede/revoga `household_permissions.can_view` | `/household` (gestão de membros e `can_view`); `/portfolio?scope=household` (consolidado autorizado) |
| **Membro da Household** | Pertence a `households` sem ser titular; vê carteira alheia só com `can_view = true` | `/portfolio` (própria e, se autorizado, de outro membro); `/household` em leitura |
| **Operador Admin** | `is_superuser = true`; sessão do FastAPI Admin (não herda `can_view` na API REST) | `/admin` (catálogos `institutions`/`assets`, suporte a usuários/households, financeiro somente leitura) |

## Módulos (specs)

Fonte: pastas em `_docs/`. Não inventar módulo fora desta lista sem validar spec ou código.

| Módulo | Pasta / spec | O que cobre |
|--------|--------------|-------------|
| Visão e glossário | `_docs/00_overview/` | MVP, valor, termos (Household, PM, Valuation) e regras fundamentais |
| Arquitetura | `_docs/01_architecture/` | FastAPI + React, schema PostgreSQL 18, `QuoteProviderFactory` |
| Auth / 2FA | `_docs/02_security/` | JWT local, login em duas etapas, TOTP obrigatório/ativo |
| Household | `_docs/03_household/` | Grupo familiar, contas individuais, matriz `can_view` |
| Catálogos | `_docs/04_core_domain/02_reference_catalogs_institutions_and_assets.md` | Instituições e ativos (com/sem ticker); seed via Admin |
| Instituições e contas | `_docs/07_epics/03_epic_institutions_and_accounts.md` | `institutions` + `brokerage_accounts` do usuário |
| Carteira e transações | `_docs/07_epics/04_epic_portfolio_and_transactions.md` | BUY/SELL, preço médio dinâmico, consolidado da household |
| Cotações e patrimônio | `_docs/04_core_domain/05_asset_market_prices.md` | `asset_market_prices`, fallback para PM, saldo de renda fixa |
| Proventos | `_docs/04_core_domain/04_dividends_and_income_events.md`, `_docs/07_epics/06_epic_dividends_and_income.md` | `asset_income_events` (DIVIDEND, JCP, STOCK_YIELD, FII_YIELD, COUPON); não altera PM |
| Reinvestimento | `_docs/04_core_domain/06_dividend_reinvestment_reports.md` | Abas em `/dividends`: consolidado, histórico, reinvestimento FII/ações |
| Projeção | `_docs/09_projection/` | Simulação `/projection` — FII (MVP); ações/RF/Tesouro no roadmap |
| Admin e auditoria | `_docs/04_core_domain/01_fastapi_admin_setup.md`, `03_admin_permissions_and_audit.md` | Painel `/admin`, `is_superuser`, logs, reset de 2FA |
| Frontend / fluxos | `_docs/06_frontend/` | Telas MVP, Redux por feature, tema e UI minimalista |


## Repositório (monorepo)

| Caminho | Stack |
|---------|--------|
| `backend/` | ExpressoTS v4, PostgreSQL, Drizzle, SQL migrations |
| `frontend/` | React 19, Vite, TanStack Query, Ant Design, Tailwind |
| `.specs/` | Fonte da verdade funcional/técnica |

## Onde buscar “já existe?”

1. `.specs/<modulo>/` — regras numeradas (`RN-*`), contratos API
2. `backend/src/modules/<modulo>/` — implementação
3. `frontend/src/pages/`, `frontend/src/components/` — telas
4. Regras Cursor: `.cursor/rules/` (botões, listagens, forms, testes)

Cite no chat o que encontrou antes de propor solução duplicada.