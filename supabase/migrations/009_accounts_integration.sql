-- Migration: Integrate Accounts with Expenses, Income, Lending
-- Purpose: Add account selection to all financial transactions
-- Features: Transaction fees, custom deductions, bill reminders
-- Version: 009
-- Date: 2024-12-23

-- ============================================================================
-- PART 1: Alter Expenses Table (Add Account Integration & Transaction Fees)
-- ============================================================================

-- Add account tracking and fee columns to expenses
ALTER TABLE expenses
ADD COLUMN account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
ADD COLUMN transaction_fee DECIMAL(10, 2) DEFAULT 0 CHECK (transaction_fee >= 0),
ADD COLUMN fee_method VARCHAR(50), -- 'mpesa_send', 'mpesa_withdraw_agent', 'mpesa_withdraw_atm', 'bank_transfer', 'airtel_money'
ADD COLUMN fee_override BOOLEAN DEFAULT false; -- true if user manually entered fee

-- Create index for account-based expense queries
CREATE INDEX idx_expenses_account ON expenses(account_id);

-- Add comment for documentation
COMMENT ON COLUMN expenses.account_id IS 'Account from which expense was paid';
COMMENT ON COLUMN expenses.transaction_fee IS 'Transaction fee charged (M-Pesa, bank, etc.)';
COMMENT ON COLUMN expenses.fee_method IS 'Payment method used to calculate fee';
COMMENT ON COLUMN expenses.fee_override IS 'Whether user manually overrode auto-calculated fee';

-- ============================================================================
-- PART 2: Alter Income Table (Add Account Integration)
-- ============================================================================

-- Add account tracking to income
ALTER TABLE income
ADD COLUMN account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

-- Create index for account-based income queries
CREATE INDEX idx_income_account ON income(account_id);

-- Add comment for documentation
COMMENT ON COLUMN income.account_id IS 'Account where income was deposited';

-- ============================================================================
-- PART 3: Alter Lending Tracker (Add Account Integration)
-- ============================================================================

-- Add source and destination accounts for lending
ALTER TABLE lending_tracker
ADD COLUMN lend_from_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
ADD COLUMN repay_to_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

-- Create indexes for account-based lending queries
CREATE INDEX idx_lending_from_account ON lending_tracker(lend_from_account_id);
CREATE INDEX idx_lending_to_account ON lending_tracker(repay_to_account_id);

-- Add comments for documentation
COMMENT ON COLUMN lending_tracker.lend_from_account_id IS 'Account from which money was lent';
COMMENT ON COLUMN lending_tracker.repay_to_account_id IS 'Account where repayment was deposited';

-- ============================================================================
-- PART 4: Create Custom Deductions Table
-- ============================================================================

-- Table for user-defined income deductions beyond statutory (SACCO, loans, insurance, etc.)
CREATE TABLE custom_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  income_id UUID NOT NULL REFERENCES income(id) ON DELETE CASCADE,
  deduction_type VARCHAR(100) NOT NULL, -- 'sacco', 'personal_loan', 'insurance', 'retirement', 'other'
  deduction_name VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  is_recurring BOOLEAN DEFAULT false,
  frequency VARCHAR(20), -- 'monthly', 'weekly', 'one_time'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for efficient querying
CREATE INDEX idx_custom_deductions_user ON custom_deductions(user_id);
CREATE INDEX idx_custom_deductions_income ON custom_deductions(income_id);
CREATE INDEX idx_custom_deductions_type ON custom_deductions(deduction_type);

-- Enable Row Level Security
ALTER TABLE custom_deductions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own deductions
DROP POLICY IF EXISTS "Users can view their own custom deductions" ON custom_deductions;
CREATE POLICY "Users can view their own custom deductions"
  ON custom_deductions FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own deductions
DROP POLICY IF EXISTS "Users can insert their own custom deductions" ON custom_deductions;
CREATE POLICY "Users can insert their own custom deductions"
  ON custom_deductions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own deductions
DROP POLICY IF EXISTS "Users can update their own custom deductions" ON custom_deductions;
CREATE POLICY "Users can update their own custom deductions"
  ON custom_deductions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own deductions
DROP POLICY IF EXISTS "Users can delete their own custom deductions" ON custom_deductions;
CREATE POLICY "Users can delete their own custom deductions"
  ON custom_deductions FOR DELETE
  USING (auth.uid() = user_id);

-- Add table comment
COMMENT ON TABLE custom_deductions IS 'User-defined income deductions (SACCO, loans, insurance) beyond statutory deductions';

-- ============================================================================
-- PART 5: Enhance Recurring Transactions for Bill Reminders
-- ============================================================================

