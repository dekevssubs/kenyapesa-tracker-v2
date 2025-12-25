-- Migration: Backfill existing expenses, income, and lending with primary account
-- Purpose: Link existing records to user's primary account
-- Run this AFTER migration 009_accounts_integration.sql
-- Version: 010
-- Date: 2024-12-23

-- ============================================================================
-- PART 1: Backfill Expenses with Primary Account
-- ============================================================================

-- Update all expenses that don't have an account_id assigned
-- Link them to the user's primary cash account

UPDATE expenses e
SET account_id = (
  SELECT a.id
  FROM accounts a
  WHERE a.user_id = e.user_id
    AND a.is_primary = true
    AND a.account_type = 'cash'
  LIMIT 1
)
WHERE e.account_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM accounts a
    WHERE a.user_id = e.user_id
      AND a.is_primary = true
      AND a.account_type = 'cash'
  );

-- ============================================================================
-- PART 2: Backfill Income with Primary Account
-- ============================================================================

-- Update all income records that don't have an account_id assigned
-- Link them to the user's primary cash account

UPDATE income i
SET account_id = (
  SELECT a.id
  FROM accounts a
  WHERE a.user_id = i.user_id
    AND a.is_primary = true
    AND a.account_type = 'cash'
  LIMIT 1
)
WHERE i.account_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM accounts a
    WHERE a.user_id = i.user_id
      AND a.is_primary = true
      AND a.account_type = 'cash'
  );

-- ============================================================================
-- PART 3: Backfill Lending Tracker with Primary Account
-- ============================================================================

-- Update lending records - set lend_from_account_id to primary account
-- Only update records where lend_from_account_id is NULL

UPDATE lending_tracker lt
SET lend_from_account_id = (
  SELECT a.id
  FROM accounts a
  WHERE a.user_id = lt.user_id
    AND a.is_primary = true
    AND a.account_type = 'cash'
  LIMIT 1
)
WHERE lt.lend_from_account_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM accounts a
    WHERE a.user_id = lt.user_id
      AND a.is_primary = true
      AND a.account_type = 'cash'
  );

-- Update repay_to_account_id for lending records with repayments
-- Set to primary account if not already set
-- Only for records where amount_repaid > 0

UPDATE lending_tracker lt
SET repay_to_account_id = (
  SELECT a.id
  FROM accounts a
  WHERE a.user_id = lt.user_id
    AND a.is_primary = true
    AND a.account_type = 'cash'
  LIMIT 1
)
WHERE lt.repay_to_account_id IS NULL
  AND lt.amount_repaid > 0
  AND EXISTS (
    SELECT 1
    FROM accounts a
    WHERE a.user_id = lt.user_id
      AND a.is_primary = true
      AND a.account_type = 'cash'
  );

-- ============================================================================
-- PART 4: Update Account Transactions for Expenses (Add Fee Breakdown)
-- ============================================================================

-- For expenses that now have account_id but their account_transactions
-- don't have the fee split, we'll leave them as-is since they were created
-- by the 008 migration. New expenses will use the enhanced structure.

-- No action needed here - backward compatible

-- ============================================================================
-- PART 5: Verify Migration Results
-- ============================================================================

-- Create a temporary view to verify the migration results
CREATE OR REPLACE VIEW migration_010_verification AS
SELECT
  'Expenses' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN account_id IS NOT NULL THEN 1 END) as records_with_account,
  COUNT(CASE WHEN account_id IS NULL THEN 1 END) as records_without_account
FROM expenses
WHERE user_id IN (
  SELECT DISTINCT user_id FROM accounts WHERE is_primary = true
)
UNION ALL
SELECT
  'Income' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN account_id IS NOT NULL THEN 1 END) as records_with_account,
  COUNT(CASE WHEN account_id IS NULL THEN 1 END) as records_without_account
FROM income
WHERE user_id IN (
  SELECT DISTINCT user_id FROM accounts WHERE is_primary = true
)
UNION ALL
SELECT
  'Lending Tracker' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN lend_from_account_id IS NOT NULL THEN 1 END) as records_with_account,
  COUNT(CASE WHEN lend_from_account_id IS NULL THEN 1 END) as records_without_account
FROM lending_tracker
WHERE user_id IN (
  SELECT DISTINCT user_id FROM accounts WHERE is_primary = true
);

-- ============================================================================
-- PART 6: Migration History Record
-- ============================================================================

-- Record this migration
INSERT INTO migration_history (migration_name, records_affected, status)
SELECT
  '010_accounts_integration_migration' as migration_name,
  (
    SELECT
      (SELECT COUNT(*) FROM expenses WHERE account_id IS NOT NULL) +
      (SELECT COUNT(*) FROM income WHERE account_id IS NOT NULL) +
      (SELECT COUNT(*) FROM lending_tracker WHERE lend_from_account_id IS NOT NULL)
  ) as records_affected,
  'completed' as status;

-- ============================================================================
-- VERIFICATION QUERIES (Run these after migration)
-- ============================================================================

-- View migration results
-- SELECT * FROM migration_010_verification;

-- Check expenses with accounts
-- SELECT COUNT(*) as total_expenses, COUNT(account_id) as with_account FROM expenses;

-- Check income with accounts
-- SELECT COUNT(*) as total_income, COUNT(account_id) as with_account FROM income;

-- Check lending with accounts
-- SELECT
--   COUNT(*) as total_lending,
--   COUNT(lend_from_account_id) as with_lend_account,
--   COUNT(repay_to_account_id) as with_repay_account
-- FROM lending_tracker;

-- Sample check: View expense with account details
-- SELECT
--   e.id,
--   e.amount,
--   e.category,
--   e.date,
--   a.name as account_name,
--   a.current_balance
-- FROM expenses e
-- LEFT JOIN accounts a ON a.id = e.account_id
-- LIMIT 10;

-- ============================================================================
-- ROLLBACK (If needed)
-- ============================================================================

-- To rollback this migration:
-- UPDATE expenses SET account_id = NULL WHERE account_id IS NOT NULL;
-- UPDATE income SET account_id = NULL WHERE account_id IS NOT NULL;
-- UPDATE lending_tracker SET lend_from_account_id = NULL, repay_to_account_id = NULL WHERE lend_from_account_id IS NOT NULL;
-- DELETE FROM migration_history WHERE migration_name = '010_accounts_integration_migration';
-- DROP VIEW IF EXISTS migration_010_verification;

-- ============================================================================
-- NOTES
-- ============================================================================

-- 1. This migration is idempotent - safe to run multiple times
-- 2. Only updates records where account_id/account fields are NULL
-- 3. Only updates records for users who have a primary cash account
-- 4. Records without a primary account will remain NULL (user can assign manually)
-- 5. Future records will have accounts assigned via the service layer
-- 6. Existing account_transactions from migration 008 remain unchanged

COMMENT ON VIEW migration_010_verification IS 'Verification view for migration 010 - shows backfill results';

-- Migration complete!
