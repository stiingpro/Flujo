-- Migration: Add Currency Support to Transactions
-- Up Migration
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'CLP',
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10, 4) DEFAULT 1.0;

-- Basic validation check (optional, but good for data integrity)
-- ALTER TABLE transactions ADD CONSTRAINT check_currency_valid CHECK (currency_code IN ('CLP', 'USD', 'UF'));

-- Add comment
COMMENT ON COLUMN transactions.currency_code IS 'ISO 4217 Currency Code (e.g. CLP, USD, UF)';
COMMENT ON COLUMN transactions.exchange_rate IS 'Exchange rate to base currency (CLP) at the time of transaction';
