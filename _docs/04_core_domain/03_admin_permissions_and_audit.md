Especificação: Permissões Administrativas e Auditoria

1. Objetivo de Negócio

Definir as regras de controle de acesso, segregação de funções e rastreabilidade operacional do painel administrativo (FastAPI Admin), garantindo que apenas operadores autorizados (is_superuser = true) acessem a interface interna, sem comprometer a privacidade das households nem a integridade dos registros financeiros dos usuários.

2. Escopo e Regras de Negócio

2.1. Segregação entre Operador Admin e Usuário PF / Household

Perfis Distintos: O atributo is_superuser controla exclusivamente o acesso ao painel /admin, enquanto is_household_owner e household_permissions governam a visualização e gestão de carteiras na aplicação final.

Proibição de Acesso Implícito via API: Um superusuário não recebe automaticamente permissão can_view nas carteiras de outros usuários na API REST de investimentos; qualquer visualização de suporte ocorre de forma controlada dentro do painel administrativo.

Gestão de Superusuários: No MVP, a promoção ou revogação de is_superuser = true deve ser realizada exclusivamente via script CLI controlado no servidor (scripts/create_superuser.py) ou diretamente por administrador de infraestrutura, nunca via auto-registro público.

2.2. Políticas de Proteção de Dados Sensíveis

Credenciais e Segredos Ocultos: Os campos password_hash e two_factor_secret da tabela users são estritamente bloqueados (column_exclude_list / form_excluded_columns) em todas as telas de listagem, detalhe e edição do painel admin.

Reset de 2FA (Suporte Operacional): Caso um usuário perca acesso ao aplicativo autenticador, o administrador pode apenas desativar o 2FA (is_2fa_enabled = False e limpar two_factor_secret = None) após validação de suporte, obrigando o usuário a reconfigurar o 2FA no próximo acesso.

Imutabilidade de Histórico Financeiro: No painel admin, as tabelas transactions e fixed_income_valuations são configuradas em modo somente leitura (can_create = False, can_edit = False, can_delete = False), garantindo que o preço médio calculado via query no PostgreSQL 18 reflita apenas lançamentos originados pela aplicação.

2.3. Rastreabilidade e Auditoria

Logs de Autenticação Admin: Toda tentativa de login no /admin (sucesso ou falha) deve registrar timestamp, e-mail utilizado, endereço IP de origem e resultado no log estruturado da aplicação.

Logs de Mutação em Catálogos: Alterações realizadas via painel admin em institutions, assets, users (ex: reset de 2FA) e households devem registrar o ID do administrador responsável, a entidade afetada, a ação (CREATE, UPDATE, RESET_2FA) e a data/hora da operação.

3. Especificação Técnica (FastAPI Admin / SQLAlchemy)

3.1. Backend de Autenticação (AdminAuth)

Implementa login(request), logout(request) e authenticate(request) utilizando sessão assinada (SessionMiddleware com SECRET_KEY dedicada).

Durante o login, valida email + verify_password(password, user.password_hash) e exige user.is_superuser is True.

Em cada requisição subsequente ao /admin, authenticate revalida na base de dados se o usuário da sessão ainda existe e permanece com is_superuser is True, garantindo revogação imediata caso o privilégio seja removido.

3.2. Tabela de Auditoria Administrativa (Opcional / Recomendada no MVP)

CREATE TABLE admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'CREATE', 'UPDATE', 'RESET_2FA'
    target_model VARCHAR(100) NOT NULL,
    target_id VARCHAR(100),
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


3.3. Hooks de Auditoria nas ModelViews

Sobrescrever after_model_change(data, model, is_created, request) nas views editáveis (InstitutionAdmin, AssetAdmin, UserAdmin, HouseholdAdmin) para gravar automaticamente o registro correspondente em admin_audit_logs.

4. Critérios de Aceite (BDD)

Cenário 1 — Revogação imediata de sessão administrativa

Given que um administrador está logado no /admin,

When sua flag is_superuser é alterada para false no banco de dados e ele recarrega qualquer página do painel,

Then o middleware de autenticação do painel deve invalidar a sessão e redirecioná-lo para /admin/login.

Cenário 2 — Registro de auditoria ao cadastrar ou editar catálogo

Given que um administrador autenticado cria ou edita um registro em institutions ou assets,

When a operação é concluída com sucesso,

Then um registro é gravado em admin_audit_logs contendo admin_user_id, action, target_model, target_id e timestamp.

Cenário 3 — Reset controlado de 2FA pelo suporte

Given que um usuário solicita recuperação de acesso por perda do dispositivo autenticador,

When o administrador aciona o reset de 2FA no painel admin,

Then o sistema define is_2fa_enabled = false, limpa two_factor_secret = NULL e registra o evento RESET_2FA em admin_audit_logs, sem jamais exibir o segredo antigo.

Cenário 4 — Tentativa de login administrativo sem privilégio

Given que um usuário com is_superuser = false tenta autenticar-se em /admin/login,

When ele submete suas credenciais,

Then o acesso é negado e uma entrada LOGIN_FAILED é registrada nos logs de auditoria.

5. Dependências e Próximos Passos

Banco de Dados: Incluir a tabela admin_audit_logs na migration do módulo administrativo.

Backend: Implementar AdminAuth em app/admin/auth.py com revalidação contínua de is_superuser e integrar os hooks de auditoria nas ModelViews editáveis.