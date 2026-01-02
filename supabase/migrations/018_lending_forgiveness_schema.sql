-- Migration: Lending Forgiveness Schema
-- Description: Add forgiveness support to lending_tracker table
-- Date: 2025-12-28

-- 1. Add 'forgiven' to repayment_status check constraint
ALTER TABLE lending_tracker DROP CONSTRAINT IF EXISTS lending_tracker_repayment_status_check;
ALTER TABLE lending_tracker ADD CONSTRAINT lending_tracker_repayment_status_check
  CHECK (repayment_status IN ('pending', 'partial', 'complete', 'forgiven'));

-- 2. Add forgiven_at and forgiven_reason columns to lending_tracker
ALTER TABLE lending_tracker
  ADD COLUMN IF NOT EXISTS forgiven_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS forgiven_reason TEXT;

-- 3. Create index for forgiven status tracking
CREATE INDEX IF NOT EXISTS idx_lending_forgiven ON lending_tracker(repayment_status)
  WHERE repayment_status = 'forgiven';

-- 4. Create index for overdue tracking (date-based queries)
CREATE INDEX IF NOT EXISTS idx_lending_due_date ON lending_tracker(expected_return_date)
  WHERE expected_return_date IS NOT NULL;

-- 5. Add comments for documentation
COMMENT ON COLUMN lending_tracker.forgiven_at IS 'Timestamp when the debt was forgiven';
COMMENT ON COLUMN lending_tracker.forgiven_reason IS 'Reason for forgiving the debt';
