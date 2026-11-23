# Especificação: Configuração e Setup do FastAPI Admin

## 1. Objetivo de Negócio
Disponibilizar uma interface web administrativa interna (equivalente ao Django Admin) acoplada ao backend FastAPI e ao SQLAlchemy Async, permitindo que operadores autorizados gerenciem tabelas de referência (`institutions`, `assets`), auditem cadastros de usuários e *households* e realizem suporte operacional sem intervenção direta via SQL no banco de dados.

## 2. Escopo e Regras de Negócio
1. **Isolamento de Acesso:** O painel administrativo (`/admin`) é restrito exclusivamente a usuários com perfil administrativo (`is_superuser = true` no modelo `users`) e nunca deve ser acessível por usuários comuns de PF ou membros de *household*.
2. **Autenticação Própria / Protegida:** O acesso à interface web do FastAPI Admin exige sessão autenticada válida, separada dos tokens JWT comuns da API de cliente ou validada contra credenciais administrativas dedicadas.
3. **Proteção de Integridade de Dados:**
   * Tabelas mestras (`institutions`, `assets`) podem ser criadas, editadas e consultadas via painel admin.
   * Registros financeiros críticos (`transactions` e `fixed_income_valuations`) devem operar em modo **somente leitura** no MVP para preservar a auditabilidade do cálculo dinâmico de preço médio e do histórico patrimonial.
4. **Exposição Segura:** A rota `/admin` deve ter prefixo configurável via variável de ambiente (`ADMIN_PATH`) e suportar desativação ou restrição de rede em produção se necessário.

## 3. Especificação Técnica (Backend FastAPI + SQLAlchemy)

### 3.1. Dependências e Integração
* **Stack:** `FastAPI`, `SQLAlchemy (Async)`, `PostgreSQL 18` e biblioteca de painel admin compatível com SQLAlchemy Async (`fastapi-admin` ou `sqladmin` como alternativa com suporte nativo a `AsyncSession` e Starlette/FastAPI).
* **Montagem na Aplicação (`app/main.py`):**
  * Instanciar o painel admin passando a `engine` assíncrona do SQLAlchemy e o `authentication_backend` dedicado.
  * Registrar as *ModelViews* por domínio administrativo.

### 3.2. Alteração Necessária no Modelo `users`
Para distinguir operadores do painel admin de usuários finais PF, incluir flag administrativa explícita na tabela `users`:

```sql
ALTER TABLE users
ADD COLUMN is_superuser BOOLEAN NOT NULL DEFAULT FALSE;
```

### 3.3. Matriz de ModelViews no MVP

| Model / Tabela | Listar | Criar | Editar | Excluir | Observações Operacionais |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **`Institution`** | Sim | Sim | Sim | Não* | *Bloquear exclusão se houver `brokerage_accounts` vinculadas (`ON DELETE RESTRICT`). |
| **`Asset`** | Sim | Sim | Sim | Não* | Validar unicidade de `ticker` quando não nulo; permitir `ticker = NULL` para Renda Fixa. |
| **`User`** | Sim | Não | Parcial | Não | Ocultar `password_hash` e `two_factor_secret`; permitir visualizar status `is_2fa_enabled` e `is_superuser`. |
| **`Household`** | Sim | Não | Sim | Não | Consulta de agrupamento familiar e titularidade (`is_household_owner`). |
| **`BrokerageAccount`** | Sim | Não | Não | Não | Somente leitura para suporte e conferência de vínculo usuário/instituição. |
| **`Transaction`** | Sim | Não | Não | Não | Somente leitura no MVP para garantir integridade do cálculo de Preço Médio. |
| **`FixedIncomeValuation`** | Sim | Não | Não | Não | Somente leitura no MVP para preservar histórico cronológico de rentabilidade. |

## 4. Critérios de Aceite (BDD)

* **Cenário 1 — Acesso autorizado ao painel administrativo**
  * **Given** que existe um usuário cadastrado com `is_superuser = true`,
  * **When** ele acessa `/admin/login` e informa credenciais válidas,
  * **Then** o sistema autentica a sessão administrativa e exibe o painel com os modelos registrados.

* **Cenário 2 — Bloqueio de usuário comum (PF)**
  * **Given** que existe um usuário comum cadastrado com `is_superuser = false`,
  * **When** ele tenta efetuar login na interface `/admin`,
  * **Then** o sistema deve negar o acesso e retornar erro de permissão insuficiente.

* **Cenário 3 — Proteção de campos sensíveis no painel**
  * **Given** que o administrador acessa a listagem ou detalhe de `users` no painel admin,
  * **When** os dados são renderizados na tela,
  * **Then** os campos `password_hash` e `two_factor_secret` nunca devem ser exibidos em texto claro nem editáveis diretamente via formulário.

* **Cenário 4 — Integridade de transações financeiras**
  * **Given** que o administrador visualiza a tabela `transactions` ou `fixed_income_valuations` no painel admin,
  * **When** inspeciona as ações disponíveis na interface,
  * **Then** apenas a visualização e filtros devem estar habilitados, sem botões de criação, edição ou exclusão.

## 5. Dependências e Próximos Passos
* **Banco de Dados:** Aplicar migration adicionando `is_superuser` na tabela `users`.
* **Backend:** Configurar o módulo `app/admin/` com o backend de autenticação administrativa, registrar as *ModelViews* conforme a matriz acima e criar um comando CLI (`scripts/create_superuser.py`) para provisionar o primeiro administrador.