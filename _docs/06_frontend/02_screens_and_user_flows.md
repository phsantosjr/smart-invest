# Telas e Fluxos de Usuário (MVP)

## 1. Autenticação e 2FA
* **Tela de Login (`/login`):**
  * Formulário de e-mail e senha.
  * Quando a API retornar `requires_2fa: true`, exibe o passo de verificação TOTP (código de 6 dígitos) associado ao `temp_token` temporário.
* **Configuração de Segurança (`/settings/security`):**
  * Permite iniciar o setup do 2FA (`/auth/2fa/setup`), exibir QR Code / chave secreta e confirmar a ativação com o primeiro código de 6 dígitos (`/auth/2fa/confirm`).

## 2. Household e Permissões
* **Gestão da Household (`/household`):**
  * Exibe o grupo familiar, os membros cadastrados e as contas vinculadas de cada membro.
  * Para o usuário principal (*main user*), disponibiliza controles de permissão (`can_view`) para liberar ou revogar visualização de carteiras entre membros, respeitando a regra de que cada membro possui sua própria conta na corretora.

## 3. Carteira, Transações e Renda Fixa
* **Dashboard / Carteira Consolidada (`/portfolio`):**
  * Seletor de contexto: visão individual, visão por membro autorizado da *household* ou consolidado permitido.
  * Listagem unificada com Ações, FIIs, Tesouro Direto, Renda Fixa e Fundos, exibindo quantidade, preço médio (calculado via banco), cotação/saldo atual e ganho/perda.
* **Lançamento de Compra / Venda (`/transactions/new`):**
  * Seleção da conta na corretora (`brokerage_accounts`), ativo (`assets`), tipo (`BUY` ou `SELL`), quantidade, preço unitário, taxas e data.
* **Marcação de Renda Fixa (`/transactions/new`, modo Renda Fixa):**
  * Campos: data da marcação, **valor aplicado** (capital inicial — obrigatório no primeiro lançamento da posição) e saldo bruto atual.
* **Lançamento de Provento (`/transactions/new`, modo Provento):**
  * Para **ações**, o tipo de provento oferece: Dividendos, Juros sobre Capital Próprio e Rendimento; FIIs e títulos mantêm as opções já restritas ao respectivo `asset_type`.
* **Detalhe e Marcação Manual de Renda Fixa (`/fixed-income/:assetId`):**
  * Exibe metadados do título (`issuer`, `maturity_date`, `indexer`), histórico cronológico de `fixed_income_valuations` e formulário para registrar novo saldo bruto com variação absoluta e percentual no período.

## 4. Projeção de investimentos
* **Projeção (`/projection`):**
  * Parâmetros: escopo (FII / carteira com aviso), aporte mensal, horizonte (até 20 anos), agrupamento mês ou ano, flag de distribuição de aporte pelos últimos rendimentos FII.
  * Processamento via `POST /api/v1/projections/run` (cálculo no backend).
  * Resultado: cards patrimônio inicial/final, abas **Tabela** e **Gráfico**.
  * Spec: `_docs/09_projection/01_fii_projection_mvp.md`.

## 5. Importação de Notas de Corretagem
* **Importar Nota PDF (`/imports/brokerage-note`):**
  * Seleção da conta de corretora de destino e upload de arquivo `.pdf` da B3.
  * Exibe o resumo das transações extraídas/gravadas e atualiza a visão da carteira em seguida.