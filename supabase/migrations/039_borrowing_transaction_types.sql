-- Migration: Add transaction types for borrowing (loans received)
-- Purpose: Support loan_received and loan_repayment transaction types
--          for tracking borrowed money flows

-- Drop the existing constraint
ALTER TABLE account_transactions
DROP CONSTRAINT IF EXISTS account_transactions_transaction_type_check;

-- Add the updated constraint with borrowing transaction types
ALTER TABLE account_transactions
ADD CONSTRAINT account_transactions_transaction_type_check
CHECK (transaction_type IN (
  'income',                 -- Income deposits to accounts
  'expense',                -- Expenses from accounts
  'transfer',               -- Account-to-account transfers
  'investment_deposit',     -- Deposits into investment accounts
  'investment_withdrawal',  -- Withdrawals from investment accounts
  'investment_return',      -- Investment returns (interest, dividends, etc.)
  'lending',                -- Money lent to others (flows OUT)
  'repayment',              -- Loan repayments received (flows IN)
  'transaction_fee',        -- M-Pesa and other transaction fees
  'reversal',               -- Income/Expense reversals (immutability pattern)
  'bad_debt',               -- Debt forgiveness / write-offs
  'loan_received',          -- Borrowed loan received (flows IN) - NEW
  'loan_repayment'          -- Borrowed loan repayment (flows OUT) - NEW
));

-- Add comment for documentation
COMMENT ON CONSTRAINT account_transactions_transaction_type_check ON account_transactions IS
  'Allowed transaction types: income, expense, transfer, investment_*, lending, repayment, transaction_fee, reversal, bad_debt, loan_received, loan_repayment';
