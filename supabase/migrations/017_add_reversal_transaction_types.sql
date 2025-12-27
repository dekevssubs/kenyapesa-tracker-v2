-- Migration: Add 'reversal' transaction type to account_transactions
-- Supports the immutability pattern where expenses/income are reversed, not deleted
-- Per spec: transaction_type is 'reversal', reference_type indicates what's being reversed
-- Date: 2025-12-27

-- Drop the existing constraint
ALTER TABLE account_transactions
DROP CONSTRAINT IF EXISTS account_transactions_transaction_type_check;

-- Add the updated constraint with generic 'reversal' type
-- The reference_type field indicates what is being reversed (expense_reversal, income_reversal, etc.)
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
  'transaction_fee',
  'reversal'
));
