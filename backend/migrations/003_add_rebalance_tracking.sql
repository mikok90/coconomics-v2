-- Migration: Add threshold rebalancing tracking fields
-- Date: 2025-01-04
-- Description: Adds last_rebalance_price and last_rebalance_action columns to positions table

ALTER TABLE positions
ADD COLUMN IF NOT EXISTS last_rebalance_price DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS last_rebalance_action VARCHAR(10);

-- Comment on columns
COMMENT ON COLUMN positions.last_rebalance_price IS 'Reference price from last threshold rebalance action';
COMMENT ON COLUMN positions.last_rebalance_action IS 'Last rebalance action: BUY or SELL';
