-- =====================================================
-- Migration: Add New Subcategories
-- Purpose: Add General Shopping, Social, and Family subcategories
-- =====================================================

-- Function to add new subcategories for a user
CREATE OR REPLACE FUNCTION add_new_subcategories_for_user(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_housing_id UUID;
    v_social_id UUID;
    v_family_id UUID;
BEGIN
    -- Get Housing parent category ID
    SELECT id INTO v_housing_id
    FROM expense_categories
    WHERE user_id = p_user_id
      AND slug = 'housing'
      AND parent_category_id IS NULL
    LIMIT 1;

    -- Add General Shopping under Housing
    IF v_housing_id IS NOT NULL THEN
        INSERT INTO expense_categories (
            user_id, slug, name, description, color, icon,
            parent_category_id, is_system, is_active, display_order
        )
        VALUES (
            p_user_id,
            'general-shopping',
            'General Shopping',
            'General household shopping and purchases',
            NULL, NULL,
            v_housing_id,
            TRUE, TRUE, 4
        )
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- Create Social parent category if it doesn't exist
    INSERT INTO expense_categories (
        user_id, slug, name, description, color, icon,
        parent_category_id, is_system, is_active, display_order
    )
    VALUES (
        p_user_id,
        'social',
        'Social',
        'Social and community contributions',
        '#8B5CF6', -- Purple
        'users',
        NULL,
        TRUE, TRUE, 11
    )
    ON CONFLICT (user_id, slug) DO NOTHING;

    -- Get Social parent ID
    SELECT id INTO v_social_id
    FROM expense_categories
    WHERE user_id = p_user_id
      AND slug = 'social'
      AND parent_category_id IS NULL
    LIMIT 1;

    -- Add Social subcategories
    IF v_social_id IS NOT NULL THEN
        INSERT INTO expense_categories (
            user_id, slug, name, description, color, icon,
            parent_category_id, is_system, is_active, display_order
        )
        VALUES
            (p_user_id, 'tithing', 'Tithing', 'Church tithe and religious offerings', NULL, NULL, v_social_id, TRUE, TRUE, 1),
            (p_user_id, 'harambee', 'Harambee Contribution', 'Community fundraisers and harambees', NULL, NULL, v_social_id, TRUE, TRUE, 2),
            (p_user_id, 'donation', 'Donation', 'Charitable donations and contributions', NULL, NULL, v_social_id, TRUE, TRUE, 3)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- Create Family parent category if it doesn't exist
    INSERT INTO expense_categories (
        user_id, slug, name, description, color, icon,
        parent_category_id, is_system, is_active, display_order
    )
    VALUES (
        p_user_id,
        'family',
        'Family',
        'Family support and obligations',
        '#EC4899', -- Pink
        'heart',
        NULL,
        TRUE, TRUE, 12
    )
    ON CONFLICT (user_id, slug) DO NOTHING;

    -- Get Family parent ID
    SELECT id INTO v_family_id
    FROM expense_categories
    WHERE user_id = p_user_id
      AND slug = 'family'
      AND parent_category_id IS NULL
    LIMIT 1;

    -- Add Family subcategories
    IF v_family_id IS NOT NULL THEN
        INSERT INTO expense_categories (
            user_id, slug, name, description, color, icon,
            parent_category_id, is_system, is_active, display_order
        )
        VALUES
            (p_user_id, 'family-expense', 'Family Expense', 'General family-related expenses', NULL, NULL, v_family_id, TRUE, TRUE, 1),
            (p_user_id, 'family-support', 'Family Support', 'Support for family members', NULL, NULL, v_family_id, TRUE, TRUE, 2),
            (p_user_id, 'black-tax', 'Black Tax', 'Financial obligations to extended family', NULL, NULL, v_family_id, TRUE, TRUE, 3)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Add new subcategories for all existing users
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT DISTINCT user_id FROM expense_categories WHERE parent_category_id IS NULL LOOP
        PERFORM add_new_subcategories_for_user(user_record.user_id);
    END LOOP;
END $$;

-- Update the trigger function to include new subcategories for new users
CREATE OR REPLACE FUNCTION trigger_create_default_categories()
RETURNS TRIGGER AS $$
BEGIN
    -- First create parent categories
    PERFORM create_default_categories_for_user(NEW.id);
    -- Then add original subcategories
    PERFORM add_subcategories_for_user(NEW.id);
    -- Then add new subcategories (Social, Family, etc.)
    PERFORM add_new_subcategories_for_user(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verify results (for debugging)
-- SELECT
--     p.name as parent,
--     c.name as subcategory,
--     c.slug
-- FROM expense_categories c
-- JOIN expense_categories p ON c.parent_category_id = p.id
-- WHERE p.slug IN ('housing', 'social', 'family')
-- ORDER BY p.name, c.display_order;
