-- Migration: Fix Function Search Path Mutable Warnings
-- Purpose: Add SET search_path = '' to all functions to prevent search path injection attacks
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- =====================================================
-- FIRST: Drop all functions to avoid parameter name and return type conflicts
-- Using CASCADE to also drop dependent triggers (will be recreated below)
-- =====================================================

-- Parameterized functions
DROP FUNCTION IF EXISTS public.calculate_next_due_date(DATE, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_days_until_due(DATE) CASCADE;
DROP FUNCTION IF EXISTS public.check_email_rate_limit(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_or_create_bad_debt_account(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.add_new_subcategories_for_user(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.process_goal_contribution(UUID, UUID, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS public.abandon_goal(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_budgetable_categories(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.process_investment_return(UUID, DECIMAL, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_category_id(UUID, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS public.get_category_name(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.create_default_categories_for_user(UUID) CASCADE;

-- Trigger functions (CASCADE will drop dependent triggers)
DROP FUNCTION IF EXISTS public.update_overdue_status() CASCADE;
DROP FUNCTION IF EXISTS public.update_email_preferences_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_goal_progress() CASCADE;
DROP FUNCTION IF EXISTS public.update_lending_tracker_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_bill_reminders_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_pending_expenses_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_ai_predictions_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_accounts_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.create_default_email_preferences() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_create_default_categories() CASCADE;
DROP FUNCTION IF EXISTS public.ensure_single_primary_account() CASCADE;
DROP FUNCTION IF EXISTS public.update_account_balance_on_transaction() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Other functions
DROP FUNCTION IF EXISTS public.cleanup_expired_otps() CASCADE;

-- =====================================================
-- 1. update_email_preferences_updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_email_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- =====================================================
-- 2. update_goal_progress (if exists)
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_goal_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate goal progress based on allocations
  UPDATE public.goals
  SET current_amount = (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.goal_allocations
    WHERE goal_id = NEW.goal_id
  ),
  updated_at = NOW()
  WHERE id = NEW.goal_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- =====================================================
-- 3. update_lending_tracker_updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_lending_tracker_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- =====================================================
-- 4. update_bill_reminders_updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_bill_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- =====================================================
-- 5. update_pending_expenses_updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_pending_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- =====================================================
-- 6. update_ai_predictions_updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_ai_predictions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- =====================================================
-- 7. update_accounts_updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- =====================================================
-- 8. cleanup_expired_otps
-- =====================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM public.otp_codes WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- =====================================================
-- 9. create_default_email_preferences
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_default_email_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.email_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- =====================================================
-- 10. calculate_next_due_date
-- =====================================================
CREATE OR REPLACE FUNCTION public.calculate_next_due_date(
  current_date_val DATE,
  frequency VARCHAR
)
RETURNS DATE AS $$
BEGIN
  RETURN CASE frequency
    WHEN 'daily' THEN current_date_val + INTERVAL '1 day'
    WHEN 'weekly' THEN current_date_val + INTERVAL '1 week'
    WHEN 'biweekly' THEN current_date_val + INTERVAL '2 weeks'
    WHEN 'monthly' THEN current_date_val + INTERVAL '1 month'
    WHEN 'quarterly' THEN current_date_val + INTERVAL '3 months'
    WHEN 'semi_annually' THEN current_date_val + INTERVAL '6 months'
    WHEN 'annually' THEN current_date_val + INTERVAL '1 year'
    ELSE current_date_val + INTERVAL '1 month'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE
SET search_path = '';

-- =====================================================
-- 11. calculate_days_until_due
-- =====================================================
CREATE OR REPLACE FUNCTION public.calculate_days_until_due(due_date DATE)
RETURNS INTEGER AS $$
BEGIN
  RETURN due_date - CURRENT_DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE
SET search_path = '';

-- =====================================================
-- 12. update_overdue_status
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_overdue_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update is_overdue based on due_date
  IF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE THEN
    NEW.is_overdue = TRUE;
  ELSE
    NEW.is_overdue = FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- =====================================================
-- 13. check_email_rate_limit
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_email_rate_limit(p_user_id UUID, p_email_type TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  v_max_emails INTEGER;
  v_sent_today INTEGER;
BEGIN
  -- Get user's max emails per day setting
  SELECT COALESCE(max_emails_per_day, 5) INTO v_max_emails
  FROM public.email_preferences
  WHERE user_id = p_user_id;

  -- Default to 5 if no preference set
  IF v_max_emails IS NULL THEN
    v_max_emails := 5;
  END IF;

  -- Count emails sent today (excluding OTP and verification which are critical)
  SELECT COUNT(*) INTO v_sent_today
  FROM public.email_logs
  WHERE user_id = p_user_id
    AND created_at >= CURRENT_DATE
    AND email_type NOT IN ('otp', 'verification', 'password_reset')
    AND status = 'sent';

  RETURN v_sent_today < v_max_emails;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- =====================================================
-- 14. get_or_create_bad_debt_account
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_or_create_bad_debt_account(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_account_id UUID;
BEGIN
  -- Try to find existing bad debt account
  SELECT id INTO v_account_id
  FROM public.accounts
  WHERE user_id = p_user_id
    AND account_type = 'system'
    AND name = 'Bad Debt Write-offs';

  -- Create if not exists
  IF v_account_id IS NULL THEN
    INSERT INTO public.accounts (user_id, name, account_type, current_balance, currency, is_primary)
    VALUES (p_user_id, 'Bad Debt Write-offs', 'system', 0, 'KES', FALSE)
    RETURNING id INTO v_account_id;
  END IF;

  RETURN v_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- =====================================================
-- 15. add_new_subcategories_for_user
-- =====================================================
CREATE OR REPLACE FUNCTION public.add_new_subcategories_for_user(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_parent_id UUID;
  subcat_data TEXT[];
  new_subcategories TEXT[][] := ARRAY[
    -- Add any new subcategories here
    -- Format: [slug, name, description, parent_slug, display_order]
  ];
BEGIN
  -- Iterate through new subcategories and add them
  FOREACH subcat_data SLICE 1 IN ARRAY new_subcategories
  LOOP
    -- Get parent category ID
    SELECT id INTO v_parent_id
    FROM public.expense_categories
    WHERE user_id = p_user_id
      AND slug = subcat_data[4]
      AND parent_category_id IS NULL
    LIMIT 1;

    -- Only create subcategory if parent exists
    IF v_parent_id IS NOT NULL THEN
      INSERT INTO public.expense_categories (
        user_id, slug, name, description, color, icon,
        parent_category_id, is_system, is_active, display_order
      )
      VALUES (
        p_user_id,
        subcat_data[1],
        subcat_data[2],
        subcat_data[3],
        NULL,
        NULL,
        v_parent_id,
        TRUE,
        TRUE,
        subcat_data[5]::INTEGER
      )
      ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- =====================================================
-- 16. process_goal_contribution
-- =====================================================
CREATE OR REPLACE FUNCTION public.process_goal_contribution(
  p_goal_id UUID,
  p_transaction_id UUID,
  p_amount DECIMAL
)
RETURNS VOID AS $$
BEGIN
  -- Insert goal allocation
  INSERT INTO public.goal_allocations (goal_id, account_transaction_id, amount)
  VALUES (p_goal_id, p_transaction_id, p_amount);

  -- Update goal current_amount
  UPDATE public.goals
  SET current_amount = current_amount + p_amount,
      updated_at = NOW()
  WHERE id = p_goal_id;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- =====================================================
-- 17. abandon_goal
-- =====================================================
CREATE OR REPLACE FUNCTION public.abandon_goal(p_goal_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Mark goal as abandoned
  UPDATE public.goals
  SET status = 'abandoned',
      updated_at = NOW()
  WHERE id = p_goal_id;

  -- Remove all allocations (optional - or keep for history)
  -- DELETE FROM public.goal_allocations WHERE goal_id = p_goal_id;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- =====================================================
-- 18. trigger_create_default_categories
-- =====================================================
CREATE OR REPLACE FUNCTION public.trigger_create_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.create_default_categories_for_user(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- =====================================================
-- 19. get_budgetable_categories
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_budgetable_categories(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  slug VARCHAR,
  parent_name VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.slug,
    p.name AS parent_name
  FROM public.expense_categories c
  LEFT JOIN public.expense_categories p ON c.parent_category_id = p.id
  WHERE c.user_id = p_user_id
    AND c.is_active = TRUE
  ORDER BY COALESCE(p.display_order, c.display_order), c.display_order;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- =====================================================
-- 20. ensure_single_primary_account
-- =====================================================
CREATE OR REPLACE FUNCTION public.ensure_single_primary_account()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = TRUE THEN
    -- Unset any other primary accounts for this user
    UPDATE public.accounts
    SET is_primary = FALSE
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_primary = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- =====================================================
-- 21. update_account_balance_on_transaction
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_account_balance_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    -- Decrease from_account balance
    IF NEW.from_account_id IS NOT NULL THEN
      UPDATE public.accounts
      SET current_balance = current_balance - NEW.amount
      WHERE id = NEW.from_account_id;
    END IF;

    -- Increase to_account balance
    IF NEW.to_account_id IS NOT NULL THEN
      UPDATE public.accounts
      SET current_balance = current_balance + NEW.amount
      WHERE id = NEW.to_account_id;
    END IF;
  END IF;

  -- Handle DELETE (reverse the transaction)
  IF TG_OP = 'DELETE' THEN
    -- Restore from_account balance
    IF OLD.from_account_id IS NOT NULL THEN
      UPDATE public.accounts
      SET current_balance = current_balance + OLD.amount
      WHERE id = OLD.from_account_id;
    END IF;

    -- Restore to_account balance
    IF OLD.to_account_id IS NOT NULL THEN
      UPDATE public.accounts
      SET current_balance = current_balance - OLD.amount
      WHERE id = OLD.to_account_id;
    END IF;

    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- =====================================================
-- 22. process_investment_return
-- =====================================================
CREATE OR REPLACE FUNCTION public.process_investment_return(
  p_account_id UUID,
  p_amount DECIMAL,
  p_description TEXT DEFAULT 'Investment return'
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
  v_user_id UUID;
BEGIN
  -- Get user_id from account
  SELECT user_id INTO v_user_id
  FROM public.accounts
  WHERE id = p_account_id;

  -- Create investment return transaction
  INSERT INTO public.account_transactions (
    user_id,
    to_account_id,
    transaction_type,
    amount,
    description
  )
  VALUES (
    v_user_id,
    p_account_id,
    'investment_return',
    p_amount,
    p_description
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- =====================================================
-- 23. get_category_id
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_category_id(p_user_id UUID, p_slug VARCHAR)
RETURNS UUID AS $$
DECLARE
  v_category_id UUID;
BEGIN
  SELECT id INTO v_category_id
  FROM public.expense_categories
  WHERE user_id = p_user_id AND slug = p_slug AND is_active = TRUE
  LIMIT 1;

  RETURN v_category_id;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- =====================================================
-- 24. get_category_name
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_category_name(p_category_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_name VARCHAR;
BEGIN
  SELECT name INTO v_name
  FROM public.expense_categories
  WHERE id = p_category_id
  LIMIT 1;

  RETURN v_name;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- =====================================================
-- 25. create_default_categories_for_user
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_default_categories_for_user(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_parent_id UUID;
  parent_categories TEXT[][] := ARRAY[
    ARRAY['housing', 'Housing', 'Rent, mortgage, home maintenance', '#FF6B6B', 'home', '1'],
    ARRAY['utilities', 'Utilities', 'Electricity, water, gas, internet, airtime', '#F38181', 'bolt', '2'],
    ARRAY['food-dining', 'Food & Dining', 'Groceries, restaurants, takeout', '#95E1D3', 'utensils', '3'],
    ARRAY['transport', 'Transport', 'Fuel, public transport, ride-hailing, vehicle maintenance', '#4ECDC4', 'car', '4'],
    ARRAY['health', 'Health', 'Medical bills, insurance, pharmacy', '#A8E6CF', 'heart', '5'],
    ARRAY['education', 'Education', 'School fees, courses, books', '#FFD3B6', 'book', '6'],
    ARRAY['personal', 'Personal', 'Clothing, personal care', '#FFAAA5', 'user', '7'],
    ARRAY['entertainment', 'Entertainment', 'Subscriptions, events, hobbies', '#FCBAD3', 'film', '8'],
    ARRAY['financial', 'Financial', 'Bank fees, transaction charges', '#C7CEEA', 'credit-card', '9'],
    ARRAY['family-social', 'Family & Social', 'Gifts, donations', '#FFB6C1', 'users', '10'],
    ARRAY['business', 'Business', 'Business expenses', '#87CEEB', 'briefcase', '11'],
    ARRAY['miscellaneous', 'Miscellaneous', 'Uncategorized and other expenses', '#B4B4B8', 'dots-horizontal', '12']
  ];
  parent_data TEXT[];

  subcategories TEXT[][] := ARRAY[
    ARRAY['rent', 'Rent', 'Monthly rent payments', 'housing', '1'],
    ARRAY['mortgage', 'Mortgage', 'Mortgage payments', 'housing', '2'],
    ARRAY['home-maintenance', 'Home Maintenance', 'Repairs, maintenance, improvements', 'housing', '3'],
    ARRAY['electricity', 'Electricity', 'Electricity bills', 'utilities', '1'],
    ARRAY['water', 'Water', 'Water bills', 'utilities', '2'],
    ARRAY['gas', 'Gas', 'Gas bills', 'utilities', '3'],
    ARRAY['internet', 'Internet', 'Internet and WiFi', 'utilities', '4'],
    ARRAY['airtime', 'Mobile Airtime', 'Mobile airtime and data bundles', 'utilities', '5'],
    ARRAY['groceries', 'Groceries', 'Supermarket and grocery shopping', 'food-dining', '1'],
    ARRAY['restaurants', 'Restaurants', 'Dining out at restaurants', 'food-dining', '2'],
    ARRAY['takeout', 'Takeout', 'Food delivery and takeout', 'food-dining', '3'],
    ARRAY['fuel', 'Fuel', 'Petrol, diesel, gas', 'transport', '1'],
    ARRAY['public-transport', 'Public Transport', 'Matatus, buses, trains', 'transport', '2'],
    ARRAY['ride-hailing', 'Ride Hailing', 'Uber, Bolt, Little Cab', 'transport', '3'],
    ARRAY['vehicle-maintenance', 'Vehicle Maintenance', 'Car repairs, servicing, parking', 'transport', '4'],
    ARRAY['medical-bills', 'Medical Bills', 'Hospital, doctor, clinic visits', 'health', '1'],
    ARRAY['insurance', 'Insurance', 'Health insurance premiums', 'health', '2'],
    ARRAY['pharmacy', 'Pharmacy', 'Medicine and prescriptions', 'health', '3'],
    ARRAY['school-fees', 'School Fees', 'Tuition, school fees', 'education', '1'],
    ARRAY['courses', 'Courses', 'Online courses, training', 'education', '2'],
    ARRAY['books', 'Books', 'Textbooks, educational materials', 'education', '3'],
    ARRAY['clothing', 'Clothing', 'Clothes, shoes, accessories', 'personal', '1'],
    ARRAY['personal-care', 'Personal Care', 'Grooming, beauty, salon', 'personal', '2'],
    ARRAY['subscriptions', 'Subscriptions', 'Netflix, Spotify, gym memberships', 'entertainment', '1'],
    ARRAY['events', 'Events', 'Movies, concerts, outings', 'entertainment', '2'],
    ARRAY['hobbies', 'Hobbies', 'Sports, games, recreational activities', 'entertainment', '3'],
    ARRAY['bank-fees', 'Bank Fees', 'Bank charges, account fees', 'financial', '1'],
    ARRAY['transaction-charges', 'Transaction Charges', 'M-Pesa fees, transfer charges', 'financial', '2'],
    ARRAY['gifts', 'Gifts', 'Gifts for family and friends', 'family-social', '1'],
    ARRAY['donations', 'Donations', 'Charitable donations, tithe', 'family-social', '2'],
    ARRAY['business-expenses', 'Business Expenses', 'Business-related costs', 'business', '1'],
    ARRAY['uncategorized', 'Uncategorized', 'Expenses not yet categorized', 'miscellaneous', '1']
  ];
  subcat_data TEXT[];
BEGIN
  -- Step 1: Create parent categories
  FOREACH parent_data SLICE 1 IN ARRAY parent_categories
  LOOP
    INSERT INTO public.expense_categories (
      user_id, slug, name, description, color, icon,
      parent_category_id, is_system, is_active, display_order
    )
    VALUES (
      p_user_id,
      parent_data[1],
      parent_data[2],
      parent_data[3],
      parent_data[4],
      parent_data[5],
      NULL,
      TRUE,
      TRUE,
      parent_data[6]::INTEGER
    )
    ON CONFLICT (user_id, slug) DO NOTHING;
  END LOOP;

  -- Step 2: Create subcategories
  FOREACH subcat_data SLICE 1 IN ARRAY subcategories
  LOOP
    SELECT id INTO v_parent_id
    FROM public.expense_categories
    WHERE user_id = p_user_id
      AND slug = subcat_data[4]
      AND parent_category_id IS NULL
    LIMIT 1;

    IF v_parent_id IS NOT NULL THEN
      INSERT INTO public.expense_categories (
        user_id, slug, name, description, color, icon,
        parent_category_id, is_system, is_active, display_order
      )
      VALUES (
        p_user_id,
        subcat_data[1],
        subcat_data[2],
        subcat_data[3],
        NULL,
        NULL,
        v_parent_id,
        TRUE,
        TRUE,
        subcat_data[5]::INTEGER
      )
      ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- =====================================================
-- 26. update_updated_at_column
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- =====================================================
-- 27. Fix OTP insert policy to be more restrictive
-- Add rate limiting check to prevent abuse
-- =====================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "otp_codes_anon_insert_policy" ON public.otp_codes;

-- Create a more restrictive policy with basic validation
-- Note: True rate limiting should be done at the application/edge function level
CREATE POLICY "otp_codes_anon_insert_policy" ON public.otp_codes
  FOR INSERT
  TO anon
  WITH CHECK (
    -- Basic validation: email must be provided and code must exist
    email IS NOT NULL AND
    email != '' AND
    code IS NOT NULL AND
    code != '' AND
    expires_at > now()
  );

-- =====================================================
-- 28. RECREATE TRIGGERS (dropped by CASCADE)
-- =====================================================

-- Trigger for email_preferences updated_at
DROP TRIGGER IF EXISTS trigger_email_preferences_updated_at ON public.email_preferences;
CREATE TRIGGER trigger_email_preferences_updated_at
  BEFORE UPDATE ON public.email_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_email_preferences_updated_at();

-- Trigger for lending_tracker updated_at
DROP TRIGGER IF EXISTS update_lending_tracker_updated_at ON public.lending_tracker;
CREATE TRIGGER update_lending_tracker_updated_at
  BEFORE UPDATE ON public.lending_tracker
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lending_tracker_updated_at();

-- Trigger for bill_reminders updated_at
DROP TRIGGER IF EXISTS update_bill_reminders_updated_at ON public.bill_reminders;
CREATE TRIGGER update_bill_reminders_updated_at
  BEFORE UPDATE ON public.bill_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bill_reminders_updated_at();

-- Trigger for pending_expenses updated_at
DROP TRIGGER IF EXISTS update_pending_expenses_updated_at ON public.pending_expenses;
CREATE TRIGGER update_pending_expenses_updated_at
  BEFORE UPDATE ON public.pending_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_pending_expenses_updated_at();

-- Trigger for ai_predictions updated_at
DROP TRIGGER IF EXISTS update_ai_predictions_updated_at ON public.ai_predictions;
CREATE TRIGGER update_ai_predictions_updated_at
  BEFORE UPDATE ON public.ai_predictions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ai_predictions_updated_at();

-- Trigger for accounts updated_at
DROP TRIGGER IF EXISTS update_accounts_updated_at ON public.accounts;
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_accounts_updated_at();

-- Trigger for accounts primary account enforcement
DROP TRIGGER IF EXISTS ensure_single_primary_account ON public.accounts;
CREATE TRIGGER ensure_single_primary_account
  BEFORE INSERT OR UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_primary_account();

-- Trigger for account_transactions balance updates
DROP TRIGGER IF EXISTS trigger_update_account_balance ON public.account_transactions;
CREATE TRIGGER trigger_update_account_balance
  AFTER INSERT OR DELETE ON public.account_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_account_balance_on_transaction();

-- Trigger for expense_categories updated_at
DROP TRIGGER IF EXISTS update_expense_categories_updated_at ON public.expense_categories;
CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for categorization_rules updated_at
DROP TRIGGER IF EXISTS update_categorization_rules_updated_at ON public.categorization_rules;
CREATE TRIGGER update_categorization_rules_updated_at
  BEFORE UPDATE ON public.categorization_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for category_overrides updated_at
DROP TRIGGER IF EXISTS update_category_overrides_updated_at ON public.category_overrides;
CREATE TRIGGER update_category_overrides_updated_at
  BEFORE UPDATE ON public.category_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for creating default email preferences on profile creation
DROP TRIGGER IF EXISTS trigger_create_email_preferences ON public.profiles;
CREATE TRIGGER trigger_create_email_preferences
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_email_preferences();

-- Trigger for creating default categories on user creation
DROP TRIGGER IF EXISTS on_user_created_create_categories ON auth.users;
CREATE TRIGGER on_user_created_create_categories
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_create_default_categories();

-- Trigger for goal allocations to update goal progress
DROP TRIGGER IF EXISTS trigger_update_goal_progress ON public.goal_allocations;
CREATE TRIGGER trigger_update_goal_progress
  AFTER INSERT OR DELETE ON public.goal_allocations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_goal_progress();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Fixed 26 functions with mutable search_path
-- Recreated 14 triggers that were dropped by CASCADE
-- Updated OTP insert policy with basic validation
-- Note: auth_leaked_password_protection must be enabled
--       in Supabase Dashboard > Authentication > Settings
-- =====================================================
