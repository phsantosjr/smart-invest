# Gates de domínio — checklist para stories Smart Invest

Use ao redigir critérios de aceite. Fonte canônica: paths em `_docs/` (detalhes no agente `project-manager`).

## Sempre (toda story com API ou dado financeiro)

- [ ] Persona e se o ator é dono do recurso ou viewer com `can_view`
- [ ] Respostas **401** (não autenticado) e **403** (sem permissão) quando aplicável
- [ ] Valores/quantidades: sem regra que dependa de `float` — usar `Decimal`/`NUMERIC` nos testes de CA

## Household (`_docs/03_household/`)

- [ ] Conta de corretora **não** é compartilhada — só visibilidade entre membros
- [ ] Consulta a `user_id` alheio sem `household_permissions.can_view = true` → **403**
- [ ] Consolidado inclui **apenas** próprio + membros com `can_view` ativo

## Carteira / transações (EP-04)

- [ ] PM **não** persistido como coluna fonte da verdade — calculado na consulta
- [ ] `BUY`: custo = quantidade × preço + `fees`
- [ ] `SELL` com quantidade > posição → rejeição
- [ ] Escrita de transação só em conta do `current_user`

## Instituições / contas (EP-03)

- [ ] `institution_id` válido; sem auto-cadastro irrestrito de instituição pelo PF no MVP
- [ ] Duplicidade `account_number` + mesma instituição + mesmo usuário → conflito
- [ ] Delete de conta com histórico financeiro → bloqueado

## Proventos (EP-06, `04_dividends_and_income_events`)

- [ ] Provento **não** altera quantidade em custódia nem PM
- [ ] `net_amount = gross_amount - tax_withheld`
- [ ] Tipo de provento compatível com `asset_type`
- [ ] Agregações por `payment_date`

## Renda fixa / cotação

- [ ] Valuation: `applied_value` + `current_value` em `fixed_income_valuations`
- [ ] Cotação: último `quoted_at`; sem cotação → fallback PM documentado na story
- [ ] Cotações externas via **QuoteProviderFactory**, não acoplamento direto na regra

## Auth (`_docs/02_security/`)

- [ ] Token `2fa_challenge` não acessa rotas de carteira
- [ ] Fluxos de login/2FA descritos se a story alterar auth

## Admin (`03_admin_permissions_and_audit`)

- [ ] `is_superuser` ≠ `can_view` na API de investimentos
- [ ] `transactions` / `fixed_income_valuations` no admin: somente leitura no MVP
- [ ] Campos sensíveis (`password_hash`, `two_factor_secret`) fora de formulários admin

## Fora do MVP (não prometer sem épico)

Open Finance, IR/DARF/IRPF automatizado, app nativo, multi-moeda — marcar na seção **Fora do escopo** da story.