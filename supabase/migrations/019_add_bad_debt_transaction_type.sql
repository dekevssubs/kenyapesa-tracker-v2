-- Migration: Comprehensive transaction_type constraint update
-- Consolidates all transaction types used in the application
-- Replaces migrations 017 and 018 transaction type updates
-- Date: 2025-12-28

-- Drop the existing constraint
ALTER TABLE account_transactions
DROP CONSTRAINT IF EXISTS account_transactions_transaction_type_check;

-- Add the comprehensive constraint with ALL transaction types used in the app
-- Based on code analysis: incomeService, expenseService, lendingService, accountService, goalService
ALTER TABLE account_transactions
ADD CONSTRAINT account_transactions_transaction_type_check
CHECK (transaction_type IN (
  'income',                 -- Income deposits to accounts
  'expense',                -- Expenses from accounts
  'transfer',               -- Account-to-account transfers
  'investment_deposit',     -- Deposits into investment accounts
  'investment_withdrawal',  -- Withdrawals from investment accounts
  'investment_return',      -- Investment returns (interest, dividends, etc.)
  'lending',                -- Money lent to others
  'repayment',              -- Loan repayments received
  'transaction_fee',        -- M-Pesa and other transaction fees
  'reversal',               -- Income/Expense reversals (immutability pattern)
  'bad_debt'                -- Debt forgiveness / write-offs
));

-- Add comment for documentation
COMMENT ON CONSTRAINT account_transactions_transaction_type_check ON account_transactions IS
  'Allowed transaction types: income, expense, transfer, investment_*, lending, repayment, transaction_fee, reversal, bad_debt';
