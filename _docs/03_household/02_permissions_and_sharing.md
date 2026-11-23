# Permissões e Compartilhamento na Household

## 1. Princípio de Segurança (Least Privilege / Explicit Opt-In)
Na *household*, o acesso à carteira de outro membro **nunca é implícito**. Um usuário só pode visualizar dados de investimento de outro membro da mesma *household* se houver permissão explícita ativa (`can_view = true`) concedida pelo titular (*main user*).

## 2. Tabela `household_permissions`
* `owner_user_id`: ID do usuário dono da carteira cujos dados estão sendo compartilhados.
* `viewer_user_id`: ID do membro da *household* que recebe ou não o direito de visualização.
* `can_view`: Booleano (`true` = visualização liberada; `false` = acesso bloqueado).
* Restrição `UNIQUE(owner_user_id, viewer_user_id)`: garante uma única regra de visibilidade por par dono/visualizador.

## 3. Comportamento Esperado na API
* **Consulta da própria carteira:** Sempre permitida ao usuário autenticado (`viewer_user_id == current_user.id`).
* **Consulta da carteira de outro membro:** A API verifica se `current_user.is_household_owner == true` ou se existe registro em `household_permissions` com `viewer_user_id == current_user.id`, `owner_user_id == target_user_id` e `can_view = true`. Caso contrário, retorna `403 Forbidden`.
* **Consolidado da Household:** Agrega exclusivamente as carteiras do próprio usuário e aquelas para as quais ele possui permissão explícita ativa (`can_view = true`).