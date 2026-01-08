-- =====================================================
-- Migration 028: Add category_id to expenses table
-- =====================================================
-- Purpose: Link expenses to centralized category system using UUID foreign key
-- Dependencies: 024_unified_category_system.sql
--
-- This follows the same pattern as:
-- - 025_add_category_id_to_transactions.sql (account_transactions)
-- - 026_create_budgets_table.sql (budgets)
--
-- Changes:
-- 1. Add category_id column (nullable initially for backfill)
-- 2. Backfill category_id from legacy category strings
-- 3. Drop the legacy CHECK constraint
-- 4. Mark old category column as deprecated
-- =====================================================

-- =====================================================
-- 1. Add category_id column
-- =====================================================
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL;

-- Create index for faster category lookups
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);

-- =====================================================
-- 2. Drop the legacy category CHECK constraint
-- =====================================================
-- This constraint restricted categories to a hardcoded list
-- Now categories come from expense_categories table
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_category_check;

-- =====================================================
-- 3. Backfill category_id from existing category string
-- =====================================================
DO $$
DECLARE
    exp_record RECORD;
    found_category_id UUID;
    mapped_count INTEGER := 0;
    unmapped_count INTEGER := 0;
BEGIN
    FOR exp_record IN
        SELECT id, user_id, category
        FROM expenses
        WHERE category IS NOT NULL AND category_id IS NULL
    LOOP
        -- Try exact slug match first
        SELECT ec.id INTO found_category_id
        FROM expense_categories ec
        WHERE ec.user_id = exp_record.user_id
          AND ec.slug = exp_record.category
          AND ec.is_active = TRUE
        LIMIT 1;

        -- If not found, try common legacy mappings
        IF found_category_id IS NULL THEN
            CASE
                WHEN exp_record.category IN ('food', 'groceries') THEN
                    SELECT ec.id INTO found_category_id
                    FROM expense_categories ec
                    WHERE ec.user_id = exp_record.user_id
                      AND ec.slug IN ('groceries', 'food-dining')
                      AND ec.is_active = TRUE
                    LIMIT 1;

                WHEN exp_record.category IN ('transport', 'transportation') THEN
                    SELECT ec.id INTO found_category_id
                    FROM expense_categories ec
                    WHERE ec.user_id = exp_record.user_id
                      AND ec.slug IN ('fuel', 'public-transport', 'transport')
                      AND ec.is_active = TRUE
                    LIMIT 1;

                WHEN exp_record.category = 'rent' THEN
                    SELECT ec.id INTO found_category_id
                    FROM expense_categories ec
                    WHERE ec.user_id = exp_record.user_id
                      AND ec.slug = 'rent'
                      AND ec.is_active = TRUE
                    LIMIT 1;

                WHEN exp_record.category = 'utilities' THEN
                    SELECT ec.id INTO found_category_id
                    FROM expense_categories ec
                    WHERE ec.user_id = exp_record.user_id
                      AND ec.slug IN ('electricity', 'water', 'utilities')
                      AND ec.is_active = TRUE
                    LIMIT 1;

                WHEN exp_record.category = 'airtime' THEN
                    SELECT ec.id INTO found_category_id
                    FROM expense_categories ec
                    WHERE ec.user_id = exp_record.user_id
                      AND ec.slug = 'airtime'
                      AND ec.is_active = TRUE
                    LIMIT 1;

                WHEN exp_record.category IN ('entertainment', 'subscriptions') THEN
                    SELECT ec.id INTO found_category_id
                    FROM expense_categories ec
                    WHERE ec.user_id = exp_record.user_id
                      AND ec.slug IN ('subscriptions', 'entertainment', 'events')
                      AND ec.is_active = TRUE
                    LIMIT 1;

                WHEN exp_record.category = 'health' THEN
                    SELECT ec.id INTO found_category_id
                    FROM expense_categories ec
                    WHERE ec.user_id = exp_record.user_id
                      AND ec.slug IN ('medical-bills', 'pharmacy', 'health')
                      AND ec.is_active = TRUE
                    LIMIT 1;

                WHEN exp_record.category = 'education' THEN
                    SELECT ec.id INTO found_category_id
                    FROM expense_categories ec
                    WHERE ec.user_id = exp_record.user_id
                      AND ec.slug IN ('school-fees', 'courses', 'education')
                      AND ec.is_active = TRUE
                    LIMIT 1;

                WHEN exp_record.category = 'clothing' THEN
                    SELECT ec.id INTO found_category_id
                    FROM expense_categories ec
                    WHERE ec.user_id = exp_record.user_id
                      AND ec.slug = 'clothing'
                      AND ec.is_active = TRUE
                    LIMIT 1;

                WHEN exp_record.category IN ('fees', 'bank_fees', 'bank-fees') THEN
                    SELECT ec.id INTO found_category_id
                    FROM expense_categories ec
                    WHERE ec.user_id = exp_record.user_id
                      AND ec.slug IN ('bank-fees', 'transaction-charges')
                      AND ec.is_active = TRUE
                    LIMIT 1;

                WHEN exp_record.category IN ('other', 'miscellaneous', 'misc') THEN
                    SELECT ec.id INTO found_category_id
                    FROM expense_categories ec
                    WHERE ec.user_id = exp_record.user_id
                      AND ec.slug = 'uncategorized'
                      AND ec.is_active = TRUE
                    LIMIT 1;

                ELSE
                    -- Try fuzzy match on name
                    SELECT ec.id INTO found_category_id
                    FROM expense_categories ec
                    WHERE ec.user_id = exp_record.user_id
                      AND LOWER(ec.name) LIKE '%' || LOWER(exp_record.category) || '%'
                      AND ec.is_active = TRUE
                    LIMIT 1;

                    -- If still not found, default to uncategorized
                    IF found_category_id IS NULL THEN
                        SELECT ec.id INTO found_category_id
                        FROM expense_categories ec
                        WHERE ec.user_id = exp_record.user_id
                          AND ec.slug = 'uncategorized'
                          AND ec.is_active = TRUE
                        LIMIT 1;
                    END IF;
            END CASE;
        END IF;

        -- Update the expense with found category_id
        IF found_category_id IS NOT NULL THEN
            UPDATE expenses
            SET category_id = found_category_id
            WHERE id = exp_record.id;

            mapped_count := mapped_count + 1;
        ELSE
            unmapped_count := unmapped_count + 1;
            RAISE WARNING 'Could not map expense % with category "%"', exp_record.id, exp_record.category;
        END IF;
    END LOOP;

    RAISE NOTICE 'Mapped % expenses to category_id. % expenses could not be mapped.', mapped_count, unmapped_count;
END $$;

-- =====================================================
-- 4. Mark legacy category column as deprecated
-- =====================================================
-- Keep the column for backwards compatibility during transition
-- New code should use category_id exclusively
COMMENT ON COLUMN expenses.category IS 'DEPRECATED: Use category_id instead. Kept for backwards compatibility during migration.';
COMMENT ON COLUMN expenses.category_id IS 'Foreign key to expense_categories table. Primary way to categorize expenses.';

-- =====================================================
-- 5. Add table comment
-- =====================================================
COMMENT ON TABLE expenses IS 'User expenses linked to accounts and categories. Uses category_id for hierarchical category system.';

-- =====================================================
-- Verification queries (run after migration)
-- =====================================================
-- Check backfill results:
-- SELECT
--   COUNT(*) as total,
--   COUNT(category_id) as with_category_id,
--   COUNT(*) - COUNT(category_id) as without_category_id
-- FROM expenses;

-- Check constraint is dropped:
-- SELECT conname FROM pg_constraint WHERE conrelid = 'expenses'::regclass AND conname LIKE '%category%';
