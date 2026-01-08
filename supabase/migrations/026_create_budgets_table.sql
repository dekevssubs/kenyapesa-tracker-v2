-- =====================================================
-- Migration: Migrate Budgets Table to Use category_id
-- =====================================================
-- Purpose: Update existing budgets table to use unified category system
-- Dependencies: 024_unified_category_system.sql
--
-- Changes:
-- 1. Add category_id column
-- 2. Backfill category_id from category strings
-- 3. Drop old category column
-- 4. Add constraints and helper functions
-- =====================================================

-- =====================================================
-- 1. Add category_id column (nullable initially for backfill)
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'budgets' AND column_name = 'category_id'
    ) THEN
        ALTER TABLE budgets ADD COLUMN category_id UUID REFERENCES expense_categories(id) ON DELETE RESTRICT;
        RAISE NOTICE 'Added category_id column to budgets table';
    ELSE
        RAISE NOTICE 'category_id column already exists';
    END IF;
END $$;

-- =====================================================
-- 2. Backfill category_id from category strings
-- =====================================================
-- Map old category strings to new category_id UUIDs
DO $$
DECLARE
    budget_record RECORD;
    found_category_id UUID;
    unmapped_count INTEGER := 0;
BEGIN
    -- Loop through all budgets that don't have category_id set
    FOR budget_record IN
        SELECT id, user_id, category
        FROM budgets
        WHERE category_id IS NULL
    LOOP
        -- Try to find matching category by slug
        SELECT ec.id INTO found_category_id
        FROM expense_categories ec
        WHERE ec.user_id = budget_record.user_id
          AND ec.slug = budget_record.category
        LIMIT 1;

        IF found_category_id IS NOT NULL THEN
            -- Update the budget with the found category_id
            UPDATE budgets
            SET category_id = found_category_id
            WHERE id = budget_record.id;

            RAISE NOTICE 'Mapped budget % category "%" to category_id %',
                budget_record.id, budget_record.category, found_category_id;
        ELSE
            -- Category not found - try common mappings
            CASE
                WHEN budget_record.category IN ('food', 'groceries') THEN
                    SELECT ec.id INTO found_category_id
                    FROM expense_categories ec
                    WHERE ec.user_id = budget_record.user_id
                      AND ec.slug IN ('groceries', 'food')
                    LIMIT 1;

                WHEN budget_record.category IN ('transport', 'transportation') THEN
                    SELECT ec.id INTO found_category_id
                    FROM expense_categories ec
                    WHERE ec.user_id = budget_record.user_id
                      AND ec.slug IN ('fuel', 'public_transport', 'transport')
                    LIMIT 1;

                WHEN budget_record.category = 'rent' THEN
                    SELECT ec.id INTO found_category_id
                    FROM expense_categories ec
                    WHERE ec.user_id = budget_record.user_id
                      AND ec.slug = 'rent'
                    LIMIT 1;

                WHEN budget_record.category = 'utilities' THEN
                    SELECT ec.id INTO found_category_id
                    FROM expense_categories ec
                    WHERE ec.user_id = budget_record.user_id
                      AND ec.slug IN ('electricity', 'water', 'utilities')
                    LIMIT 1;

                WHEN budget_record.category = 'airtime' THEN
                    SELECT ec.id INTO found_category_id
                    FROM expense_categories ec
                    WHERE ec.user_id = budget_record.user_id
                      AND ec.slug = 'mobile_airtime'
                    LIMIT 1;

                WHEN budget_record.category IN ('entertainment', 'subscriptions') THEN
                    SELECT ec.id INTO found_category_id
                    FROM expense_categories ec
                    WHERE ec.user_id = budget_record.user_id
                      AND ec.slug IN ('subscriptions', 'entertainment')
                    LIMIT 1;

                WHEN budget_record.category = 'health' THEN
                    SELECT ec.id INTO found_category_id
                    FROM expense_categories ec
                    WHERE ec.user_id = budget_record.user_id
                      AND ec.slug IN ('medical_bills', 'pharmacy', 'health')
                    LIMIT 1;

                WHEN budget_record.category = 'education' THEN
                    SELECT ec.id INTO found_category_id
                    FROM expense_categories ec
                    WHERE ec.user_id = budget_record.user_id
                      AND ec.slug IN ('school_fees', 'education')
                    LIMIT 1;

                WHEN budget_record.category = 'clothing' THEN
                    SELECT ec.id INTO found_category_id
                    FROM expense_categories ec
                    WHERE ec.user_id = budget_record.user_id
                      AND ec.slug = 'clothing'
                    LIMIT 1;

                WHEN budget_record.category IN ('fees', 'bank_fees') THEN
                    SELECT ec.id INTO found_category_id
                    FROM expense_categories ec
                    WHERE ec.user_id = budget_record.user_id
                      AND ec.slug IN ('bank_fees', 'transaction_charges')
                    LIMIT 1;

                WHEN budget_record.category IN ('other', 'miscellaneous') THEN
                    SELECT ec.id INTO found_category_id
                    FROM expense_categories ec
                    WHERE ec.user_id = budget_record.user_id
                      AND ec.slug = 'uncategorized'
                    LIMIT 1;

                ELSE
                    -- Default: try to find uncategorized
                    SELECT ec.id INTO found_category_id
                    FROM expense_categories ec
                    WHERE ec.user_id = budget_record.user_id
                      AND ec.slug = 'uncategorized'
                    LIMIT 1;
            END CASE;

            IF found_category_id IS NOT NULL THEN
                UPDATE budgets
                SET category_id = found_category_id
                WHERE id = budget_record.id;

                RAISE NOTICE 'Mapped budget % category "%" via fallback to category_id %',
                    budget_record.id, budget_record.category, found_category_id;
            ELSE
                unmapped_count := unmapped_count + 1;
                RAISE WARNING 'Could not map budget % with category "%". User: %',
                    budget_record.id, budget_record.category, budget_record.user_id;
            END IF;
        END IF;
    END LOOP;

    IF unmapped_count > 0 THEN
        RAISE WARNING 'Failed to map % budgets. These will need manual attention.', unmapped_count;
    ELSE
        RAISE NOTICE 'Successfully mapped all budgets to category_id';
    END IF;
