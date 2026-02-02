-- FlujoGlobal Database Schema for Supabase
-- Run this in the Supabase SQL Editor

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  level VARCHAR(20) DEFAULT 'empresa' CHECK (level IN ('personal', 'empresa')),
  sublevel VARCHAR(20),
  color VARCHAR(10),
  is_fixed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Unique category name per user and type
  UNIQUE(name, type, user_id)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  category_id TEXT,
  type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  status VARCHAR(10) NOT NULL CHECK (status IN ('real', 'projected')) DEFAULT 'projected',
  "paymentStatus" VARCHAR(20) DEFAULT 'pending' CHECK ("paymentStatus" IN ('confirmed', 'pending')),
  origin VARCHAR(10) NOT NULL CHECK (origin IN ('business', 'personal')) DEFAULT 'business',
  installment JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_date_range ON transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on transactions
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Categories policies
DROP POLICY IF EXISTS "Users can view own categories" ON categories;
CREATE POLICY "Users can view own categories" ON categories
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own categories" ON categories;
CREATE POLICY "Users can insert own categories" ON categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own categories" ON categories;
CREATE POLICY "Users can update own categories" ON categories
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own categories" ON categories;
CREATE POLICY "Users can delete own categories" ON categories
    FOR DELETE USING (auth.uid() = user_id);

-- Transactions policies
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
CREATE POLICY "Users can insert own transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
CREATE POLICY "Users can update own transactions" ON transactions
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;
CREATE POLICY "Users can delete own transactions" ON transactions
    FOR DELETE USING (auth.uid() = user_id);
