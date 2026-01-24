-- Migration: Fix Supabase Security Linter Issues
-- Purpose: Address SECURITY DEFINER views and enable RLS on public tables

-- =====================================================
-- 1. DROP SECURITY DEFINER VIEWS
-- These are migration verification views not needed in production
-- =====================================================

DROP VIEW IF EXISTS public.migration_summary;
DROP VIEW IF EXISTS public.migration_010_verification;

-- =====================================================
-- 2. ENABLE RLS ON goal_allocations
-- This table links to goals via goal_id, so we need to join
-- =====================================================

ALTER TABLE goal_allocations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own goal allocations
CREATE POLICY "goal_allocations_select_policy" ON goal_allocations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = goal_allocations.goal_id
      AND goals.user_id = auth.uid()
    )
  );

-- Policy: Users can insert allocations for their own goals
CREATE POLICY "goal_allocations_insert_policy" ON goal_allocations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = goal_allocations.goal_id
      AND goals.user_id = auth.uid()
    )
  );

-- Policy: Users can update allocations for their own goals
CREATE POLICY "goal_allocations_update_policy" ON goal_allocations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = goal_allocations.goal_id
      AND goals.user_id = auth.uid()
    )
  );

-- Policy: Users can delete allocations for their own goals
CREATE POLICY "goal_allocations_delete_policy" ON goal_allocations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = goal_allocations.goal_id
      AND goals.user_id = auth.uid()
    )
  );

-- =====================================================
-- 3. ENABLE RLS ON expense_categories
-- Has user_id column for direct filtering
-- =====================================================

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own expense categories
CREATE POLICY "expense_categories_select_policy" ON expense_categories
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can insert their own expense categories
CREATE POLICY "expense_categories_insert_policy" ON expense_categories
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own expense categories
CREATE POLICY "expense_categories_update_policy" ON expense_categories
  FOR UPDATE
  USING (user_id = auth.uid());

-- Policy: Users can delete their own expense categories (only non-system ones)
CREATE POLICY "expense_categories_delete_policy" ON expense_categories
  FOR DELETE
  USING (user_id = auth.uid() AND is_system = FALSE);

-- =====================================================
-- 4. ENABLE RLS ON categorization_rules
-- Has user_id column for direct filtering
-- =====================================================

ALTER TABLE categorization_rules ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own categorization rules
CREATE POLICY "categorization_rules_select_policy" ON categorization_rules
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can insert their own categorization rules
CREATE POLICY "categorization_rules_insert_policy" ON categorization_rules
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own categorization rules
CREATE POLICY "categorization_rules_update_policy" ON categorization_rules
  FOR UPDATE
  USING (user_id = auth.uid());

-- Policy: Users can delete their own categorization rules
CREATE POLICY "categorization_rules_delete_policy" ON categorization_rules
  FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- 5. ENABLE RLS ON category_overrides
-- Has user_id column for direct filtering
-- =====================================================

ALTER TABLE category_overrides ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own category overrides
CREATE POLICY "category_overrides_select_policy" ON category_overrides
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can insert their own category overrides
CREATE POLICY "category_overrides_insert_policy" ON category_overrides
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own category overrides
CREATE POLICY "category_overrides_update_policy" ON category_overrides
  FOR UPDATE
  USING (user_id = auth.uid());

-- Policy: Users can delete their own category overrides
CREATE POLICY "category_overrides_delete_policy" ON category_overrides
  FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- 6. ENABLE RLS ON categorization_audit_log
-- Has user_id column for direct filtering
-- =====================================================

ALTER TABLE categorization_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own categorization audit logs
CREATE POLICY "categorization_audit_log_select_policy" ON categorization_audit_log
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can insert their own categorization audit logs
CREATE POLICY "categorization_audit_log_insert_policy" ON categorization_audit_log
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Note: Audit logs should not be updated or deleted by users
-- Service role can still modify if needed

-- =====================================================
-- 7. ENABLE RLS ON otp_codes
-- This table is used for authentication (login, verification)
-- No user_id column - controlled by email
-- Allow anon for OTP creation/verification, service_role for management
-- =====================================================

ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous users to create OTP codes (for login flow)
CREATE POLICY "otp_codes_anon_insert_policy" ON otp_codes
  FOR INSERT
  TO anon
  WITH CHECK (TRUE);

-- Policy: Allow anonymous users to select OTP codes (for verification)
CREATE POLICY "otp_codes_anon_select_policy" ON otp_codes
  FOR SELECT
  TO anon
  USING (TRUE);

-- Policy: Allow service role full access (for cleanup and management)
CREATE POLICY "otp_codes_service_role_policy" ON otp_codes
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- =====================================================
-- 8. ADD RLS POLICY FOR migration_history (INFO level issue)
-- Table has RLS enabled but no policies
-- =====================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "migration_history_select_policy" ON migration_history;

-- Policy: Allow authenticated users to read migration history (informational)
CREATE POLICY "migration_history_select_policy" ON migration_history
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- Service role can manage migration history
CREATE POLICY "migration_history_service_role_policy" ON migration_history
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Fixed:
-- 1. Dropped SECURITY DEFINER views (migration_summary, migration_010_verification)
-- 2. Enabled RLS on goal_allocations with goal ownership policies
-- 3. Enabled RLS on expense_categories with user_id policies
-- 4. Enabled RLS on categorization_rules with user_id policies
-- 5. Enabled RLS on category_overrides with user_id policies
-- 6. Enabled RLS on categorization_audit_log with user_id policies
-- 7. Enabled RLS on otp_codes with anon/service_role policies
-- 8. Added policies to migration_history table
-- =====================================================
