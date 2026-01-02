-- =====================================================
-- Migration: Unified Category System
-- Purpose: Centralized category management with auto-categorization rules
-- Dependencies: account_transactions table
-- =====================================================

-- =====================================================
-- 1. EXPENSE CATEGORIES TABLE (Centralized)
-- =====================================================
CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL, -- URL-friendly identifier
    description TEXT,
    color VARCHAR(7), -- Hex color code (#RRGGBB)
    icon VARCHAR(50), -- Icon identifier
    parent_category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL, -- For hierarchical categories
    is_system BOOLEAN DEFAULT FALSE, -- System categories cannot be deleted
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure category names are unique per user
    CONSTRAINT unique_user_category_name UNIQUE (user_id, name),
    CONSTRAINT unique_user_category_slug UNIQUE (user_id, slug)
);

-- Index for faster lookups
CREATE INDEX idx_expense_categories_user_id ON expense_categories(user_id);
CREATE INDEX idx_expense_categories_slug ON expense_categories(user_id, slug);
CREATE INDEX idx_expense_categories_parent ON expense_categories(parent_category_id);

-- =====================================================
-- 2. CATEGORIZATION RULES TABLE
-- Purpose: Store auto-categorization rules in priority order
-- =====================================================
CREATE TABLE IF NOT EXISTS categorization_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES expense_categories(id) ON DELETE CASCADE,

    -- Rule Type (determines evaluation order)
    rule_type VARCHAR(50) NOT NULL, -- 'merchant', 'paybill', 'keyword', 'account_fallback'

    -- Pattern Matching
    pattern TEXT NOT NULL, -- Text pattern to match (case-insensitive)
    match_field VARCHAR(50), -- Which field to match: 'description', 'counterparty', 'paybill_number', etc.

    -- Conditions
    min_amount DECIMAL(12, 2), -- Optional: only match if amount >= this
    max_amount DECIMAL(12, 2), -- Optional: only match if amount <= this
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE, -- Optional: only match for specific account

    -- Metadata
    priority INTEGER DEFAULT 0, -- Higher priority rules evaluated first within same rule_type
    is_active BOOLEAN DEFAULT TRUE,
    confidence_score DECIMAL(3, 2) DEFAULT 1.0, -- How confident is this rule (0.0-1.0)

    -- Audit
    times_matched INTEGER DEFAULT 0, -- Track usage for analytics
    last_matched_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Validation
    CONSTRAINT valid_rule_type CHECK (rule_type IN ('merchant', 'paybill', 'keyword', 'account_fallback')),
    CONSTRAINT valid_match_field CHECK (match_field IN ('description', 'counterparty', 'paybill_number', 'account_name', 'notes')),
    CONSTRAINT valid_confidence CHECK (confidence_score BETWEEN 0.0 AND 1.0),
    CONSTRAINT valid_amount_range CHECK (min_amount IS NULL OR max_amount IS NULL OR min_amount <= max_amount)
);

-- Indexes for fast rule matching
CREATE INDEX idx_categorization_rules_user_id ON categorization_rules(user_id);
CREATE INDEX idx_categorization_rules_type ON categorization_rules(rule_type, priority DESC);
CREATE INDEX idx_categorization_rules_category ON categorization_rules(category_id);
CREATE INDEX idx_categorization_rules_pattern ON categorization_rules(pattern);
CREATE INDEX idx_categorization_rules_active ON categorization_rules(is_active) WHERE is_active = TRUE;

-- =====================================================
-- 3. CATEGORY OVERRIDES TABLE
-- Purpose: User manual category assignments that persist
-- =====================================================
CREATE TABLE IF NOT EXISTS category_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES account_transactions(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES expense_categories(id) ON DELETE CASCADE,

    -- Override Metadata
    override_reason VARCHAR(100), -- 'manual', 'correction', 'learned_from_similar'
    previous_category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL, -- What it was before
    confidence_score DECIMAL(3, 2) DEFAULT 1.0, -- User overrides = 1.0, learned = lower

    -- Learning: Create rule from this override?
    create_rule BOOLEAN DEFAULT FALSE, -- If true, create a categorization_rule from this pattern

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Each transaction can only have ONE override
    CONSTRAINT unique_transaction_override UNIQUE (transaction_id)
);

-- Indexes for override lookups
CREATE INDEX idx_category_overrides_user_id ON category_overrides(user_id);
CREATE INDEX idx_category_overrides_transaction ON category_overrides(transaction_id);
CREATE INDEX idx_category_overrides_category ON category_overrides(category_id);

