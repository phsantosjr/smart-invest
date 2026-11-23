Épico 03: Gestão de Instituições e Contas em Corretoras

1. Visão Geral do Épico

ID do Épico: EP-03

Título: Cadastro de Instituições Financeiras e Contas Individuais em Corretoras/Bancos

Objetivo de Negócio: Permitir que cada pessoa física (PF) — tanto o titular (main user) quanto os membros da household — cadastre e gerencie suas próprias contas em bancos e corretoras (ex: XP Investimentos, Banco Inter, BTG Pactual) vinculadas a um catálogo normalizado de instituições (institutions), viabilizando o rastreamento de ativos, transações, proventos e notas de corretagem por conta.

2. Escopo do MVP

2.1. In-Scope

Consulta da lista padronizada de instituições financeiras cadastradas (institutions: bancos, corretoras e bancos múltiplos).

Cadastro, edição básica e listagem de contas em corretoras/bancos (brokerage_accounts) pertencentes ao usuário autenticado.

Associação de cada conta a um único user_id e a uma institution_id válida.

Bloqueio de exclusão de contas que já possuam transações (transactions), marcações de renda fixa (fixed_income_valuations) ou proventos (asset_income_events) vinculados, preservando o histórico financeiro.

Visualização de contas de outros membros da household estritamente quando houver permissão explícita (can_view = true) configurada pelo main user.

Interface web minimalista (React + TypeScript + Redux Toolkit) sem textos de marketing para gerenciar contas e visualizar instituições disponíveis.

2.2. Out-of-Scope

Integração automática via Open Finance / APIs de corretoras para importar contas ou saldos automaticamente.

Compartilhamento de uma mesma conta de corretora entre múltiplos usuários da household (cada membro mantém suas próprias contas).

Auto-cadastro irrestrito de novas instituições pelos usuários finais sem padronização administrativa (o catálogo mestre de institutions é gerido via FastAPI Admin).

3. Regras de Negócio

Unicidade de Titularidade da Conta: Cada registro em brokerage_accounts pertence exclusivamente a um user_id. Membros de uma mesma household operam suas próprias contas individuais.

Integridade com Catálogo de Instituições: Uma conta só pode ser criada referenciando um institution_id ativo na tabela institutions.

Prevenção de Duplicidade por Usuário: Um mesmo usuário não deve cadastrar duas contas com o exato mesmo account_number na mesma institution_id.

Isolamento de Manipulação: Somente o próprio dono da conta (brokerage_accounts.user_id == current_user.id) pode criar, editar ou remover (quando sem histórico) suas contas via API.

Visibilidade na Household: Membros autorizados (can_view = true) podem listar as contas do titular compartilhado apenas em modo leitura para filtragem de carteira e relatórios.

4. User Stories e Critérios de Aceite (BDD)

US-03.1 — Consultar Catálogo de Instituições Financeiras

Como usuário autenticado,

Quero listar as instituições financeiras disponíveis (bancos e corretoras),

Para selecionar corretamente onde mantenho minha conta de investimento.

Critérios de Aceite:

Given que o usuário está autenticado com JWT válido (type: "access"),

When ele chama GET /api/v1/institutions,

Then a API retorna 200 OK com a lista ordenada de instituições contendo id, name, code e institution_type.

US-03.2 — Cadastrar Conta em Banco ou Corretora

Como usuário autenticado,

Quero cadastrar minha conta de investimento informando a instituição e o número da conta,

Para lançar meus ativos, transações e importar notas de corretagem vinculadas a ela.

Critérios de Aceite:

Given que o usuário seleciona uma instituição válida (institution_id) e informa um account_number ainda não cadastrado por ele nessa instituição,

When ele envia POST /api/v1/brokerage-accounts,

Then o sistema cria o registro vinculado ao current_user.id e retorna 201 Created com os dados da conta.

Given que o usuário informa um account_number já cadastrado por ele para a mesma institution_id,

When ele envia POST /api/v1/brokerage-accounts,

Then a API rejeita a operação com 409 Conflict (ou 400 Bad Request) informando duplicidade de conta.

US-03.3 — Listar Próprias Contas e Contas Compartilhadas da Household

Como membro de uma household,

Quero visualizar minhas contas e, quando autorizado pelo main user, consultar as contas de outros membros da família,

Para acompanhar onde os investimentos estão custodiados.

Critérios de Aceite:

Given que o usuário acessa GET /api/v1/brokerage-accounts,

When nenhum filtro de outro usuário é passado,

Then a API retorna apenas as contas onde user_id == current_user.id.

Given que o usuário filtra por user_id de outro membro da household com can_view = true,

When ele chama GET /api/v1/brokerage-accounts?user_id=<target_id>,

Then a API retorna as contas daquele membro em modo somente leitura; caso can_view seja false ou inexistente, retorna 403 Forbidden.

US-03.4 — Proteção contra Exclusão de Conta com Histórico Financeiro

Como sistema,

Quero impedir a exclusão de contas que possuam transações, valuations de renda fixa ou proventos vinculados,

Para evitar perda de histórico e quebra no cálculo dinâmico de Preço Médio.

Critérios de Aceite:

Given que existe uma conta vinculada ao usuário com ao menos uma transação em transactions,

When o usuário solicita DELETE /api/v1/brokerage-accounts/{account_id},

Then o sistema bloqueia a exclusão e retorna 409 Conflict indicando que a conta possui movimentações vinculadas.

5. Dependências Técnicas

Banco de Dados (PostgreSQL 18): Tabelas institutions e brokerage_accounts criadas com chave estrangeira ON DELETE RESTRICT para institution_id e ON DELETE CASCADE para user_id.

FastAPI Admin: InstitutionAdmin configurado e seed inicial de instituições brasileiras executado (XP, Banco Inter, BTG Pactual, NuInvest / Nubank, Itaú, Clear, Rico).

Segurança: Middleware get_current_user validando JWT de acesso e verificação de household_permissions para consultas cruzadas.

Frontend (React + Redux Toolkit): Slice de contas/instituições e tela operacional minimalista (/accounts) integrada à sidebar.