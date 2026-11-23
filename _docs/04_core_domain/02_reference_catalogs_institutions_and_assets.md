Especificação: Catálogos de Referência (Instituições e Ativos)

1. Objetivo de Negócio

Padronizar e centralizar o cadastro administrativo das entidades base do sistema financeiro — Instituições Financeiras (institutions) e Ativos (assets) — garantindo integridade referencial, evitando duplicidades (ex: "XP", "XP Investimentos", "xp") e viabilizando tanto ativos negociados em bolsa (com ticker) quanto títulos de renda fixa e fundos (sem ticker).

2. Escopo e Regras de Negócio

2.1. Catálogo de Instituições (institutions)

Padronização de Nome: O campo name é obrigatório e único (UNIQUE), representando o nome oficial ou comercial padronizado da corretora ou banco (ex: "XP Investimentos", "Banco Inter", "BTG Pactual", "Nubank").

Código Identificador: O campo code (opcional) armazena o código COMPE ou ISPB da instituição para referência e futuras integrações.

Classificação da Instituição (institution_type): Deve aceitar apenas valores padronizados:

BROKERAGE (Corretora de Valores)

BANK (Banco Comercial / Digital)

BOTH (Banco Múltiplo com Corretora integrada)

Proteção contra Exclusão: Uma instituição que já possua contas vinculadas em brokerage_accounts não pode ser excluída (ON DELETE RESTRICT), preservando o histórico de contas e transações dos usuários.

2.2. Catálogo de Ativos (assets)

Suporte Híbrido (Com e Sem Ticker):

Renda Variável (STOCK, FII): Devem possuir ticker preenchido em letras maiúsculas e sem espaços (ex: PETR4, HGLG11), protegido por índice único parcial (idx_assets_ticker_not_null).

Renda Fixa, Tesouro e Fundos (FIXED_INCOME, TREASURY, FUND): Podem ter ticker = NULL quando não possuem código de negociação em bolsa, sendo identificados pelo conjunto de name, asset_type, issuer, maturity_date e indexer.

Normalização de Entrada no Admin:

Ao salvar ou editar um ativo no painel admin, strings vazias ("") no campo ticker devem ser convertidas automaticamente para NULL no PostgreSQL 18 para não violar o índice único parcial.

Valores preenchidos em ticker devem ser normalizados com .strip().upper().

Metadados de Renda Fixa / Tesouro:

issuer: Emissor do título (ex: "Banco Inter", "Tesouro Nacional").

maturity_date: Data de vencimento do título.

indexer: Indexador de rentabilidade (ex: CDI, IPCA, PREFIXED, SELIC).

3. Especificação Técnica (FastAPI Admin / SQLAlchemy)

3.1. Campos e Filtros na InstitutionAdmin

Colunas na Listagem: name, code, institution_type, created_at.

Busca (column_searchable_list): name, code.

Filtros (column_filters): institution_type.

Permissões no Admin: Criar (can_create = True), Editar (can_edit = True), Visualizar (can_view_details = True), Excluir (can_delete = False no MVP).

3.2. Campos e Filtros na AssetAdmin

Colunas na Listagem: ticker, name, asset_type, issuer, maturity_date, indexer.

Busca (column_searchable_list): ticker, name, issuer.

Filtros (column_filters): asset_type, indexer.

Validação no Hook on_model_change:

Converter ticker vazio ("" ou apenas espaços) para None.

Se ticker não for None, aplicar .strip().upper().

Validar que asset_type pertence ao conjunto permitido (STOCK, FII, TREASURY, FIXED_INCOME, FUND).

4. Critérios de Aceite (BDD)

Cenário 1 — Cadastro de instituição financeira no painel admin

Given que o administrador está autenticado no /admin,

When ele acessa Institutions > Create e preenche name = "XP Investimentos", code = "607" e institution_type = "BROKERAGE",

Then o registro é persistido no PostgreSQL 18 e fica disponível para seleção pelos usuários ao cadastrar suas contas.

Cenário 2 — Bloqueio de instituição duplicada

Given que já existe uma instituição com name = "Banco Inter",

When o administrador tenta cadastrar outra instituição com o mesmo nome,

Then o sistema impede a gravação e exibe erro de unicidade sem quebrar a aplicação.

Cenário 3 — Cadastro de ativo de Renda Variável com normalização de ticker

Given que o administrador cadastra um ativo do tipo STOCK informando ticker = " petr4 " e name = "Petrobras PN",

When o formulário é submetido,

Then o sistema salva ticker = "PETR4" em maiúsculas e garante sua unicidade na tabela assets.

Cenário 4 — Cadastro de ativo de Renda Fixa sem ticker

Given que o administrador cadastra um ativo do tipo FIXED_INCOME com name = "CDB Banco Inter 110% CDI", issuer = "Banco Inter", indexer = "CDI", maturity_date = "2029-12-31" e ticker em branco,

When o formulário é submetido,

Then o sistema converte ticker para NULL no banco de dados e permite cadastrar múltiplos títulos de renda fixa sem conflito de índice único.

5. Dependências e Próximos Passos

Banco de Dados: Garantir execução da migration contendo a tabela institutions, a tabela assets e o índice parcial idx_assets_ticker_not_null.

Backend: Implementar as classes InstitutionAdmin e AssetAdmin em app/admin/views.py e criar seed inicial (scripts/seed_institutions.py) com as principais corretoras e bancos brasileiros.