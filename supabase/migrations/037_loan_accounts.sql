-- Migration: Add loan account type for tracking liabilities
-- Purpose: Allow users to create loan accounts (HELB, Bank Loans, Car Loans, etc.)
--          with negative balances that decrease when payments are made

-- Step 1: Drop existing account_type constraint and add 'loan' type
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_account_type_check;
ALTER TABLE accounts ADD CONSTRAINT accounts_account_type_check
  CHECK (account_type IN ('cash', 'investment', 'virtual', 'system', 'loan'));

-- Step 2: Update balance constraint to allow negative balances for loan accounts
-- Loan accounts store liability as negative values (e.g., -450,000 for a 450K loan)
-- Payments increase the balance toward 0
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS positive_balance;
ALTER TABLE accounts ADD CONSTRAINT positive_balance
  CHECK (current_balance >= 0 OR account_type IN ('cash', 'system', 'loan'));

-- Step 3: Add loan-specific columns (optional metadata)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS original_loan_amount DECIMAL(12, 2);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS loan_start_date DATE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS loan_end_date DATE;

-- Step 4: Create index for efficient loan account queries
CREATE INDEX IF NOT EXISTS idx_accounts_loan_type
  ON accounts(user_id, account_type)
  WHERE account_type = 'loan';

-- Add comment for documentation
COMMENT ON COLUMN accounts.original_loan_amount IS 'Original loan principal amount (positive value)';
COMMENT ON COLUMN accounts.loan_start_date IS 'Date when loan was taken';
COMMENT ON COLUMN accounts.loan_end_date IS 'Expected loan completion date';
