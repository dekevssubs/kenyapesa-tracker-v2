-- Goals Enhancement Migration
-- Adds account integration, contribution tracking, and status management

-- 1. Alter goals table
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS linked_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'paused')),
ADD COLUMN IF NOT EXISTS abandoned_date DATE,
ADD COLUMN IF NOT EXISTS abandonment_reason TEXT,
ADD COLUMN IF NOT EXISTS completion_date DATE;

CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_goals_linked_account ON goals(linked_account_id);

COMMENT ON COLUMN goals.linked_account_id IS 'Account where goal funds are saved';
COMMENT ON COLUMN goals.status IS 'Goal status: active, completed, abandoned, paused';
COMMENT ON COLUMN goals.abandoned_date IS 'Date when goal was abandoned';
COMMENT ON COLUMN goals.abandonment_reason IS 'Reason for abandoning the goal';
COMMENT ON COLUMN goals.completion_date IS 'Date when goal was completed';

-- 1a. Backfill existing goals with linked accounts
-- Link goals to user's primary savings or investment account (or cash if no savings)
UPDATE goals g
SET linked_account_id = (
  SELECT a.id
  FROM accounts a
  WHERE a.user_id = g.user_id
    AND a.account_type IN ('savings', 'investment')
  ORDER BY
    CASE WHEN a.is_primary THEN 0 ELSE 1 END,
    a.created_at
  LIMIT 1
)
WHERE g.linked_account_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM accounts a
    WHERE a.user_id = g.user_id
      AND a.account_type IN ('savings', 'investment')
  );

-- Fallback: If no savings/investment account, use primary cash account
UPDATE goals g
SET linked_account_id = (
  SELECT a.id
  FROM accounts a
  WHERE a.user_id = g.user_id
    AND a.is_primary = true
  LIMIT 1
)
WHERE g.linked_account_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM accounts a
    WHERE a.user_id = g.user_id
      AND a.is_primary = true
  );

-- 2. Create goal_contributions table
CREATE TABLE IF NOT EXISTS goal_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  from_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  contribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  transaction_type VARCHAR(20) DEFAULT 'contribution' CHECK (transaction_type IN ('contribution', 'withdrawal', 'refund')),
  account_transaction_id UUID REFERENCES account_transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goal_contributions_user ON goal_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_goal ON goal_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_account ON goal_contributions(from_account_id);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_date ON goal_contributions(contribution_date);

COMMENT ON TABLE goal_contributions IS 'Tracks all contributions to and withdrawals from goals';
COMMENT ON COLUMN goal_contributions.transaction_type IS 'Type: contribution (add funds), withdrawal (remove funds), refund (return on abandonment)';
COMMENT ON COLUMN goal_contributions.account_transaction_id IS 'Linked account transaction for fund transfers';

-- 3. Enable RLS on goal_contributions
ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own contributions
CREATE POLICY goal_contributions_user_policy ON goal_contributions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. Create function to auto-update goal progress
CREATE OR REPLACE FUNCTION update_goal_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total contributions for the goal
  UPDATE goals
  SET current_amount = (
    SELECT COALESCE(SUM(
      CASE
        WHEN transaction_type = 'contribution' THEN amount
        WHEN transaction_type = 'withdrawal' THEN -amount
        WHEN transaction_type = 'refund' THEN -amount
        ELSE 0
      END
    ), 0)
    FROM goal_contributions
    WHERE goal_id = NEW.goal_id
  ),
  updated_at = NOW()
  WHERE id = NEW.goal_id;

  -- Auto-complete goal if target reached
  UPDATE goals
  SET status = 'completed',
      completion_date = CURRENT_DATE
  WHERE id = NEW.goal_id
    AND status = 'active'
    AND current_amount >= target_amount;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update goal progress on contribution changes
DROP TRIGGER IF EXISTS trigger_update_goal_progress ON goal_contributions;
CREATE TRIGGER trigger_update_goal_progress
  AFTER INSERT OR UPDATE OR DELETE ON goal_contributions
  FOR EACH ROW
  EXECUTE FUNCTION update_goal_progress();

-- 5. Create function to handle goal contribution with account transfer
CREATE OR REPLACE FUNCTION process_goal_contribution(
  p_user_id UUID,
  p_goal_id UUID,
  p_from_account_id UUID,
  p_to_account_id UUID,
  p_amount DECIMAL,
  p_contribution_date DATE,
  p_notes TEXT
)
RETURNS JSON AS $$
DECLARE
  v_contribution_id UUID;
  v_account_tx_id UUID;
  v_goal_name TEXT;
  v_result JSON;
