-- Migration: Add cash balance tracking and transactions table
-- Date: 2024

-- Add cash tracking columns to portfolios table
ALTER TABLE portfolios
ADD COLUMN IF NOT EXISTS cash_balance DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_deposits DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_withdrawals DECIMAL(15, 2) DEFAULT 0;

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  portfolio_id INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  symbol VARCHAR(10),
  quantity DECIMAL(15, 6),
  price DECIMAL(15, 2),
  cash_balance_after DECIMAL(15, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_portfolio FOREIGN KEY (portfolio_id) REFERENCES portfolios(id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_portfolio_id ON transactions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_symbol ON transactions(symbol);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- Add comment to explain transaction types
COMMENT ON COLUMN transactions.type IS 'Transaction type: DEPOSIT, WITHDRAWAL, BUY, SELL';
