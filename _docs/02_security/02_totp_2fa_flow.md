# Autenticação de Dois Fatores (2FA via TOTP)

## 1. Objetivo
Adicionar uma segunda camada de proteção baseada em **TOTP (Time-based One-Time Password)** compatível com aplicativos autenticadores padrão (Google Authenticator, Authy, 1Password etc.) utilizando `pyotp` no backend FastAPI.

## 2. Estados no Modelo de Usuário (`users`)
* `two_factor_secret`: Segredo Base32 gerado via `pyotp.random_base32()`.
* `is_2fa_enabled`: Booleano (`FALSE` por padrão). Só passa a `TRUE` após o usuário confirmar com sucesso o primeiro código TOTP gerado.

## 3. Fluxo de Ativação em 2 Etapas
### Etapa A — Setup (`POST /api/v1/auth/2fa/setup`)
* Requer usuário autenticado via `access_token`.
* Gera novo `two_factor_secret` e `provisioning_uri` (`otpauth://totp/...`).
* Persiste `two_factor_secret` mantendo `is_2fa_enabled = FALSE` até confirmação, evitando bloqueio acidental caso o QR Code não seja escaneado corretamente.

### Etapa B — Confirmação (`POST /api/v1/auth/2fa/confirm`)
* Recebe código TOTP de 6 dígitos (`code`).
* Valida o código contra `current_user.two_factor_secret` usando `valid_window=1` (tolerância de 30s para ajustes leves de relógio).
* Se válido, atualiza `is_2fa_enabled = TRUE` e persiste no PostgreSQL 18.

## 4. Fluxo de Verificação no Login (`POST /api/v1/auth/2fa/verify`)
* Recebe `temp_token` e `code` de 6 dígitos.
* Valida `temp_token` (`type == "2fa_challenge"` e não expirado) e verifica o TOTP.
* Em caso de sucesso, emite o JWT `access_token` definitivo.