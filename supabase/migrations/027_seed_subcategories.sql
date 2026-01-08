-- =====================================================
-- Migration: Seed Subcategories
-- Purpose: Add missing subcategories to expense_categories
-- This fixes the issue where only parent categories were created
-- =====================================================

-- Function to add subcategories for a user
CREATE OR REPLACE FUNCTION add_subcategories_for_user(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_parent_id UUID;
    subcat_data TEXT[];
    -- Subcategories: [slug, name, description, parent_slug, display_order]
    subcategories TEXT[][] := ARRAY[
        -- Housing subcategories
        ARRAY['rent', 'Rent', 'Monthly rent payments', 'housing', '1'],
        ARRAY['mortgage', 'Mortgage', 'Mortgage payments', 'housing', '2'],
        ARRAY['home-maintenance', 'Home Maintenance', 'Repairs, maintenance, improvements', 'housing', '3'],

        -- Utilities subcategories
        ARRAY['electricity', 'Electricity', 'Electricity bills', 'utilities', '1'],
        ARRAY['water', 'Water', 'Water bills', 'utilities', '2'],
        ARRAY['gas', 'Gas', 'Gas bills', 'utilities', '3'],
        ARRAY['internet', 'Internet', 'Internet and WiFi', 'utilities', '4'],
        ARRAY['airtime', 'Mobile Airtime', 'Mobile airtime and data bundles', 'utilities', '5'],

        -- Food & Dining subcategories
        ARRAY['groceries', 'Groceries', 'Supermarket and grocery shopping', 'food-dining', '1'],
        ARRAY['restaurants', 'Restaurants', 'Dining out at restaurants', 'food-dining', '2'],
        ARRAY['takeout', 'Takeout', 'Food delivery and takeout', 'food-dining', '3'],

        -- Transport subcategories
        ARRAY['fuel', 'Fuel', 'Petrol, diesel, gas', 'transport', '1'],
        ARRAY['public-transport', 'Public Transport', 'Matatus, buses, trains', 'transport', '2'],
        ARRAY['ride-hailing', 'Ride Hailing', 'Uber, Bolt, Little Cab', 'transport', '3'],
        ARRAY['vehicle-maintenance', 'Vehicle Maintenance', 'Car repairs, servicing, parking', 'transport', '4'],

        -- Health subcategories
        ARRAY['medical-bills', 'Medical Bills', 'Hospital, doctor, clinic visits', 'health', '1'],
        ARRAY['health-insurance', 'Health Insurance', 'Health insurance premiums', 'health', '2'],
        ARRAY['pharmacy', 'Pharmacy', 'Medicine and prescriptions', 'health', '3'],

        -- Education subcategories
        ARRAY['school-fees', 'School Fees', 'Tuition, school fees', 'education', '1'],
        ARRAY['courses', 'Courses', 'Online courses, training', 'education', '2'],
        ARRAY['books', 'Books', 'Textbooks, educational materials', 'education', '3'],

        -- Personal subcategories
        ARRAY['clothing', 'Clothing', 'Clothes, shoes, accessories', 'personal', '1'],
        ARRAY['personal-care', 'Personal Care', 'Grooming, beauty, salon', 'personal', '2'],

        -- Entertainment subcategories
        ARRAY['subscriptions', 'Subscriptions', 'Netflix, Spotify, gym memberships', 'entertainment', '1'],
        ARRAY['events', 'Events', 'Movies, concerts, outings', 'entertainment', '2'],
        ARRAY['hobbies', 'Hobbies', 'Sports, games, recreational activities', 'entertainment', '3'],

        -- Financial subcategories
        ARRAY['bank-fees', 'Bank Fees', 'Bank charges, account fees', 'financial', '1'],
        ARRAY['transaction-charges', 'Transaction Charges', 'M-Pesa fees, transfer charges', 'financial', '2'],

        -- Family & Social subcategories
        ARRAY['gifts', 'Gifts', 'Gifts for family and friends', 'family-social', '1'],
        ARRAY['donations', 'Donations', 'Charitable donations, tithe', 'family-social', '2'],

        -- Business subcategories
        ARRAY['business-expenses', 'Business Expenses', 'Business-related costs', 'business', '1'],

        -- Miscellaneous subcategories
        ARRAY['uncategorized', 'Uncategorized', 'Expenses not yet categorized', 'miscellaneous', '1']
    ];
BEGIN
    -- Create subcategories
    FOREACH subcat_data SLICE 1 IN ARRAY subcategories
    LOOP
        -- Get parent category ID
        SELECT id INTO v_parent_id
        FROM expense_categories
        WHERE user_id = p_user_id
          AND slug = subcat_data[4] -- parent_slug
          AND parent_category_id IS NULL -- ensure it's a parent
        LIMIT 1;

        -- Only create subcategory if parent exists
        IF v_parent_id IS NOT NULL THEN
            INSERT INTO expense_categories (
                user_id, slug, name, description, color, icon,
                parent_category_id, is_system, is_active, display_order
            )
            VALUES (
                p_user_id,
                subcat_data[1], -- slug
                subcat_data[2], -- name
                subcat_data[3], -- description
                NULL,           -- inherit color from parent
                NULL,           -- inherit icon from parent
                v_parent_id,    -- parent_category_id
                TRUE,           -- is_system
                TRUE,           -- is_active
                subcat_data[5]::INTEGER -- display_order within parent
            )
            ON CONFLICT (user_id, slug) DO NOTHING;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add subcategories for all existing users
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT DISTINCT user_id FROM expense_categories WHERE parent_category_id IS NULL LOOP
        PERFORM add_subcategories_for_user(user_record.user_id);
    END LOOP;
END $$;

-- Update the trigger function to include subcategories
CREATE OR REPLACE FUNCTION trigger_create_default_categories()
RETURNS TRIGGER AS $$
BEGIN
    -- First create parent categories
    PERFORM create_default_categories_for_user(NEW.id);
    -- Then add subcategories
    PERFORM add_subcategories_for_user(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verify results (comment this out in production)
-- SELECT
--     (SELECT COUNT(*) FROM expense_categories WHERE parent_category_id IS NULL) as parents,
--     (SELECT COUNT(*) FROM expense_categories WHERE parent_category_id IS NOT NULL) as subcategories;