-- Add computed column for days until due (used for bill reminder queries)
-- Note: Using a function instead of generated column for better compatibility
ALTER TABLE recurring_transactions
ADD COLUMN days_until_due INTEGER;

-- Create function to calculate days until due
CREATE OR REPLACE FUNCTION calculate_days_until_due()
RETURNS TRIGGER AS $$
BEGIN
  NEW.days_until_due := EXTRACT(DAY FROM (NEW.next_date::timestamp - CURRENT_DATE::timestamp))::INTEGER;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update days_until_due on insert/update
DROP TRIGGER IF EXISTS update_days_until_due ON recurring_transactions;
CREATE TRIGGER update_days_until_due
  BEFORE INSERT OR UPDATE OF next_date
  ON recurring_transactions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_days_until_due();

-- Update existing records with days_until_due
UPDATE recurring_transactions
SET days_until_due = EXTRACT(DAY FROM (next_date::timestamp - CURRENT_DATE::timestamp))::INTEGER
WHERE next_date IS NOT NULL;

-- Create index for efficient bill reminder queries (upcoming bills within 7 days)
CREATE INDEX idx_recurring_upcoming ON recurring_transactions(user_id, days_until_due)
WHERE is_active = true AND days_until_due <= 7 AND days_until_due >= 0;

-- Add comment
COMMENT ON COLUMN recurring_transactions.days_until_due IS 'Computed: Days until next payment is due (for bill reminders)';

-- ============================================================================
-- PART 6: Update Account Transaction Types
-- ============================================================================

-- Add new transaction types for lending/repayment
-- Note: This is informational - the actual transaction_type is a VARCHAR field
-- Valid types now include: 'income', 'expense', 'transfer', 'investment_deposit',
-- 'investment_withdrawal', 'investment_return', 'lending', 'repayment', 'transaction_fee'

COMMENT ON COLUMN account_transactions.transaction_type IS 'Transaction type: income, expense, transfer, investment_deposit, investment_withdrawal, investment_return, lending, repayment, transaction_fee';

-- ============================================================================
-- PART 7: Create Helper Views
-- ============================================================================

-- View: Account balances with pending bills
CREATE OR REPLACE VIEW account_balances_with_pending_bills AS
SELECT
  a.id as account_id,
  a.user_id,
  a.name as account_name,
  a.current_balance,
  COALESCE(SUM(CASE WHEN rt.days_until_due <= 7 AND rt.days_until_due >= 0 THEN rt.amount ELSE 0 END), 0) as pending_bills_7days,
  COALESCE(SUM(CASE WHEN rt.days_until_due <= 3 AND rt.days_until_due >= 0 THEN rt.amount ELSE 0 END), 0) as pending_bills_3days,
  COALESCE(SUM(CASE WHEN rt.days_until_due = 0 THEN rt.amount ELSE 0 END), 0) as pending_bills_today,
  a.current_balance - COALESCE(SUM(CASE WHEN rt.days_until_due <= 7 AND rt.days_until_due >= 0 THEN rt.amount ELSE 0 END), 0) as projected_balance_7days
FROM accounts a
LEFT JOIN recurring_transactions rt ON rt.user_id = a.user_id AND rt.is_active = true AND rt.type = 'expense'
WHERE a.account_type IN ('cash', 'investment')
GROUP BY a.id, a.user_id, a.name, a.current_balance;

-- Add RLS to the view (inherits from accounts table)
ALTER VIEW account_balances_with_pending_bills SET (security_invoker = true);

-- ============================================================================
-- PART 8: Migration Metadata
-- ============================================================================

-- Record this migration in migration_history
INSERT INTO migration_history (migration_name, records_affected, status)
VALUES (
  '009_accounts_integration',
  0, -- No data changes yet, only schema changes
  'completed'
);

-- Migration complete!
-- Next step: Run 010_accounts_integration_migration.sql to backfill existing data

-- ============================================================================
-- VERIFICATION QUERIES (Run these after migration to verify)
-- ============================================================================

-- Check expenses table structure
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'expenses' AND column_name IN ('account_id', 'transaction_fee', 'fee_method', 'fee_override');

-- Check income table structure
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'income' AND column_name = 'account_id';

-- Check lending_tracker structure
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'lending_tracker' AND column_name IN ('lend_from_account_id', 'repay_to_account_id');

-- Check custom_deductions table
-- SELECT * FROM custom_deductions LIMIT 1;

-- Check recurring_transactions days_until_due
-- SELECT name, next_date, days_until_due FROM recurring_transactions WHERE is_active = true ORDER BY days_until_due ASC LIMIT 10;

-- Check account balances view
-- SELECT * FROM account_balances_with_pending_bills;
