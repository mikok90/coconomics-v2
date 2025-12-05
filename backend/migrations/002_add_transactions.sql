-- Transactions table to track all buy/sell history
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
  asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
  transaction_type VARCHAR(10) NOT NULL, -- 'BUY' or 'SELL'
  quantity DECIMAL(15,6) NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL, -- quantity * price
  transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_transactions_portfolio ON transactions(portfolio_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_asset ON transactions(asset_id);
