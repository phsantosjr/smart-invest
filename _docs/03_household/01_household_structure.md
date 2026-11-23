# Estrutura de Household

## 1. Objetivo
Permitir que pessoas físicas (PF) agrupem membros da família ou pessoas próximas em uma **Household**, mantendo contas individuais em corretoras/bancos e viabilizando tanto a gestão individual quanto a visão consolidada autorizada.

## 2. Entidades e Relacionamentos
* **Household (`households`):** Representa o núcleo familiar ou grupo (ex: *"Família Silva"*).
* **Usuário (`users`):** Cada pessoa física possui seu próprio login, senha e 2FA. Pode estar associada a um `household_id` e ter `is_household_owner = true` quando for o usuário principal (*main user*).
* **Contas de Investimento (`brokerage_accounts`):** Cada membro cadastra e gerencia suas próprias contas em corretoras/bancos (ex: XP, Banco Inter), vinculadas ao seu `user_id`.

## 3. Regras Estruturais do MVP
1. **Conta Individual por Pessoa:** Cada membro tem sua própria conta na corretora/banco (`user_id` único em `brokerage_accounts`), sem compartilhamento de credenciais ou posse promíscua da mesma conta de corretora.
2. **Autonomia Operacional:** Cada membro autenticado pode logar na sua própria conta e manipular seus próprios lançamentos e investimentos.
3. **Visão do Main User:** O titular da *household* (`is_household_owner = true`) atua como gestor do grupo, podendo visualizar consolidados e administrar quais membros têm permissão de leitura (`can_view`) sobre outras carteiras da *household*.