BEGIN
  -- Get goal name
  SELECT name INTO v_goal_name FROM goals WHERE id = p_goal_id;

  -- Create account transaction (transfer from source to goal account)
  INSERT INTO account_transactions (
    user_id,
    from_account_id,
    to_account_id,
    transaction_type,
    amount,
    date,
    category,
    description,
    reference_type,
    reference_id
  ) VALUES (
    p_user_id,
    p_from_account_id,
    p_to_account_id,
    'transfer',
    p_amount,
    p_contribution_date,
    'goal_contribution',
    'Contribution to goal: ' || v_goal_name,
    'goal',
    p_goal_id
  )
  RETURNING id INTO v_account_tx_id;

  -- Create goal contribution record
  INSERT INTO goal_contributions (
    user_id,
    goal_id,
    from_account_id,
    amount,
    contribution_date,
    notes,
    transaction_type,
    account_transaction_id
  ) VALUES (
    p_user_id,
    p_goal_id,
    p_from_account_id,
    p_amount,
    p_contribution_date,
    p_notes,
    'contribution',
    v_account_tx_id
  )
  RETURNING id INTO v_contribution_id;

  -- Prepare result
  v_result := json_build_object(
    'success', true,
    'contribution_id', v_contribution_id,
    'account_transaction_id', v_account_tx_id
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to handle goal abandonment
CREATE OR REPLACE FUNCTION abandon_goal(
  p_user_id UUID,
  p_goal_id UUID,
  p_abandonment_reason TEXT,
  p_refund_to_account_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_current_amount DECIMAL;
  v_goal_account_id UUID;
  v_account_tx_id UUID;
  v_contribution_id UUID;
  v_result JSON;
BEGIN
  -- Get current goal details
  SELECT current_amount, linked_account_id
  INTO v_current_amount, v_goal_account_id
  FROM goals
  WHERE id = p_goal_id AND user_id = p_user_id;

  -- Update goal status
  UPDATE goals
  SET status = 'abandoned',
      abandoned_date = CURRENT_DATE,
      abandonment_reason = p_abandonment_reason,
      updated_at = NOW()
  WHERE id = p_goal_id AND user_id = p_user_id;

  -- If there are funds and refund account specified, create refund transaction
  IF v_current_amount > 0 AND p_refund_to_account_id IS NOT NULL AND v_goal_account_id IS NOT NULL THEN
    -- Create account transaction (transfer from goal account back to refund account)
    INSERT INTO account_transactions (
      user_id,
      from_account_id,
      to_account_id,
      transaction_type,
      amount,
      date,
      category,
      description,
      reference_type,
      reference_id
    ) VALUES (
      p_user_id,
      v_goal_account_id,
      p_refund_to_account_id,
      'transfer',
      v_current_amount,
      CURRENT_DATE,
      'goal_refund',
      'Refund from abandoned goal',
      'goal',
      p_goal_id
    )
    RETURNING id INTO v_account_tx_id;

    -- Create refund contribution record
    INSERT INTO goal_contributions (
      user_id,
      goal_id,
      from_account_id,
      amount,
      contribution_date,
      notes,
      transaction_type,
      account_transaction_id
    ) VALUES (
      p_user_id,
      p_goal_id,
      p_refund_to_account_id,
      v_current_amount,
      CURRENT_DATE,
      'Refund on goal abandonment: ' || p_abandonment_reason,
      'refund',
      v_account_tx_id
    )
    RETURNING id INTO v_contribution_id;
  END IF;

  v_result := json_build_object(
    'success', true,
    'refunded_amount', COALESCE(v_current_amount, 0),
    'account_transaction_id', v_account_tx_id,
    'contribution_id', v_contribution_id
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Add comments
COMMENT ON FUNCTION process_goal_contribution IS 'Handles goal contribution with automatic account transfers';
COMMENT ON FUNCTION abandon_goal IS 'Abandons a goal and optionally refunds accumulated funds to specified account';
COMMENT ON FUNCTION update_goal_progress IS 'Automatically updates goal progress and completion status';

-- 8. Grant necessary permissions
GRANT EXECUTE ON FUNCTION process_goal_contribution TO authenticated;
GRANT EXECUTE ON FUNCTION abandon_goal TO authenticated;
