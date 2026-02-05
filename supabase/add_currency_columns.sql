-- Migration: Add currency columns to transactions table
-- Run this in Supabase SQL Editor

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS "currency_code" VARCHAR(3) DEFAULT 'CLP',
ADD COLUMN IF NOT EXISTS "exchange_rate" DECIMAL(10,2) DEFAULT 1.0;

-- Optional: Update comment
COMMENT ON COLUMN transactions.currency_code IS 'Currency code (CLP, USD, UF)';
COMMENT ON COLUMN transactions.exchange_rate IS 'Exchange rate to CLP at transaction time';
