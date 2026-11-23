# Arquitetura do Sistema

## 1. Visão Geral
A aplicação segue uma arquitetura cliente-servidor modular:
* **Frontend:** SPA desenvolvida em **React**, **TypeScript** e **Vite**, com gerenciamento de estado global via **Redux Toolkit** e chamadas HTTP assíncronas autenticadas via JWT.
* **Backend API:** Serviço em **Python** com **FastAPI**, camada de acesso a dados com **SQLAlchemy (Async)** e validação de contratos com **Pydantic v2**.
* **Administração:** Painel web administrativo via **FastAPI Admin** para operação e suporte interno.
* **Banco de Dados:** **PostgreSQL 18**, utilizando tipos numéricos de alta precisão (`NUMERIC`), UUIDs, índices parciais e consultas agregadas para cálculo dinâmico de preço médio.

## 2. Fluxos Principais
1. **Autenticação e 2FA:** Login valida credenciais e emite JWT de desafio quando 2FA (TOTP) está ativo; após confirmação do código de 6 dígitos, emite o JWT de acesso definitivo.
2. **Gestão de Carteira e Transações:** Operações de compra, venda e marcação manual de renda fixa são persistidas em `transactions` e `fixed_income_valuations`; consultas consolidam posição e calculam o preço médio diretamente no banco.
3. **Importação de Notas de Corretagem:** Upload de PDF da B3 processado no backend por parser Python (`pdfplumber`), gerando lançamentos validados nas contas do usuário.
4. **Cotações de Mercado:** Serviço de consulta de preços resolve o provedor via `QuoteProviderFactory`, permitindo alternar ou adicionar fontes externas sem acoplamento no domínio.