-- =====================================================
-- 4. CATEGORIZATION AUDIT LOG TABLE
-- Purpose: Track why each transaction was categorized a certain way (explainability)
-- =====================================================
CREATE TABLE IF NOT EXISTS categorization_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES account_transactions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,

    -- Explanation
    categorization_method VARCHAR(50) NOT NULL, -- 'system_type', 'transfer_detection', 'fee_detection', 'merchant_match', 'keyword_match', 'account_fallback', 'user_override', 'uncategorized'
    rule_id UUID REFERENCES categorization_rules(id) ON DELETE SET NULL, -- Which rule was matched (if any)
    override_id UUID REFERENCES category_overrides(id) ON DELETE SET NULL, -- Which override was applied (if any)
    confidence_score DECIMAL(3, 2) DEFAULT 1.0,

    -- Detailed explanation for UI display
    explanation TEXT, -- E.g., "Matched merchant pattern 'Safaricom' → Airtime"

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_categorization_method CHECK (
        categorization_method IN (
            'system_type', 'transfer_detection', 'fee_detection',
            'merchant_match', 'paybill_match', 'keyword_match',
            'account_fallback', 'user_override', 'uncategorized'
        )
    )
);

-- Indexes for audit queries
CREATE INDEX idx_categorization_audit_transaction ON categorization_audit_log(transaction_id);
CREATE INDEX idx_categorization_audit_user ON categorization_audit_log(user_id);
CREATE INDEX idx_categorization_audit_method ON categorization_audit_log(categorization_method);
CREATE INDEX idx_categorization_audit_created ON categorization_audit_log(created_at DESC);

-- =====================================================
-- 5. DEFAULT CATEGORIES SEED DATA
-- Purpose: Insert default expense categories for all existing users
-- =====================================================

-- Function to create default hierarchical categories for a user
CREATE OR REPLACE FUNCTION create_default_categories_for_user(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_parent_id UUID;
    -- Parent categories (Kenya-optimized from canonical spec)
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
        ARRAY['insurance', 'Insurance', 'Health insurance premiums', 'health', '2'],
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
    subcat_data TEXT[];
BEGIN
    -- Step 1: Create parent categories
    FOREACH parent_data SLICE 1 IN ARRAY parent_categories
    LOOP
        INSERT INTO expense_categories (
            user_id, slug, name, description, color, icon,
            parent_category_id, is_system, is_active, display_order
        )
        VALUES (
            p_user_id,
            parent_data[1], -- slug
            parent_data[2], -- name
            parent_data[3], -- description
            parent_data[4], -- color
            parent_data[5], -- icon
            NULL,           -- parent_category_id (these are parents)
            TRUE,           -- is_system
            TRUE,           -- is_active
            parent_data[6]::INTEGER -- display_order
        )
        ON CONFLICT (user_id, slug) DO NOTHING;
    END LOOP;

    -- Step 2: Create subcategories
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

-- Create default categories for all existing users
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM auth.users LOOP
        PERFORM create_default_categories_for_user(user_record.id);
    END LOOP;
END $$;

-- =====================================================
-- 6. TRIGGER: Auto-create default categories for new users
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_create_default_categories()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM create_default_categories_for_user(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_user_created_create_categories
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_default_categories();

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Function to get category ID by slug for a user
CREATE OR REPLACE FUNCTION get_category_id(p_user_id UUID, p_slug VARCHAR)
RETURNS UUID AS $$
DECLARE
    v_category_id UUID;
BEGIN
    SELECT id INTO v_category_id
    FROM expense_categories
    WHERE user_id = p_user_id AND slug = p_slug AND is_active = TRUE
    LIMIT 1;

    RETURN v_category_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get category name by ID
CREATE OR REPLACE FUNCTION get_category_name(p_category_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_name VARCHAR;
BEGIN
    SELECT name INTO v_name
    FROM expense_categories
    WHERE id = p_category_id
    LIMIT 1;

    RETURN v_name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. UPDATED_AT TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_expense_categories_updated_at
    BEFORE UPDATE ON expense_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categorization_rules_updated_at
    BEFORE UPDATE ON categorization_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_category_overrides_updated_at
    BEFORE UPDATE ON category_overrides
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next Steps:
-- 1. Build auto-categorization service (categorizationEngine.js)
-- 2. Update expenseService.js to use category_id instead of category string
-- 3. Update Budget.jsx to read from account_transactions (ledger-first)
-- 4. Create category management UI
-- =====================================================
