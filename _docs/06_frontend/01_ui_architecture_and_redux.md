# Arquitetura de UI e Estado Global (React + TypeScript + Vite + Redux)

## 1. Visão Geral
O frontend é uma Single Page Application (SPA) construída com **React**, **TypeScript** e **Vite**, priorizando tipagem estrita, modularidade por domínio, responsividade e interface minimalista com suporte a **Dark Mode** e **Light Mode** (com Tailwind CSS).

## 2. Organização Sugerida (`src/`)
* `src/app/`: Configuração da `store` do Redux Toolkit, hooks tipados (`useAppDispatch`, `useAppSelector`) e provider de tema.
* `src/features/auth/`: Slice de autenticação, fluxo em duas etapas (login + desafio TOTP 2FA) e configuração/confirmação de 2FA.
* `src/features/household/`: Slice de *household*, membros e permissões (`can_view`).
* `src/features/portfolio/`: Slice de instituições, contas em corretoras, ativos (renda variável e renda fixa), transações, histórico de valuations e consolidação de carteira.
* `src/features/imports/`: Slice de upload e pré-visualização de Notas de Corretagem (PDF).
* `src/services/api.ts`: Cliente HTTP (`axios` ou `fetch` wrapper) com interceptors para `Authorization: Bearer <access_token>` e tratamento padronizado de erros (`401`, `403`, `422`).
* `src/components/`: Componentes reutilizáveis de UI (tabelas, modais, badges de classe de ativo, seletor de tema).

## 3. Diretrizes de Estado e Dados no Redux Toolkit
* Usar `createAsyncThunk` (ou RTK Query) para chamadas assíncronas à API FastAPI, expondo estados claros de `loading`, `error` e `data` por feature.
* Isolar o estado de desafio 2FA (`tempToken`, `requires2fa`) no `authSlice` para não vazar para o estado autenticado antes da confirmação do código de 6 dígitos.
* Manter valores monetários e quantidades em strings ou formatos seguros de precisão até a formatação final em `BRL` (`pt-BR`), evitando arredondamentos acidentais durante cálculos ou filtros no cliente.
* Persistir a preferência de tema (`dark` / `light`) no estado da UI e no `localStorage`.
* **Privacidade de valores:** `ui.valuesHidden` (toggle no header, ícone `visibility`), persistido em `smart-invest-values-hidden`. Formatadores em `utils/money.ts` e `SensitiveText` para strings pré-formatadas no Redux.