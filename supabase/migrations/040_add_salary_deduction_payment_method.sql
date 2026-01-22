-- Migration: Add salary_deduction payment method to expenses table
-- Purpose: Allow payroll deductions to be recorded as expenses with payment_method = 'salary_deduction'

-- Drop the existing constraint
ALTER TABLE expenses
DROP CONSTRAINT IF EXISTS expenses_payment_method_check;

-- Add the updated constraint with salary_deduction
-- Payment methods used in the app: mpesa, cash, bank, card + salary_deduction
ALTER TABLE expenses
ADD CONSTRAINT expenses_payment_method_check
CHECK (payment_method IN (
  'cash',
  'mpesa',
  'bank',
  'card',
  'salary_deduction'  -- NEW: For payroll-deducted expenses (HELB, rent, insurance, etc.)
));

-- Add comment for documentation
COMMENT ON CONSTRAINT expenses_payment_method_check ON expenses IS
  'Allowed payment methods: cash, mpesa, bank, card, salary_deduction';
