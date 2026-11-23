-- Executado apenas na primeira inicialização do volume do Postgres.
-- Alinhado a _docs: UUIDs e NUMERIC para domínio financeiro.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";