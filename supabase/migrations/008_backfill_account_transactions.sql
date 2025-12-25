-- Migration: Backfill existing income and expense data into account_transactions
-- Purpose: For existing users, create default accounts and populate transaction history
-- Run this ONCE after setting up accounts foundation

-- Step 1: Create default "Main Account" for users with existing income/expense data
-- Only create if user doesn't already have a primary cash account

INSERT INTO accounts (user_id, name, account_type, category, institution_name, current_balance, is_primary, notes)
SELECT DISTINCT
  i.user_id,
  'Main Account (Auto-Created)' as name,
  'cash' as account_type,
  'mpesa' as category,
  'M-Pesa' as institution_name,
  0 as current_balance, -- Will be updated by triggers
  true as is_primary,
  'Auto-created during data migration. This account represents your primary cash account for historical transactions.' as notes
FROM income i
WHERE NOT EXISTS (
  SELECT 1 FROM accounts a
  WHERE a.user_id = i.user_id
  AND a.is_primary = true
  AND a.account_type = 'cash'
)
UNION
SELECT DISTINCT
  e.user_id,
  'Main Account (Auto-Created)' as name,
  'cash' as account_type,
  'mpesa' as category,
  'M-Pesa' as institution_name,
  0 as current_balance,
  true as is_primary,
  'Auto-created during data migration. This account represents your primary cash account for historical transactions.' as notes
FROM expenses e
WHERE NOT EXISTS (
  SELECT 1 FROM accounts a
  WHERE a.user_id = e.user_id
  AND a.is_primary = true
  AND a.account_type = 'cash'
);

-- Step 2: Backfill income records into account_transactions
-- Income flows INTO the account, so we use to_account_id

INSERT INTO account_transactions (
  user_id,
  to_account_id,
  transaction_type,
  amount,
  date,
  category,
  description,
  reference_id,
  reference_type
)
SELECT
  i.user_id,
  a.id as to_account_id,
  'income' as transaction_type,
  i.amount,
  i.date,
  i.source as category,
  COALESCE(i.description, 'Income from ' || i.source) as description,
  i.id as reference_id,
  'income' as reference_type
FROM income i
INNER JOIN accounts a ON a.user_id = i.user_id AND a.is_primary = true AND a.account_type = 'cash'
WHERE NOT EXISTS (
  SELECT 1 FROM account_transactions at
  WHERE at.reference_id = i.id AND at.reference_type = 'income'
)
ORDER BY i.date ASC;

-- Step 3: Backfill expense records into account_transactions
-- Expenses flow OUT OF the account, so we use from_account_id

INSERT INTO account_transactions (
  user_id,
  from_account_id,
  transaction_type,
  amount,
  date,
  category,
  description,
  reference_id,
  reference_type
)
SELECT
  e.user_id,
  a.id as from_account_id,
  'expense' as transaction_type,
  e.amount,
  e.date,
  e.category,
  COALESCE(e.description, 'Expense for ' || e.category) as description,
  e.id as reference_id,
  'expense' as reference_type
FROM expenses e
INNER JOIN accounts a ON a.user_id = e.user_id AND a.is_primary = true AND a.account_type = 'cash'
WHERE NOT EXISTS (
  SELECT 1 FROM account_transactions at
  WHERE at.reference_id = e.id AND at.reference_type = 'expense'
)
ORDER BY e.date ASC;

-- Step 4: Recalculate account balances based on transaction history
-- The triggers should have already updated balances, but this ensures accuracy

UPDATE accounts a
SET current_balance = COALESCE((
  SELECT
    COALESCE(SUM(CASE WHEN at.to_account_id = a.id THEN at.amount ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN at.from_account_id = a.id THEN at.amount ELSE 0 END), 0)
  FROM account_transactions at
  WHERE at.to_account_id = a.id OR at.from_account_id = a.id
), 0)
WHERE a.user_id IN (
  SELECT DISTINCT user_id FROM account_transactions
);

-- Step 5: Create summary report for verification
-- This creates a temporary view to help users verify the migration

CREATE OR REPLACE VIEW migration_summary AS
SELECT
  a.user_id,
  a.name as account_name,
  a.account_type,
  a.current_balance,
  COUNT(at.id) as total_transactions,
  COUNT(CASE WHEN at.transaction_type = 'income' THEN 1 END) as income_count,
  COUNT(CASE WHEN at.transaction_type = 'expense' THEN 1 END) as expense_count,
  SUM(CASE WHEN at.to_account_id = a.id THEN at.amount ELSE 0 END) as total_income,
  SUM(CASE WHEN at.from_account_id = a.id THEN at.amount ELSE 0 END) as total_expenses,
  MIN(at.date) as earliest_transaction,
  MAX(at.date) as latest_transaction
FROM accounts a
LEFT JOIN account_transactions at ON (at.to_account_id = a.id OR at.from_account_id = a.id)
WHERE a.is_primary = true AND a.account_type = 'cash'
GROUP BY a.user_id, a.name, a.account_type, a.current_balance;

-- To view the summary after migration, run:
-- SELECT * FROM migration_summary;

-- Step 6: Add migration metadata to track completion
CREATE TABLE IF NOT EXISTS migration_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_name text NOT NULL,
  executed_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  records_affected integer,
  status text DEFAULT 'completed'
);

-- Enable RLS on migration_history (admin only)
ALTER TABLE migration_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Users can view their own migration history" ON migration_history;

-- Migration history is read-only for now (future: could add user-specific access)

-- Record this migration
INSERT INTO migration_history (migration_name, records_affected, status)
SELECT
  '008_backfill_account_transactions' as migration_name,
  (SELECT COUNT(*) FROM account_transactions WHERE reference_type IN ('income', 'expense')) as records_affected,
  'completed' as status;

-- Migration complete!
-- Users can now view their transaction history in the Accounts section