END $$;

-- =====================================================
-- 3. Check for unmapped budgets before proceeding
-- =====================================================
DO $$
DECLARE
    unmapped_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unmapped_count
    FROM budgets
    WHERE category_id IS NULL;

    IF unmapped_count > 0 THEN
        RAISE EXCEPTION 'Cannot proceed: % budgets still have NULL category_id. Please review and map manually.', unmapped_count;
    END IF;
END $$;

-- =====================================================
-- 4. Make category_id NOT NULL and add constraints
-- =====================================================
ALTER TABLE budgets ALTER COLUMN category_id SET NOT NULL;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unique_user_category_month'
    ) THEN
        ALTER TABLE budgets
        ADD CONSTRAINT unique_user_category_month
        UNIQUE (user_id, category_id, month);
        RAISE NOTICE 'Added unique constraint unique_user_category_month';
    END IF;
END $$;

-- Add check constraint for positive monthly_limit
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'budgets_monthly_limit_positive'
    ) THEN
        ALTER TABLE budgets
        ADD CONSTRAINT budgets_monthly_limit_positive
        CHECK (monthly_limit > 0);
        RAISE NOTICE 'Added check constraint budgets_monthly_limit_positive';
    END IF;
END $$;

-- Add check constraint for valid month date (first day of month)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'valid_month_date'
    ) THEN
        ALTER TABLE budgets
        ADD CONSTRAINT valid_month_date
        CHECK (EXTRACT(DAY FROM month) = 1);
        RAISE NOTICE 'Added check constraint valid_month_date';
    END IF;
