-- Migration: Update recurring_transactions table
-- Description: Add fields to support automatic expense creation

-- Add new columns to recurring_transactions table
ALTER TABLE recurring_transactions
  ADD COLUMN IF NOT EXISTS last_auto_created_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS auto_create_days_before INTEGER DEFAULT 0 CHECK (auto_create_days_before >= 0 AND auto_create_days_before <= 30);

-- Add index for queries that check for due recurring transactions
CREATE INDEX IF NOT EXISTS idx_recurring_auto_add
  ON recurring_transactions(user_id, is_active, auto_add, next_date);

-- Add comment to new columns
COMMENT ON COLUMN recurring_transactions.last_auto_created_at IS 'Timestamp of the last automatic expense creation from this recurring transaction';
COMMENT ON COLUMN recurring_transactions.auto_create_days_before IS 'Number of days before the due date to auto-create the pending expense (0 = on due date)';
