# Autenticação JWT Local e Segurança da API

## 1. Objetivo
Garantir autenticação segura, stateless e auditável na API FastAPI para cada pessoa física (PF), protegendo rotas sensíveis de carteira, transações, notas de corretagem e configurações de *household*.

## 2. Estratégia de Tokens
* **Hash de Senhas:** Armazenar senhas exclusivamente como hash seguro (ex: `bcrypt` / `passlib`), nunca em texto plano.
* **JWT de Acesso (`type: "access"`):** Emitido após autenticação concluída (credenciais válidas + validação 2FA quando ativo). Contém pelo menos `sub` (ID do usuário em UUID), `type` e `exp` (tempo de expiração).
* **JWT de Desafio 2FA (`type: "2fa_challenge"`):** Token de curta duração (ex: 5 minutos) emitido na etapa 1 do login quando o usuário possui `is_2fa_enabled = true`. Não concede acesso às rotas protegidas da aplicação—serve exclusivamente para concluir a verificação do código TOTP em `/auth/2fa/verify`.

## 3. Fluxo de Login
1. Cliente envia `email` e `password` para `POST /api/v1/auth/login`.
2. Backend valida existência do usuário e conferência do `password_hash`. Em falha, retorna `401 Unauthorized`.
3. Se `user.is_2fa_enabled == true`: retorna `requires_2fa: true` e `temp_token` (`2fa_challenge`).
4. Se `user.is_2fa_enabled == false`: retorna `requires_2fa: false`, `access_token` e `token_type: "bearer"`.

## 4. Middleware / Dependência de Autorização
* Rotas protegidas exigem header `Authorization: Bearer <access_token>`.
* A dependência `get_current_user` valida assinatura, expiração e `type == "access"`, carregando o usuário ativo no contexto da requisição.
* Tentativas de usar `2fa_challenge` em rotas normais devem ser rejeitadas com `401 Unauthorized`.