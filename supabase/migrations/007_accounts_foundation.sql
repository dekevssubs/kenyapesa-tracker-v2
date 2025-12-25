-- ============================================================================
-- MIGRATION 007: Accounts Foundation
-- ============================================================================
-- Creates the core accounts system for tracking cash and investment accounts
-- Enables money flow tracking from income through to investments
-- ============================================================================

-- ============================================================================
-- 1. ACCOUNTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic Information
  name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('cash', 'investment', 'virtual')),
  category VARCHAR(50) NOT NULL,
  institution_name VARCHAR(255),
  account_number VARCHAR(100),

  -- Financial Data
  current_balance DECIMAL(12, 2) DEFAULT 0 NOT NULL,
  interest_rate DECIMAL(5, 2), -- For investments (annual %)
  currency VARCHAR(3) DEFAULT 'KES' NOT NULL,

  -- Configuration
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  notes TEXT,
  icon VARCHAR(50), -- For UI customization
  color VARCHAR(7), -- Hex color for UI

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT positive_balance CHECK (current_balance >= 0 OR account_type = 'cash')
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_primary ON accounts(user_id, is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_accounts_active ON accounts(user_id, is_active) WHERE is_active = true;

-- ============================================================================
-- 2. ACCOUNT TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS account_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Transaction Flow
  from_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  to_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,

  -- Transaction Details
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN (
    'income', 'expense', 'transfer',
    'investment_deposit', 'investment_withdrawal',
    'investment_return', 'lending', 'repayment',
    'transaction_fee'
  )),
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),

  -- Categorization
  category VARCHAR(50),
  description TEXT,

  -- Reference Links (to existing tables)
  reference_id UUID,
  reference_type VARCHAR(50), -- 'income', 'expense', 'goal', 'lending', etc.

  -- Transaction Date
  date DATE NOT NULL,

  -- Metadata
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT at_least_one_account CHECK (
    from_account_id IS NOT NULL OR to_account_id IS NOT NULL
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_account_txn_user_id ON account_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_account_txn_from ON account_transactions(from_account_id);
CREATE INDEX IF NOT EXISTS idx_account_txn_to ON account_transactions(to_account_id);
CREATE INDEX IF NOT EXISTS idx_account_txn_type ON account_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_account_txn_date ON account_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_account_txn_reference ON account_transactions(reference_id, reference_type);

-- ============================================================================
-- 3. INVESTMENT RETURNS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS investment_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Return Details
  return_type VARCHAR(50) NOT NULL CHECK (return_type IN (
    'interest', 'dividend', 'capital_gain', 'capital_loss', 'bonus'
  )),
  amount DECIMAL(12, 2) NOT NULL,
  rate DECIMAL(5, 2), -- Percentage rate if applicable

  -- Period Information
  period_start DATE,
  period_end DATE,
  date DATE NOT NULL,

  -- Metadata
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Link to transaction
  transaction_id UUID REFERENCES account_transactions(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_investment_returns_user_id ON investment_returns(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_returns_account_id ON investment_returns(account_id);
CREATE INDEX IF NOT EXISTS idx_investment_returns_date ON investment_returns(date DESC);
CREATE INDEX IF NOT EXISTS idx_investment_returns_type ON investment_returns(return_type);

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_returns ENABLE ROW LEVEL SECURITY;

-- Accounts Policies
DROP POLICY IF EXISTS "Users can view their own accounts" ON accounts;
CREATE POLICY "Users can view their own accounts"
  ON accounts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own accounts" ON accounts;
CREATE POLICY "Users can insert their own accounts"
  ON accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own accounts" ON accounts;
CREATE POLICY "Users can update their own accounts"
  ON accounts FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own accounts" ON accounts;
CREATE POLICY "Users can delete their own accounts"
  ON accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Account Transactions Policies
DROP POLICY IF EXISTS "Users can view their own transactions" ON account_transactions;
CREATE POLICY "Users can view their own transactions"
  ON account_transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own transactions" ON account_transactions;
CREATE POLICY "Users can insert their own transactions"
  ON account_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own transactions" ON account_transactions;
CREATE POLICY "Users can update their own transactions"
  ON account_transactions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own transactions" ON account_transactions;
CREATE POLICY "Users can delete their own transactions"
  ON account_transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Investment Returns Policies
DROP POLICY IF EXISTS "Users can view their own investment returns" ON investment_returns;
CREATE POLICY "Users can view their own investment returns"
  ON investment_returns FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own investment returns" ON investment_returns;
CREATE POLICY "Users can insert their own investment returns"
  ON investment_returns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own investment returns" ON investment_returns;
CREATE POLICY "Users can update their own investment returns"
  ON investment_returns FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own investment returns" ON investment_returns;
CREATE POLICY "Users can delete their own investment returns"
  ON investment_returns FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 5. TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Accounts updated_at trigger
CREATE OR REPLACE FUNCTION update_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_accounts_updated_at ON accounts;
CREATE TRIGGER set_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_accounts_updated_at();

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to ensure only one primary account per user
CREATE OR REPLACE FUNCTION ensure_single_primary_account()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    -- Unset any existing primary account for this user
    UPDATE accounts
    SET is_primary = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_primary_account ON accounts;
CREATE TRIGGER ensure_primary_account
  BEFORE INSERT OR UPDATE ON accounts
  FOR EACH ROW
  WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION ensure_single_primary_account();

-- Function to update account balance on transaction
CREATE OR REPLACE FUNCTION update_account_balance_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Deduct from source account
  IF NEW.from_account_id IS NOT NULL THEN
    UPDATE accounts
    SET current_balance = current_balance - NEW.amount
    WHERE id = NEW.from_account_id;
  END IF;

  -- Add to destination account
  IF NEW.to_account_id IS NOT NULL THEN
    UPDATE accounts
    SET current_balance = current_balance + NEW.amount
    WHERE id = NEW.to_account_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_balance_on_transaction ON account_transactions;
CREATE TRIGGER update_balance_on_transaction
  AFTER INSERT ON account_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance_on_transaction();

-- Function to handle investment returns
CREATE OR REPLACE FUNCTION process_investment_return()
RETURNS TRIGGER AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  -- Create a transaction record for the return
  INSERT INTO account_transactions (
    user_id,
    to_account_id,
    transaction_type,
    amount,
    category,
    description,
    date
  ) VALUES (
    NEW.user_id,
    NEW.account_id,
    'investment_return',
    NEW.amount,
    NEW.return_type,
    COALESCE(NEW.notes, NEW.return_type || ' return'),
    NEW.date
  ) RETURNING id INTO v_transaction_id;

  -- Link the transaction to the investment return
  NEW.transaction_id = v_transaction_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS process_return ON investment_returns;
CREATE TRIGGER process_return
  BEFORE INSERT ON investment_returns
  FOR EACH ROW
  EXECUTE FUNCTION process_investment_return();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Create AccountService utility (accountService.js)
-- 2. Build Accounts UI page (Accounts.jsx)
-- 3. Migrate existing income/expense data to account transactions
-- ============================================================================
