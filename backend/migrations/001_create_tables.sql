-- Create tables for Coconomics database
-- Run this if synchronize: true doesn't work automatically

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Portfolios table
CREATE TABLE IF NOT EXISTS portfolios (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    total_value DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Assets table
CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    asset_type VARCHAR(50) DEFAULT 'stock',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Positions table
CREATE TABLE IF NOT EXISTS positions (
    id SERIAL PRIMARY KEY,
    portfolio_id INTEGER NOT NULL,
    asset_id INTEGER NOT NULL,
    quantity DECIMAL(15, 6) NOT NULL,
    avg_buy_price DECIMAL(15, 2) NOT NULL,
    current_price DECIMAL(15, 2),
    current_weight DECIMAL(5, 4),
    target_weight DECIMAL(5, 4),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

-- Price history table
CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL,
    price DECIMAL(15, 2) NOT NULL,
    date DATE NOT NULL,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

-- Rebalance history table
CREATE TABLE IF NOT EXISTS rebalance_history (
    id SERIAL PRIMARY KEY,
    portfolio_id INTEGER NOT NULL,
    asset_id INTEGER NOT NULL,
    action VARCHAR(10) NOT NULL,
    from_weight DECIMAL(5, 4),
    to_weight DECIMAL(5, 4),
    amount DECIMAL(15, 2),
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

-- Optimization results table
CREATE TABLE IF NOT EXISTS optimization_results (
    id SERIAL PRIMARY KEY,
    portfolio_id INTEGER NOT NULL,
    expected_return DECIMAL(8, 6),
    risk DECIMAL(8, 6),
    sharpe_ratio DECIMAL(8, 4),
    weights JSONB NOT NULL,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_portfolio_id ON positions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_positions_asset_id ON positions(asset_id);
CREATE INDEX IF NOT EXISTS idx_price_history_asset_id ON price_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_price_history_date ON price_history(date);
CREATE INDEX IF NOT EXISTS idx_rebalance_history_portfolio_id ON rebalance_history(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_optimization_results_portfolio_id ON optimization_results(portfolio_id);
