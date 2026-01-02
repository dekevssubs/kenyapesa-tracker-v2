-- ============================================================================
-- Migration 020: Bad Debt Write-Off Account System
-- ============================================================================
-- Description: Enables proper accounting for debt forgiveness using ledger-first principles
--
-- Canonical Principle:
--   Bad debt is NOT a no-account transaction
--   It's a reclassification: money existed → now acknowledged as lost
--   Loss must live somewhere (write-off account) to preserve ledger invariants
--
-- Architecture:
--   from_account_id = lender_account (balance decreases)
--   to_account_id   = bad_debt_write_off_account (tracks total losses)
--   transaction_type = 'bad_debt'
--
-- This preserves:
--   ✅ Ledger invariant: Every transaction touches at least one account
--   ✅ Balance integrity: Net worth decreases correctly
--   ✅ Audit trail: Losses are tracked and reportable
-- ============================================================================

-- 1. Update account_type constraint to include 'system'
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_account_type_check;
ALTER TABLE accounts ADD CONSTRAINT accounts_account_type_check
  CHECK (account_type IN ('cash', 'investment', 'virtual', 'system'));

-- 2. Update positive_balance constraint to allow system accounts to be negative
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS positive_balance;
ALTER TABLE accounts ADD CONSTRAINT positive_balance
  CHECK (current_balance >= 0 OR account_type IN ('cash', 'system'));

-- 3. Add is_system_account flag for easy identification
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_system_account BOOLEAN DEFAULT false;

-- 4. Create index for system accounts
CREATE INDEX IF NOT EXISTS idx_accounts_system ON accounts(user_id, is_system_account)
  WHERE is_system_account = true;

-- 5. Add comments for documentation
COMMENT ON COLUMN accounts.is_system_account IS
  'True for system-managed accounts like Bad Debt Write-Off that track non-recoverable losses';

COMMENT ON CONSTRAINT positive_balance ON accounts IS
  'Allows negative balances for cash and system accounts. System accounts track cumulative losses.';

-- ============================================================================
-- Helper Function: Get or Create Bad Debt Write-Off Account
-- ============================================================================
-- This function will be called from application code when forgiving a debt
-- It ensures each user has exactly one write-off account
-- ============================================================================

CREATE OR REPLACE FUNCTION get_or_create_bad_debt_account(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_account_id UUID;
BEGIN
  -- Try to find existing bad debt account
  SELECT id INTO v_account_id
  FROM accounts
  WHERE user_id = p_user_id
    AND is_system_account = true
    AND name = 'Bad Debt Write-Off'
  LIMIT 1;

  -- If not found, create it
  IF v_account_id IS NULL THEN
    INSERT INTO accounts (
      user_id,
      name,
      account_type,
      category,
      current_balance,
      is_system_account,
      is_active,
      notes,
      icon,
      color
    ) VALUES (
      p_user_id,
      'Bad Debt Write-Off',
      'system',
      'Loss Tracking',
      0,
      true,
      true,
      'System account that tracks all forgiven debts and non-recoverable losses. Negative balance indicates cumulative losses.',
      'AlertTriangle',
      '#EF4444'  -- Red color to indicate losses
    ) RETURNING id INTO v_account_id;
  END IF;

  RETURN v_account_id;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION get_or_create_bad_debt_account IS
  'Returns the Bad Debt Write-Off account for a user, creating it if it doesn''t exist. Used when forgiving debts to maintain ledger integrity.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Update lendingService.forgiveLending() to use get_or_create_bad_debt_account()
-- 2. Create transaction with from_account = lender, to_account = write_off
-- 3. Verify ledger balances remain consistent
-- ============================================================================
