-- =====================================================
-- Migration 029: Add category_id to Remaining Tables
-- =====================================================
-- Purpose: Complete the category_id migration for all tables that use categories
-- Dependencies: 024_unified_category_system.sql
--
-- Tables migrated:
-- 1. bill_reminders - Add category_id for expense category
-- 2. recurring_transactions - Add category_id for expense category
--
-- Note: Income tables use 'source' which is an income type, not expense category
-- Per canonical spec, income categories are "optional but supported"
-- =====================================================

-- =====================================================
-- 1. BILL_REMINDERS TABLE
-- =====================================================

-- Add category_id column
ALTER TABLE bill_reminders
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL;

-- Create index for faster category lookups
CREATE INDEX IF NOT EXISTS idx_bill_reminders_category_id ON bill_reminders(category_id);

-- Backfill category_id from existing category string
DO $$
DECLARE
    bill_record RECORD;
    found_category_id UUID;
    mapped_count INTEGER := 0;
    unmapped_count INTEGER := 0;
BEGIN
    FOR bill_record IN
        SELECT id, user_id, category
        FROM bill_reminders
        WHERE category IS NOT NULL AND category_id IS NULL
    LOOP
        -- Try exact slug match first
        SELECT ec.id INTO found_category_id
        FROM expense_categories ec
        WHERE ec.user_id = bill_record.user_id
          AND ec.slug = bill_record.category
          AND ec.is_active = TRUE
        LIMIT 1;

        -- If not found, try common legacy mappings
        IF found_category_id IS NULL THEN
            CASE
                WHEN bill_record.category IN ('food', 'groceries') THEN
                    SELECT ec.id INTO found_category_id
                    FROM expense_categories ec
                    WHERE ec.user_id = bill_record.user_id
                      AND ec.slug IN ('groceries', 'food-dining')
                      AND ec.is_active = TRUE
                    LIMIT 1;

                WHEN bill_record.category = 'rent' THEN
                    SELECT ec.id INTO found_category_id
                    FROM expense_categories ec
                    WHERE ec.user_id = bill_record.user_id
                      AND ec.slug = 'rent'
                      AND ec.is_active = TRUE
                    LIMIT 1;

                WHEN bill_record.category IN ('utilities', 'electricity', 'water') THEN
                    SELECT ec.id INTO found_category_id
                    FROM expense_categories ec
                    WHERE ec.user_id = bill_record.user_id
                      AND ec.slug IN ('electricity', 'water', 'utilities')
                      AND ec.is_active = TRUE
                    LIMIT 1;

                WHEN bill_record.category IN ('internet', 'wifi') THEN
                    SELECT ec.id INTO found_category_id
                    FROM expense_categories ec
                    WHERE ec.user_id = bill_record.user_id
                      AND ec.slug = 'internet'
                      AND ec.is_active = TRUE
                    LIMIT 1;

                WHEN bill_record.category IN ('airtime', 'mobile') THEN
                    SELECT ec.id INTO found_category_id
                    FROM expense_categories ec
                    WHERE ec.user_id = bill_record.user_id
                      AND ec.slug = 'airtime'
                      AND ec.is_active = TRUE
                    LIMIT 1;

                WHEN bill_record.category IN ('subscriptions', 'entertainment', 'streaming') THEN
                    SELECT ec.id INTO found_category_id
                    FROM expense_categories ec
                    WHERE ec.user_id = bill_record.user_id
                      AND ec.slug IN ('subscriptions', 'entertainment')
                      AND ec.is_active = TRUE
                    LIMIT 1;

                WHEN bill_record.category IN ('insurance', 'health') THEN
                    SELECT ec.id INTO found_category_id
                    FROM expense_categories ec
                    WHERE ec.user_id = bill_record.user_id
                      AND ec.slug IN ('health-insurance', 'medical-bills')
                      AND ec.is_active = TRUE
                    LIMIT 1;

                ELSE
                    -- Default to uncategorized
                    SELECT ec.id INTO found_category_id
                    FROM expense_categories ec
                    WHERE ec.user_id = bill_record.user_id
                      AND ec.slug = 'uncategorized'
                      AND ec.is_active = TRUE
                    LIMIT 1;
            END CASE;
        END IF;

        -- Update the bill with found category_id
        IF found_category_id IS NOT NULL THEN
            UPDATE bill_reminders
            SET category_id = found_category_id
            WHERE id = bill_record.id;

            mapped_count := mapped_count + 1;
        ELSE
            unmapped_count := unmapped_count + 1;
        END IF;
    END LOOP;

    RAISE NOTICE 'bill_reminders: Mapped % records, % unmapped', mapped_count, unmapped_count;
