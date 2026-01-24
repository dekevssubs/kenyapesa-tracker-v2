-- Migration: Fix Remaining Function Search Path Warnings
-- Purpose: Fix the 4 functions that were missed due to incorrect signatures

-- =====================================================
-- 1. calculate_days_until_due (trigger function - no params)
-- =====================================================
DROP FUNCTION IF EXISTS public.calculate_days_until_due() CASCADE;

CREATE OR REPLACE FUNCTION public.calculate_days_until_due()
RETURNS TRIGGER AS $$
BEGIN
  NEW.days_until_due := EXTRACT(DAY FROM (NEW.next_date::timestamp - CURRENT_DATE::timestamp))::INTEGER;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- Recreate trigger
DROP TRIGGER IF EXISTS update_days_until_due ON public.recurring_transactions;
CREATE TRIGGER update_days_until_due
  BEFORE INSERT OR UPDATE OF next_date
  ON public.recurring_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_days_until_due();

-- =====================================================
-- 2. process_investment_return (trigger function - no params)
-- =====================================================
DROP FUNCTION IF EXISTS public.process_investment_return() CASCADE;

CREATE OR REPLACE FUNCTION public.process_investment_return()
RETURNS TRIGGER AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  -- Create a transaction record for the return
  INSERT INTO public.account_transactions (
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
$$ LANGUAGE plpgsql
SET search_path = '';

-- Recreate trigger
DROP TRIGGER IF EXISTS process_return ON public.investment_returns;
CREATE TRIGGER process_return
  BEFORE INSERT ON public.investment_returns
  FOR EACH ROW
  EXECUTE FUNCTION public.process_investment_return();

-- =====================================================
-- 3. process_goal_contribution (7 parameters)
-- =====================================================
DROP FUNCTION IF EXISTS public.process_goal_contribution(UUID, UUID, UUID, UUID, DECIMAL, DATE, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.process_goal_contribution(
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
  SELECT name INTO v_goal_name FROM public.goals WHERE id = p_goal_id;

  -- Create account transaction (transfer from source to goal account)
  INSERT INTO public.account_transactions (
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
  INSERT INTO public.goal_contributions (
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- =====================================================
-- 4. abandon_goal (4 parameters)
-- =====================================================
DROP FUNCTION IF EXISTS public.abandon_goal(UUID, UUID, TEXT, UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.abandon_goal(
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
  FROM public.goals
  WHERE id = p_goal_id AND user_id = p_user_id;

  -- Update goal status
  UPDATE public.goals
  SET status = 'abandoned',
      abandoned_date = CURRENT_DATE,
      abandonment_reason = p_abandonment_reason,
      updated_at = NOW()
  WHERE id = p_goal_id AND user_id = p_user_id;

  -- If there are funds and refund account specified, create refund transaction
  IF v_current_amount > 0 AND p_refund_to_account_id IS NOT NULL AND v_goal_account_id IS NOT NULL THEN
    -- Create account transaction (transfer from goal account back to refund account)
    INSERT INTO public.account_transactions (
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
    INSERT INTO public.goal_contributions (
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
      v_goal_account_id,
      v_current_amount,
      CURRENT_DATE,
      p_abandonment_reason,
      'refund',
      v_account_tx_id
    )
    RETURNING id INTO v_contribution_id;

    -- Update goal current amount to zero
    UPDATE public.goals
    SET current_amount = 0,
        updated_at = NOW()
    WHERE id = p_goal_id;
  END IF;

  -- Prepare result
  v_result := json_build_object(
    'success', true,
    'refunded_amount', COALESCE(v_current_amount, 0),
    'account_transaction_id', v_account_tx_id
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- =====================================================
-- Re-grant permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION public.process_goal_contribution(UUID, UUID, UUID, UUID, DECIMAL, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.abandon_goal(UUID, UUID, TEXT, UUID) TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Fixed 4 remaining functions with correct signatures:
-- 1. calculate_days_until_due() - trigger function
-- 2. process_investment_return() - trigger function
-- 3. process_goal_contribution(7 params) - goal contribution handler
-- 4. abandon_goal(4 params) - goal abandonment handler
-- =====================================================
