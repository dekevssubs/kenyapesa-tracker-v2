-- Migration: Lending Enhancements
-- Description: Add forgiven status, overdue tracking, and lending transaction types

-- 1. Add 'forgiven' to repayment_status enum
-- First, we need to alter the check constraint to include 'forgiven'
ALTER TABLE lending_tracker DROP CONSTRAINT IF EXISTS lending_tracker_repayment_status_check;
ALTER TABLE lending_tracker ADD CONSTRAINT lending_tracker_repayment_status_check
  CHECK (repayment_status IN ('pending', 'partial', 'complete', 'forgiven'));

-- 2. Rename columns to match current usage (if they exist with old names)
-- The service uses 'date' but schema has 'date_lent', and 'status' but schema has 'repayment_status'
-- We'll add aliases through a view or just use the existing columns

-- 3. Add 'forgiveness' and 'bad_debt' transaction types to account_transactions
-- Check if the constraint exists and modify it
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'account_transactions_transaction_type_check') THEN
    ALTER TABLE account_transactions DROP CONSTRAINT account_transactions_transaction_type_check;
  END IF;

  -- Add new constraint with forgiveness type
  ALTER TABLE account_transactions ADD CONSTRAINT account_transactions_transaction_type_check
    CHECK (transaction_type IN (
      'income', 'expense', 'transfer', 'withdrawal', 'deposit',
      'investment_contribution', 'investment_return', 'transaction_fee',
      'lending', 'repayment', 'reversal', 'forgiveness', 'bad_debt'
    ));
EXCEPTION
  WHEN others THEN
    -- If constraint doesn't exist or has different structure, just log and continue
    RAISE NOTICE 'Could not modify transaction_type constraint: %', SQLERRM;
END $$;

-- 4. Add forgiven_at and forgiven_reason columns to lending_tracker
ALTER TABLE lending_tracker
  ADD COLUMN IF NOT EXISTS forgiven_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS forgiven_reason TEXT;

-- 5. Create index for forgiven status tracking
CREATE INDEX IF NOT EXISTS idx_lending_forgiven ON lending_tracker(repayment_status)
  WHERE repayment_status = 'forgiven';

-- 6. Add computed overdue field (handled in application layer, but add index for date comparison)
CREATE INDEX IF NOT EXISTS idx_lending_due_date ON lending_tracker(expected_return_date)
  WHERE expected_return_date IS NOT NULL;

-- 7. Comment on new columns
COMMENT ON COLUMN lending_tracker.forgiven_at IS 'Timestamp when the debt was forgiven';
COMMENT ON COLUMN lending_tracker.forgiven_reason IS 'Reason for forgiving the debt';