END $$;

-- Mark legacy column as deprecated
COMMENT ON COLUMN bill_reminders.category IS 'DEPRECATED: Use category_id instead. Kept for backwards compatibility.';
COMMENT ON COLUMN bill_reminders.category_id IS 'Foreign key to expense_categories table.';

-- =====================================================
-- 2. RECURRING_TRANSACTIONS TABLE
-- =====================================================

-- Add category_id column (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recurring_transactions') THEN
        -- Add category_id column
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'recurring_transactions' AND column_name = 'category_id'
        ) THEN
            ALTER TABLE recurring_transactions
            ADD COLUMN category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL;

            CREATE INDEX IF NOT EXISTS idx_recurring_transactions_category_id ON recurring_transactions(category_id);

            RAISE NOTICE 'Added category_id column to recurring_transactions';
        END IF;
    END IF;
END $$;

-- Backfill recurring_transactions category_id
DO $$
DECLARE
    rec_record RECORD;
    found_category_id UUID;
    mapped_count INTEGER := 0;
BEGIN
    -- Check if table and column exist
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'recurring_transactions' AND column_name = 'category'
    ) THEN
        FOR rec_record IN
            SELECT id, user_id, category
            FROM recurring_transactions
            WHERE category IS NOT NULL AND category_id IS NULL
        LOOP
            -- Try exact slug match
            SELECT ec.id INTO found_category_id
            FROM expense_categories ec
            WHERE ec.user_id = rec_record.user_id
              AND ec.slug = rec_record.category
              AND ec.is_active = TRUE
            LIMIT 1;

            -- Fallback mappings
            IF found_category_id IS NULL THEN
                SELECT ec.id INTO found_category_id
                FROM expense_categories ec
                WHERE ec.user_id = rec_record.user_id
                  AND (
                    LOWER(ec.slug) LIKE '%' || LOWER(rec_record.category) || '%'
                    OR LOWER(ec.name) LIKE '%' || LOWER(rec_record.category) || '%'
                  )
                  AND ec.is_active = TRUE
                LIMIT 1;
            END IF;

            -- Default to uncategorized
            IF found_category_id IS NULL THEN
                SELECT ec.id INTO found_category_id
                FROM expense_categories ec
                WHERE ec.user_id = rec_record.user_id
                  AND ec.slug = 'uncategorized'
                  AND ec.is_active = TRUE
                LIMIT 1;
            END IF;

            IF found_category_id IS NOT NULL THEN
                UPDATE recurring_transactions
                SET category_id = found_category_id
                WHERE id = rec_record.id;

                mapped_count := mapped_count + 1;
            END IF;
        END LOOP;

        RAISE NOTICE 'recurring_transactions: Mapped % records', mapped_count;
    END IF;
END $$;

-- Mark legacy column as deprecated (if exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'recurring_transactions' AND column_name = 'category'
    ) THEN
        COMMENT ON COLUMN recurring_transactions.category IS 'DEPRECATED: Use category_id instead.';
    END IF;
END $$;

-- =====================================================
-- 3. SYSTEM CATEGORIES FOR SPECIAL TRANSACTIONS
-- =====================================================
-- Create system categories for lending, repayment, bad debt etc.
-- These are system-level categories not tied to a specific user

-- Note: The expense_categories table is per-user, so system categories
-- need to be created for each user. This is handled by the category seeding.

-- =====================================================
-- Verification queries
-- =====================================================
-- Check bill_reminders migration:
-- SELECT COUNT(*) as total, COUNT(category_id) as with_category_id FROM bill_reminders;

-- Check recurring_transactions migration:
-- SELECT COUNT(*) as total, COUNT(category_id) as with_category_id FROM recurring_transactions;
