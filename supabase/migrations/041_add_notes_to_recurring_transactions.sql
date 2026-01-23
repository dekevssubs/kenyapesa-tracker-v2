-- Migration: Add notes column to recurring_transactions table
-- Purpose: Allow storing additional notes/context for recurring transactions

ALTER TABLE recurring_transactions
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN recurring_transactions.notes IS 'Additional notes or context for the recurring transaction';
