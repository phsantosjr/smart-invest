# Visão do Produto e Escopo do MVP

## 1. Objetivo de Negócio
Construir uma plataforma web de gestão de investimentos para pessoas físicas (PF) com foco inicial no mercado financeiro brasileiro, permitindo consolidar posições, acompanhar evolução patrimonial e compartilhar visibilidade entre membros de uma mesma *household* (família ou pessoas próximas autorizadas).

## 2. Proposta de Valor
* **Controle unificado sem perda de autonomia:** Cada pessoa mantém suas próprias contas em corretoras/bancos, e o titular da *household* pode gerenciar ou liberar visualização de forma granular (`can_view`).
* **Cálculo auditável e transparente:** O preço médio de compra/venda é calculado dinamicamente via consulta no PostgreSQL 18, evitando inconsistências de estado cacheado.
* **Suporte híbrido a Renda Variável e Renda Fixa:** Ativos com ticker (Ações, FIIs) convivem com títulos sem ticker (CDB, LCI, LCA, Tesouro Direto, Fundos) e histórico periódico de valorização manual.
* **Agilidade na entrada de dados:** Importação de Notas de Corretagem em PDF via parser Python no backend para reduzir lançamento manual.

## 3. Escopo do MVP (In-Scope)
* Autenticação local via JWT com **2FA obrigatório/ativo** via TOTP.
* Gestão de *Household* e permissões explícitas de visualização (`can_view`) concedidas pelo usuário principal (*main user*).
* Cadastro normalizado de instituições financeiras (`institutions`) e contas por usuário (`brokerage_accounts`).
* Gestão de ativos de Renda Variável (Ações, FIIs) e Renda Fixa/Fundos/Tesouro (sem exigência de `ticker`).
* Lançamento de compras, vendas e cálculo de preço médio em tempo de consulta via banco de dados.
* Atualização manual periódica de saldo de Renda Fixa com registro histórico para análise de ganho/perda no período.
* Importação de Notas de Corretagem (PDF) via biblioteca Python no backend.
* Cotações de mercado integradas via **Factory Pattern** para suportar múltiplos provedores.
* Painel administrativo web via **FastAPI Admin**.

## 4. Fora do Escopo do MVP (Out-of-Scope)
* Integração direta via Open Finance / APIs proprietárias de corretoras para sincronização automática de saldo.
* Cálculo automatizado de IR (DARF mensal, day-trade, isenção de R$ 20 mil em ações) e geração de declaração anual de IRPF.
* Aplicativo nativo iOS/Android (o MVP foca em Web responsivo com React + TypeScript + Vite).
* Suporte multi-moeda nativo / ativos internacionais na primeira versão (foco inicial no Brasil / BRL).