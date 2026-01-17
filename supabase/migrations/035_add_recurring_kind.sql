-- Migration: Add kind column to recurring_transactions
-- Description: Distinguish between bills (required obligations) and subscriptions (optional services)
-- This enables the unified reminders system to display appropriate badges and actions

-- Add kind column with default 'subscription'
ALTER TABLE recurring_transactions
  ADD COLUMN IF NOT EXISTS kind VARCHAR(20) NOT NULL DEFAULT 'subscription';

-- Add check constraint for valid values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recurring_transactions_kind_check'
  ) THEN
    ALTER TABLE recurring_transactions
      ADD CONSTRAINT recurring_transactions_kind_check
      CHECK (kind IN ('bill', 'subscription'));
  END IF;
END $$;

-- Create index for filtering by kind
CREATE INDEX IF NOT EXISTS idx_recurring_kind ON recurring_transactions(user_id, kind, is_active);

-- Backfill existing data based on category heuristics
-- Bills: rent, utilities, debt payments, insurance, loans, essential services
-- Subscriptions: entertainment, streaming, apps, optional services
UPDATE recurring_transactions
SET kind = CASE
  -- Housing & Essential Bills
  WHEN LOWER(category) IN ('rent', 'mortgage', 'housing') THEN 'bill'
  -- Utilities
  WHEN LOWER(category) IN ('utilities', 'electricity', 'water', 'gas', 'internet', 'wifi', 'power') THEN 'bill'
  -- Debt & Loans
  WHEN LOWER(category) IN ('debt', 'loan', 'loans', 'credit', 'credit-card', 'debt-payment') THEN 'bill'
  -- Insurance
  WHEN LOWER(category) IN ('insurance', 'health-insurance', 'car-insurance', 'life-insurance', 'nhif') THEN 'bill'
  -- Education (often required)
  WHEN LOWER(category) IN ('education', 'school', 'tuition', 'school-fees') THEN 'bill'
  -- Phone bills (required)
  WHEN LOWER(category) IN ('phone', 'mobile', 'airtime', 'phone-bill') THEN 'bill'
  -- Everything else defaults to subscription
  ELSE 'subscription'
END
WHERE kind = 'subscription'; -- Only update those with default value to avoid re-running issues

-- Add column comment
COMMENT ON COLUMN recurring_transactions.kind IS 'Type of recurring item: bill (required obligation like rent, utilities) or subscription (optional service like Netflix, Spotify)';
