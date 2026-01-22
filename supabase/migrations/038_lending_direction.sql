-- Migration: Add loan direction to lending_tracker for borrowing support
-- Purpose: Track both money you LEND (give) and money you BORROW (receive)
--          in a unified lending_tracker table

-- Step 1: Add loan_direction column to distinguish lending vs borrowing
ALTER TABLE lending_tracker
ADD COLUMN IF NOT EXISTS loan_direction VARCHAR(20) DEFAULT 'lent'
  CHECK (loan_direction IN ('lent', 'received'));

-- Step 2: Add lender_type for categorizing who you borrowed from
-- This is useful when loan_direction = 'received'
ALTER TABLE lending_tracker
ADD COLUMN IF NOT EXISTS lender_type VARCHAR(50);
-- Values: 'individual', 'chama', 'sacco', 'bank', 'mfi', 'employer', 'other'

-- Step 3: Create indexes for efficient filtering by direction
CREATE INDEX IF NOT EXISTS idx_lending_direction
  ON lending_tracker(user_id, loan_direction);

CREATE INDEX IF NOT EXISTS idx_lending_direction_status
  ON lending_tracker(user_id, loan_direction, repayment_status);

-- Step 4: Update existing records to have explicit 'lent' direction
UPDATE lending_tracker
SET loan_direction = 'lent'
WHERE loan_direction IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN lending_tracker.loan_direction IS 'Direction of loan: lent (you gave money) or received (you borrowed money)';
COMMENT ON COLUMN lending_tracker.lender_type IS 'Type of lender when borrowing: individual, chama, sacco, bank, mfi, employer, other';
