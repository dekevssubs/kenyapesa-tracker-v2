-- Migration: Add expense reversal fields
-- Date: 2025-12-27
-- Description: Adds columns to support expense immutability pattern (reverse instead of delete)

-- Add reversal columns to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_reversed BOOLEAN DEFAULT FALSE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS reversal_reason TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ;

-- Create index for faster queries on reversed expenses
CREATE INDEX IF NOT EXISTS idx_expenses_is_reversed ON expenses(is_reversed);

-- Add comment for documentation
COMMENT ON COLUMN expenses.is_reversed IS 'Flag indicating if this expense has been reversed';
COMMENT ON COLUMN expenses.reversal_reason IS 'User-provided reason for reversing the expense';
COMMENT ON COLUMN expenses.reversed_at IS 'Timestamp when the expense was reversed';
