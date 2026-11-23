# Especificação Funcional e Técnica: Login e Autenticação

## 1. Objetivo de Negócio
Permitir que pessoas físicas (PF) — incluindo o usuário principal (*main user*) e membros autorizados da *household* — autentiquem-se com segurança na plataforma de gestão de investimentos utilizando credenciais locais (`email` e `password`), emissão de **JWT** e suporte nativo a **2FA (TOTP)**.

## 2. Escopo e Regras de Negócio
1. **Identificação Única:** O login é realizado por `email` (único na tabela `users`) e `password`.
2. **Proteção de Credenciais:** A senha é comparada contra `password_hash` via função criptográfica segura (`bcrypt` / `passlib`); mensagens de erro de autenticação não devem revelar se o e-mail existe ou se apenas a senha está incorreta (`401 Unauthorized`).
3. **Fluxo em Duas Etapas quando 2FA está Ativo:**
   * Se `user.is_2fa_enabled == true`: após validar e-mail e senha, o sistema **não** emite o token de acesso final. Em vez disso, retorna `requires_2fa: true` e um `temp_token` JWT de curta duração (ex: 5 minutos) com `type: "2fa_challenge"`.
   * O acesso definitivo (`access_token` com `type: "access"`) só é liberado após a validação do código TOTP de 6 dígitos em `/api/v1/auth/2fa/verify`.
4. **Fluxo Direto quando 2FA está Desativado:**
   * Se `user.is_2fa_enabled == false`: após validar e-mail e senha, o sistema retorna `requires_2fa: false`, `access_token` e `token_type: "bearer"`.
5. **Isolamento de Token de Desafio:** Um token `2fa_challenge` não pode ser aceito em rotas protegidas da aplicação (carteira, transações, *household*, etc.).

## 3. Contrato da API (`POST /api/v1/auth/login`)

### Request Body
```json
{
  "email": "usuario@exemplo.com",
  "password": "senha_segura_do_usuario"
}

Respostas Possíveis
200 OK (2FA Ativo — Etapa 1 concluída):

JSON
{
  "requires_2fa": true,
  "temp_token": "<jwt_2fa_challenge>",
  "message": "Insira o código de autenticação de 2 fatores."
}
200 OK (2FA Inativo — Login concluído):

JSON
{
  "requires_2fa": false,
  "access_token": "<jwt_access_token>",
  "token_type": "bearer"
}
401 Unauthorized (Credenciais inválidas):

JSON
{
  "detail": "Credenciais inválidas."
}
4. Critérios de Aceite (BDD)
Cenário 1 — Login com sucesso sem 2FA ativo

Given que existe um usuário cadastrado com is_2fa_enabled = false,

When ele envia email e password válidos para POST /api/v1/auth/login,

Then o sistema deve retornar 200 OK com requires_2fa: false e um access_token JWT válido.

Cenário 2 — Login com sucesso exigindo 2FA

Given que existe um usuário cadastrado com is_2fa_enabled = true,

When ele envia email e password válidos para POST /api/v1/auth/login,

Then o sistema deve retornar 200 OK com requires_2fa: true e um temp_token de curta duração (type: "2fa_challenge"), sem liberar acesso direto à carteira.

Cenário 3 — Falha por credenciais inválidas

Given que o usuário informa um e-mail inexistente ou senha incorreta,

When ele submete o formulário ou chama POST /api/v1/auth/login,

Then o sistema deve retornar 401 Unauthorized com mensagem genérica de credenciais inválidas.

Cenário 4 — Bloqueio de uso indevido do temp_token

Given que o usuário possui um temp_token (type: "2fa_challenge"),

When ele tenta usar esse token no header Authorization: Bearer <temp_token> em um endpoint protegido (ex: GET /api/v1/portfolio),

Then o sistema deve rejeitar a requisição com 401 Unauthorized.