-- Migration: Add 'transaction_fee' to allowed transaction types
-- Issue: expenseService.js creates separate transaction for fees but constraint didn't allow it
-- Date: 2024

-- Drop the existing constraint
ALTER TABLE account_transactions
DROP CONSTRAINT IF EXISTS account_transactions_transaction_type_check;

-- Add the updated constraint with 'transaction_fee' included
ALTER TABLE account_transactions
ADD CONSTRAINT account_transactions_transaction_type_check
CHECK (transaction_type IN (
  'income',
  'expense',
  'transfer',
  'investment_deposit',
  'investment_withdrawal',
  'investment_return',
  'lending',
  'repayment',
  'transaction_fee'
));
