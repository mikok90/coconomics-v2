-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Portfolios table
CREATE TABLE portfolios (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  total_value DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assets table
CREATE TABLE assets (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  asset_type VARCHAR(50) DEFAULT 'stock',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Portfolio positions
CREATE TABLE positions (
  id SERIAL PRIMARY KEY,
  portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
  asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
  quantity DECIMAL(15,6) NOT NULL,
  avg_buy_price DECIMAL(15,2) NOT NULL,
  current_price DECIMAL(15,2),
  current_weight DECIMAL(5,4), -- percentage as decimal (0.15 = 15%)
  target_weight DECIMAL(5,4),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(portfolio_id, asset_id)
);

-- Historical prices
CREATE TABLE price_history (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
  price DECIMAL(15,2) NOT NULL,
  date DATE NOT NULL,
  UNIQUE(asset_id, date)
);

-- Rebalancing history
CREATE TABLE rebalance_history (
  id SERIAL PRIMARY KEY,
  portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
  asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
  action VARCHAR(10) NOT NULL, -- BUY, SELL, HOLD
  from_weight DECIMAL(5,4),
  to_weight DECIMAL(5,4),
  amount DECIMAL(15,2),
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optimization results
CREATE TABLE optimization_results (
  id SERIAL PRIMARY KEY,
  portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
  expected_return DECIMAL(8,6),
  risk DECIMAL(8,6),
  sharpe_ratio DECIMAL(8,4),
  weights JSONB, -- stores symbol: weight pairs
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_positions_portfolio ON positions(portfolio_id);
CREATE INDEX idx_price_history_asset ON price_history(asset_id, date);
CREATE INDEX idx_rebalance_history_portfolio ON rebalance_history(portfolio_id);