END $$;

-- =====================================================
-- 5. Drop old category column (string-based)
-- =====================================================
-- Keep it for now as a backup, mark as deprecated
ALTER TABLE budgets ALTER COLUMN category DROP NOT NULL;
COMMENT ON COLUMN budgets.category IS 'DEPRECATED: Use category_id instead. Will be removed in future migration.';

-- =====================================================
-- 6. Create indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, month);
CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON budgets(category_id);

-- =====================================================
-- 7. Update RLS policies (if not already exist)
-- =====================================================
DO $$
BEGIN
    -- Enable RLS if not already enabled
    ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

    -- Drop old policies if they exist
    DROP POLICY IF EXISTS "Users can view own budgets" ON budgets;
    DROP POLICY IF EXISTS "Users can create own budgets" ON budgets;
    DROP POLICY IF EXISTS "Users can update own budgets" ON budgets;
    DROP POLICY IF EXISTS "Users can delete own budgets" ON budgets;

    -- Create new policies
    CREATE POLICY "Users can view own budgets"
      ON budgets FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can create own budgets"
      ON budgets FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update own budgets"
      ON budgets FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can delete own budgets"
      ON budgets FOR DELETE
      USING (auth.uid() = user_id);

    RAISE NOTICE 'Updated RLS policies for budgets table';
END $$;

-- =====================================================
-- 8. Create updated_at trigger
-- =====================================================
DO $$
BEGIN
    -- Drop trigger if exists
    DROP TRIGGER IF EXISTS update_budgets_updated_at ON budgets;

    -- Create trigger
    CREATE TRIGGER update_budgets_updated_at
      BEFORE UPDATE ON budgets
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    RAISE NOTICE 'Created updated_at trigger for budgets table';
END $$;

-- =====================================================
-- 9. Create helper function: Get budgetable categories
-- =====================================================
-- Returns only categories that can be budgeted
-- (excludes system categories and non-expense categories)
CREATE OR REPLACE FUNCTION get_budgetable_categories(p_user_id UUID)
RETURNS TABLE (
  category_id UUID,
  category_slug VARCHAR(100),
  category_name VARCHAR(255),
  parent_id UUID,
  parent_name VARCHAR(255),
  is_subcategory BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ec.id AS category_id,
    ec.slug AS category_slug,
    ec.name AS category_name,
    ec.parent_category_id AS parent_id,
    parent.name AS parent_name,
    (ec.parent_category_id IS NOT NULL) AS is_subcategory
  FROM expense_categories ec
  LEFT JOIN expense_categories parent ON ec.parent_category_id = parent.id
  WHERE ec.user_id = p_user_id
    AND ec.is_system = false
    -- Exclude categories that shouldn't be budgeted per canonical spec
    AND ec.slug NOT IN (
      'transfers',
      'savings_transfer',
      'investment',
      'lending',
      'repayment',
      'bad_debt',
      'account_transfer'
    )
  ORDER BY
    COALESCE(parent.name, ec.name),
    ec.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. Add table comments
-- =====================================================
COMMENT ON TABLE budgets IS 'Monthly budgets linked to unified category system. Budgets observe spending; they do not control it.';
COMMENT ON COLUMN budgets.category_id IS 'Links to expense_categories.id (unified category system from migration 024)';
COMMENT ON COLUMN budgets.monthly_limit IS 'Budget amount for the month. Compared against ledger transactions only.';
COMMENT ON COLUMN budgets.month IS 'Budget period, always stored as first day of month (YYYY-MM-01)';

-- =====================================================
-- End of migration
-- =====================================================
-- Summary:
-- ✓ Added category_id column
-- ✓ Backfilled data from category strings
-- ✓ Added constraints and indexes
-- ✓ Updated RLS policies
-- ✓ Created helper function for budgetable categories
-- ✓ Deprecated old category column (kept for backup)
-- =====================================================
