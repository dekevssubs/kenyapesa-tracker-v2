-- Goal Allocations Table
-- Implements the canonical ledger-first goal architecture
-- Goals track allocations of money in accounts, not account balances directly

CREATE TABLE IF NOT EXISTS goal_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  account_transaction_id UUID NOT NULL REFERENCES account_transactions(id) ON DELETE RESTRICT,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate allocations of same transaction to same goal
  UNIQUE(goal_id, account_transaction_id)
);

-- Index for fast goal balance calculations
CREATE INDEX idx_goal_allocations_goal_id ON goal_allocations(goal_id);

-- Index for transaction lookups
CREATE INDEX idx_goal_allocations_transaction_id ON goal_allocations(account_transaction_id);

-- Add deadline NOT NULL constraint to goals
-- Every goal must have a deadline for prioritization and forecasting

-- First, set a default deadline for any existing goals without one
-- (1 year from now for active goals)
UPDATE goals
SET deadline = CURRENT_DATE + INTERVAL '1 year'
WHERE deadline IS NULL;

-- Now enforce NOT NULL constraint
ALTER TABLE goals
  ALTER COLUMN deadline SET NOT NULL;

-- Add helpful comment
COMMENT ON TABLE goal_allocations IS 'Tracks allocations of account balances to goals. Goals are virtual sub-accounts that track claims on real account balances.';
COMMENT ON COLUMN goal_allocations.goal_id IS 'The goal this allocation belongs to';
COMMENT ON COLUMN goal_allocations.account_transaction_id IS 'The ledger transaction that funded this allocation';
COMMENT ON COLUMN goal_allocations.amount IS 'Amount allocated from the transaction to this goal';
