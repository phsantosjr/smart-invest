# Modelo de Dados (PostgreSQL 18)

## 1. Diretrizes de Modelagem
* **Chaves Primárias:** `UUID` gerado no banco (`gen_random_uuid()`).
* **Valores Monetários e Quantidades:** `NUMERIC` com escala adequada (`NUMERIC(18, 6)` para quantidades e `NUMERIC(18, 4)` para preços/valores/taxas), evitando perda de precisão em cálculos financeiros.
* **Tickers Opcionais:** Ativos de Renda Fixa e títulos sem código de negociação em bolsa possuem `ticker = NULL`, protegidos por índice único parcial (`WHERE ticker IS NOT NULL`).

## 2. DDL Completo

```sql
-- 1. Instituições (Bancos e Corretoras)
CREATE TABLE institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20), -- Ex: código COMPE/ISPB
    institution_type VARCHAR(30) NOT NULL, -- 'BROKERAGE', 'BANK', 'BOTH'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Households e Usuários
CREATE TABLE households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_household_owner BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    is_2fa_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE household_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    viewer_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    can_view BOOLEAN DEFAULT FALSE,
    UNIQUE(owner_user_id, viewer_user_id)
);

-- 3. Contas em Corretoras / Bancos
CREATE TABLE brokerage_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES institutions(id) ON DELETE RESTRICT,
    account_number VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Ativos (Renda Variável e Renda Fixa / Sem Ticker)
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticker VARCHAR(20),
    name VARCHAR(150) NOT NULL,
    asset_type VARCHAR(30) NOT NULL, -- 'STOCK', 'FII', 'TREASURY', 'FIXED_INCOME', 'FUND'
    issuer VARCHAR(100),
    maturity_date DATE,
    indexer VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_assets_ticker_not_null
ON assets (ticker)
WHERE ticker IS NOT NULL;

-- 5. Transações
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brokerage_account_id UUID REFERENCES brokerage_accounts(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL, -- 'BUY', 'SELL', 'FIXED_INCOME_UPDATE'
    quantity NUMERIC(18, 6) NOT NULL,
    unit_price NUMERIC(18, 4) NOT NULL,
    fees NUMERIC(18, 4) DEFAULT 0.00,
    total_amount NUMERIC(18, 4) NOT NULL,
    transaction_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Histórico de Marcação Manual de Renda Fixa
CREATE TABLE fixed_income_valuations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    brokerage_account_id UUID REFERENCES brokerage_accounts(id) ON DELETE CASCADE,
    applied_value NUMERIC(18, 4) NOT NULL, -- capital inicial (valor aplicado)
    current_value NUMERIC(18, 4) NOT NULL, -- saldo bruto na data da marcação
    valuation_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);