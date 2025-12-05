-- Portfolio value snapshots for performance tracking
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id SERIAL PRIMARY KEY,
  portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
  total_value DECIMAL(15,2) NOT NULL,
  cash_balance DECIMAL(15,2) NOT NULL,
  positions_value DECIMAL(15,2) NOT NULL,
  snapshot_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(portfolio_id, snapshot_date)
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_portfolio ON portfolio_snapshots(portfolio_id, snapshot_date DESC);
