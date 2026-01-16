-- =====================================================
-- Migration: Expanded Kenya-Optimized Categories (Clean Slate)
-- Purpose: Replace category system with 20 parents + 150+ subcategories
-- Dependencies: 024_unified_category_system.sql
-- =====================================================

-- =====================================================
-- PHASE 1: CLEAN SLATE - Remove existing data
-- =====================================================

-- 1.1 Remove foreign key constraints temporarily
-- Drop budgets (they reference old categories)
DELETE FROM budgets;

-- 1.2 Clear category references in transactions
UPDATE account_transactions SET category_id = NULL WHERE category_id IS NOT NULL;
UPDATE expenses SET category_id = NULL WHERE category_id IS NOT NULL;

-- 1.3 Clear categorization rules and overrides
DELETE FROM categorization_rules;
DELETE FROM category_overrides;
DELETE FROM categorization_audit_log;

-- 1.4 Delete all existing categories
DELETE FROM expense_categories;

-- =====================================================
-- PHASE 2: Create new comprehensive category function
-- =====================================================

-- Drop existing function and recreate with new categories
DROP FUNCTION IF EXISTS create_default_categories_for_user(UUID);

CREATE OR REPLACE FUNCTION create_default_categories_for_user(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_parent_id UUID;
BEGIN
    -- =========================================================
    -- PARENT CATEGORY 1: HOUSING
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'housing', 'Housing', 'Rent, mortgage, home maintenance', '#FF6B6B', 'home', NULL, TRUE, TRUE, 1)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'housing';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'rent-mortgage', 'Rent or Mortgage Payments', 'Monthly rent or mortgage payments', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'property-taxes', 'Property Taxes and Rates', 'Property tax payments', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'home-maintenance', 'Home Maintenance and Repairs', 'Plumbing, roofing, painting', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'home-insurance', 'Home Insurance', 'Homeowner or renters insurance', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'furnishings', 'Furnishings and Decor', 'Furniture, curtains, appliances', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'cleaning-services', 'Cleaning Supplies and Services', 'Detergents, domestic help wages', v_parent_id, TRUE, TRUE, 6),
            (p_user_id, 'security-services', 'Security Services', 'Guards, alarms, CCTV', v_parent_id, TRUE, TRUE, 7),
            (p_user_id, 'gardening', 'Gardening and Landscaping', 'Garden maintenance', v_parent_id, TRUE, TRUE, 8),
            (p_user_id, 'moving-expenses', 'Moving Expenses', 'Relocation costs', v_parent_id, TRUE, TRUE, 9)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 2: UTILITIES
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'utilities', 'Utilities', 'Electricity, water, internet, phone', '#F38181', 'zap', NULL, TRUE, TRUE, 2)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'utilities';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'electricity', 'Electricity', 'Kenya Power bills, solar setup costs', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'water-sewerage', 'Water and Sewerage', 'County water board bills', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'gas-cooking-fuel', 'Gas and Cooking Fuel', 'LPG cylinders, charcoal, firewood, kerosene', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'internet-broadband', 'Internet and Broadband', 'Safaricom, Zuku, Jamii Telecom', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'mobile-data', 'Mobile Phone and Data Bundles', 'Airtime, SMS packs, M-Pesa fees', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'landline', 'Landline Phone', 'Fixed line telephone', v_parent_id, TRUE, TRUE, 6),
            (p_user_id, 'cable-tv', 'Cable TV or Satellite', 'DStv, GOtv subscriptions', v_parent_id, TRUE, TRUE, 7),
            (p_user_id, 'waste-management', 'Waste Management', 'Garbage collection', v_parent_id, TRUE, TRUE, 8),
            (p_user_id, 'generator', 'Generator Fuel and Maintenance', 'Backup power costs', v_parent_id, TRUE, TRUE, 9)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 3: TRANSPORTATION
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'transportation', 'Transportation', 'Fuel, public transport, vehicle costs', '#4ECDC4', 'car', NULL, TRUE, TRUE, 3)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'transportation';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'fuel', 'Fuel/Petrol/Diesel', 'Personal vehicle fuel', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'public-transport', 'Public Transport Fares', 'Matatu, bus, SGR train, boda-boda', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'vehicle-purchase', 'Vehicle Purchase or Lease', 'Car payments', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'vehicle-maintenance', 'Vehicle Maintenance and Repairs', 'Servicing, tires, oil changes', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'parking', 'Parking Fees', 'Parking charges', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'toll-roads', 'Toll Roads', 'Nairobi Expressway', v_parent_id, TRUE, TRUE, 6),
            (p_user_id, 'vehicle-insurance', 'Vehicle Insurance', 'Car insurance premiums', v_parent_id, TRUE, TRUE, 7),
            (p_user_id, 'ride-hailing', 'Ride-Hailing Services', 'Uber, Bolt, Little Cab', v_parent_id, TRUE, TRUE, 8),
            (p_user_id, 'bicycle-scooter', 'Bicycle or Scooter Maintenance', 'Two-wheeler costs', v_parent_id, TRUE, TRUE, 9),
            (p_user_id, 'air-travel', 'Air Travel', 'Domestic flights - Kenya Airways, Jambojet', v_parent_id, TRUE, TRUE, 10),
            (p_user_id, 'ferry-boat', 'Ferry or Boat Transport', 'Coastal areas like Mombasa', v_parent_id, TRUE, TRUE, 11),
            (p_user_id, 'driving-lessons', 'Driving Lessons or License', 'Driving school, license renewals', v_parent_id, TRUE, TRUE, 12)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 4: FOOD AND GROCERIES
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'food-groceries', 'Food and Groceries', 'Groceries, dining, takeaway', '#95E1D3', 'utensils', NULL, TRUE, TRUE, 4)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'food-groceries';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'groceries', 'Groceries', 'Maize flour, rice, vegetables from markets', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'fresh-produce', 'Fresh Produce', 'Fruits, vegetables, meat, fish from butcheries', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'dairy-eggs', 'Dairy and Eggs', 'Milk, cheese, eggs', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'beverages', 'Beverages', 'Tea, coffee, soda, bottled water', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'alcohol-tobacco', 'Alcohol and Tobacco', 'Alcoholic beverages, cigarettes', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'snacks', 'Snacks and Confectionery', 'Snacks, sweets, chocolates', v_parent_id, TRUE, TRUE, 6),
            (p_user_id, 'dining-out', 'Dining Out', 'Restaurants, nyama choma joints, KFC', v_parent_id, TRUE, TRUE, 7),
            (p_user_id, 'takeaway-delivery', 'Takeaway and Food Delivery', 'Glovo, Uber Eats, Jumia Food', v_parent_id, TRUE, TRUE, 8),
            (p_user_id, 'baking-ingredients', 'Baking and Cooking Ingredients', 'Flour, sugar, spices', v_parent_id, TRUE, TRUE, 9),
            (p_user_id, 'dietary-supplements', 'Dietary Supplements', 'Vitamins, special foods, organic', v_parent_id, TRUE, TRUE, 10),
            (p_user_id, 'pet-food', 'Pet Food', 'Food for pets', v_parent_id, TRUE, TRUE, 11)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 5: HEALTHCARE
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'healthcare', 'Healthcare', 'Medical bills, insurance, pharmacy', '#EF4444', 'heart-pulse', NULL, TRUE, TRUE, 5)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'healthcare';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'doctor-consultations', 'Doctor Consultations', 'Doctor and clinic visits', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'hospital', 'Hospital Admissions', 'Hospital stays and procedures', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'medications', 'Medications and Prescriptions', 'Over-the-counter drugs, antibiotics', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'health-insurance', 'Health Insurance Premiums', 'NHIF contributions, Jubilee, AAR', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'dental', 'Dental Care', 'Check-ups, fillings, braces', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'optical', 'Optical Care', 'Eye exams, glasses, contact lenses', v_parent_id, TRUE, TRUE, 6),
            (p_user_id, 'alternative-medicine', 'Alternative Medicine', 'Herbal remedies, acupuncture', v_parent_id, TRUE, TRUE, 7),
            (p_user_id, 'vaccinations', 'Vaccinations and Immunizations', 'Vaccines and shots', v_parent_id, TRUE, TRUE, 8),
            (p_user_id, 'mental-health', 'Mental Health Services', 'Counseling, therapy', v_parent_id, TRUE, TRUE, 9),
            (p_user_id, 'medical-devices', 'Medical Devices', 'Blood pressure monitors, glucometers', v_parent_id, TRUE, TRUE, 10),
            (p_user_id, 'lab-tests', 'Laboratory Tests', 'Blood tests, diagnostics', v_parent_id, TRUE, TRUE, 11),
            (p_user_id, 'ambulance', 'Ambulance or Emergency', 'Emergency medical services', v_parent_id, TRUE, TRUE, 12),
            (p_user_id, 'reproductive-health', 'Reproductive Health', 'Family planning, maternity care', v_parent_id, TRUE, TRUE, 13)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 6: EDUCATION
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'education', 'Education', 'School fees, books, courses', '#FFD3B6', 'graduation-cap', NULL, TRUE, TRUE, 6)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'education';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'school-fees', 'School Fees and Tuition', 'Primary, secondary, university (UoN, JKUAT)', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'books-textbooks', 'Books and Textbooks', 'Educational books', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'stationery', 'Stationery and Supplies', 'Pens, notebooks, calculators', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'uniforms', 'Uniforms and School Attire', 'School uniforms', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'extracurricular', 'Extracurricular Activities', 'Sports, music lessons, clubs', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'tutoring', 'Tutoring or Private Lessons', 'Extra tuition', v_parent_id, TRUE, TRUE, 6),
            (p_user_id, 'exam-fees', 'Exam Fees', 'KCPE, KCSE, university entrance', v_parent_id, TRUE, TRUE, 7),
            (p_user_id, 'school-transport', 'School Transport', 'School bus fees', v_parent_id, TRUE, TRUE, 8),
            (p_user_id, 'educational-tech', 'Educational Technology', 'Laptops, tablets for e-learning', v_parent_id, TRUE, TRUE, 9),
            (p_user_id, 'scholarships', 'Scholarships or Bursary Applications', 'Administrative costs', v_parent_id, TRUE, TRUE, 10),
            (p_user_id, 'vocational-training', 'Vocational Training', 'TVET courses', v_parent_id, TRUE, TRUE, 11),
            (p_user_id, 'online-courses', 'Online Courses and Certifications', 'Coursera, Udemy', v_parent_id, TRUE, TRUE, 12)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 7: ENTERTAINMENT AND LEISURE
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'entertainment', 'Entertainment and Leisure', 'Subscriptions, events, hobbies', '#FCBAD3', 'film', NULL, TRUE, TRUE, 7)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'entertainment';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'streaming', 'Streaming Subscriptions', 'Netflix, Showmax, YouTube Premium', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'cinema', 'Cinema and Movie Tickets', 'Movie theaters', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'music-concerts', 'Music and Concerts', 'Festivals like Blankets & Wine', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'books-magazines', 'Books, Magazines, Newspapers', 'Daily Nation, e-books', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'hobbies-crafts', 'Hobbies and Crafts', 'Painting supplies, knitting', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'sports-gym', 'Sports and Gym Memberships', 'Fitness classes, football kits', v_parent_id, TRUE, TRUE, 6),
            (p_user_id, 'travel-vacations', 'Travel and Vacations', 'Domestic tourism - Maasai Mara, coast', v_parent_id, TRUE, TRUE, 7),
            (p_user_id, 'gaming', 'Gaming', 'Video games, consoles, mobile games', v_parent_id, TRUE, TRUE, 8),
            (p_user_id, 'social-events', 'Social Events', 'Weddings, parties, club entry', v_parent_id, TRUE, TRUE, 9),
            (p_user_id, 'cultural-activities', 'Cultural Activities', 'Museum visits, theater', v_parent_id, TRUE, TRUE, 10),
            (p_user_id, 'betting-lotteries', 'Betting and Lotteries', 'SportPesa, lotteries', v_parent_id, TRUE, TRUE, 11),
            (p_user_id, 'outdoor-activities', 'Outdoor Activities', 'Hiking gear, national park fees', v_parent_id, TRUE, TRUE, 12)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 8: PERSONAL CARE
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'personal-care', 'Personal Care', 'Grooming, hygiene, wellness', '#FCA5A5', 'scissors', NULL, TRUE, TRUE, 8)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'personal-care';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'haircuts-salon', 'Haircuts, Salon, and Barber', 'Hair services', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'cosmetics', 'Cosmetics and Makeup', 'Beauty products', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'skincare', 'Skincare Products', 'Lotions, soaps', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'hygiene-products', 'Hygiene Products', 'Toothpaste, sanitary pads, deodorants', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'fitness-classes', 'Gym or Fitness Classes', 'Beyond membership fees', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'spa-wellness', 'Spa, Massage, Wellness', 'Spa treatments', v_parent_id, TRUE, TRUE, 6),
            (p_user_id, 'tattoos-piercings', 'Tattoos or Piercings', 'Body art', v_parent_id, TRUE, TRUE, 7),
            (p_user_id, 'weight-loss', 'Weight Loss Programs', 'Diet supplements', v_parent_id, TRUE, TRUE, 8),
            (p_user_id, 'fragrances', 'Fragrances and Perfumes', 'Perfumes, colognes', v_parent_id, TRUE, TRUE, 9)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 9: CLOTHING AND ACCESSORIES
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'clothing', 'Clothing and Accessories', 'Clothes, shoes, accessories', '#67E8F9', 'shirt', NULL, TRUE, TRUE, 9)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'clothing';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'everyday-clothing', 'Everyday Clothing', 'Shirts, pants, dresses', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'work-attire', 'Work or Professional Attire', 'Office wear', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'shoes', 'Shoes and Footwear', 'All types of footwear', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'underwear', 'Underwear and Lingerie', 'Undergarments', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'jewelry-watches', 'Jewelry and Watches', 'Accessories', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'bags-accessories', 'Bags and Accessories', 'Wallets, belts, bags', v_parent_id, TRUE, TRUE, 6),
            (p_user_id, 'sportswear', 'Sportswear and Activewear', 'Gym clothes', v_parent_id, TRUE, TRUE, 7),
            (p_user_id, 'laundry-cleaning', 'Laundry and Dry Cleaning', 'Cleaning services', v_parent_id, TRUE, TRUE, 8),
            (p_user_id, 'tailoring', 'Tailoring and Alterations', 'Custom fitting', v_parent_id, TRUE, TRUE, 9),
            (p_user_id, 'seasonal-clothing', 'Seasonal Clothing', 'Raincoats for rainy season', v_parent_id, TRUE, TRUE, 10)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 10: HOUSEHOLD SUPPLIES
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'household-supplies', 'Household Supplies', 'Home supplies and cleaning', '#84CC16', 'spray-can', NULL, TRUE, TRUE, 10)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'household-supplies';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'cleaning-products', 'Cleaning Products', 'Disinfectants, brooms', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'kitchen-utensils', 'Kitchen Utensils and Cookware', 'Pots, pans, utensils', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'toiletries', 'Toiletries', 'Toilet paper, tissues', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'bedding-linens', 'Bedding and Linens', 'Sheets, pillows, blankets', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'appliance-repairs', 'Appliances Repairs or Replacements', 'Fridge, stove repairs', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'pest-control', 'Pest Control', 'Insecticides for mosquitoes', v_parent_id, TRUE, TRUE, 6),
            (p_user_id, 'home-organization', 'Home Organization', 'Storage boxes, organizers', v_parent_id, TRUE, TRUE, 7),
            (p_user_id, 'batteries-bulbs', 'Batteries and Light Bulbs', 'Electrical supplies', v_parent_id, TRUE, TRUE, 8)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 11: ELECTRONICS AND GADGETS
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'electronics', 'Electronics and Gadgets', 'Devices and tech', '#0EA5E9', 'smartphone', NULL, TRUE, TRUE, 11)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'electronics';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'device-purchases', 'Device Purchases', 'Smartphones, laptops, TVs', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'accessories', 'Accessories', 'Chargers, cases, headphones', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'repairs-maintenance', 'Repairs and Maintenance', 'Device repairs', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'software-subscriptions', 'Software Subscriptions', 'Antivirus, apps', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'printing-scanning', 'Printing and Scanning', 'Print services', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'home-entertainment', 'Home Entertainment Systems', 'Speakers, home theater', v_parent_id, TRUE, TRUE, 6)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 12: FINANCIAL OBLIGATIONS
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'financial', 'Financial Obligations', 'Savings, investments, bank fees', '#C7CEEA', 'landmark', NULL, TRUE, TRUE, 12)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'financial';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'savings-deposits', 'Savings Deposits', 'Money saved', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'investments', 'Investments', 'Stocks via NSE, Sacco contributions, Treasury bills', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'bank-fees', 'Bank Fees and Charges', 'ATM withdrawals, account maintenance', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'loan-repayments', 'Loan Repayments', 'Personal loans, HELB student loans', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'credit-card', 'Credit Card Payments', 'Credit card bills', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'retirement', 'Retirement Contributions', 'NSSF, pension funds', v_parent_id, TRUE, TRUE, 6),
            (p_user_id, 'financial-advisory', 'Financial Advisory Services', 'Financial planning', v_parent_id, TRUE, TRUE, 7),
            (p_user_id, 'currency-exchange', 'Currency Exchange Fees', 'Forex fees', v_parent_id, TRUE, TRUE, 8)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 13: INSURANCE
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'insurance', 'Insurance', 'Insurance premiums', '#6366F1', 'shield-check', NULL, TRUE, TRUE, 13)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'insurance';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'health-insurance-premium', 'Health Insurance Premium', 'Beyond NHIF - private cover', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'life-insurance', 'Life Insurance', 'Life cover premiums', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'vehicle-insurance-premium', 'Auto Insurance Premium', 'Comprehensive or third-party', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'home-renters-insurance', 'Home or Renters Insurance', 'Property insurance', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'travel-insurance', 'Travel Insurance', 'Trip coverage', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'business-insurance', 'Business Insurance', 'For self-employed', v_parent_id, TRUE, TRUE, 6),
            (p_user_id, 'disability-insurance', 'Disability Insurance', 'Disability cover', v_parent_id, TRUE, TRUE, 7)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 14: TAXES AND GOVERNMENT FEES
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'taxes', 'Taxes and Government Fees', 'Tax obligations', '#DC2626', 'receipt', NULL, TRUE, TRUE, 14)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'taxes';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'income-tax', 'Income Tax (PAYE)', 'Pay As You Earn', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'vat', 'Value Added Tax (VAT)', 'VAT on purchases', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'property-tax', 'Property Taxes', 'Land and property rates', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'business-licenses', 'Business Licenses and Permits', 'Business registration', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'vehicle-registration', 'Vehicle Registration and Road Tax', 'NTSA fees', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'import-duties', 'Import Duties', 'For personal imports', v_parent_id, TRUE, TRUE, 6),
            (p_user_id, 'fines-penalties', 'Fines and Penalties', 'Traffic fines, penalties', v_parent_id, TRUE, TRUE, 7)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 15: GIFTS, DONATIONS, AND CONTRIBUTIONS
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'gifts-donations', 'Gifts, Donations, and Contributions', 'Giving and support', '#FFB6C1', 'gift', NULL, TRUE, TRUE, 15)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'gifts-donations';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'birthday-gifts', 'Birthday Gifts', 'Birthday presents', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'holiday-gifts', 'Holiday and Festival Gifts', 'Christmas, Eid gifts', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'wedding-dowry', 'Wedding or Dowry Contributions', 'Marriage contributions', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'charity', 'Charity Donations', 'Charitable giving', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'tithes-offerings', 'Religious Tithes and Offerings', 'Church/mosque contributions', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'harambee', 'Harambee or Fundraising', 'Community fundraising', v_parent_id, TRUE, TRUE, 6),
            (p_user_id, 'family-support', 'Family Support', 'Remittances to relatives', v_parent_id, TRUE, TRUE, 7),
            (p_user_id, 'chama', 'Chama or Merry-Go-Round', 'Informal savings groups', v_parent_id, TRUE, TRUE, 8)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 16: CHILDCARE AND FAMILY
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'childcare-family', 'Childcare and Family', 'Family care expenses', '#F472B6', 'baby', NULL, TRUE, TRUE, 16)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'childcare-family';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'babysitting-nanny', 'Babysitting or Nanny Wages', 'Childcare services', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'daycare-preschool', 'Daycare or Preschool Fees', 'Early childhood care', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'childrens-toys', 'Children''s Toys and Games', 'Kids entertainment', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'baby-supplies', 'Baby Supplies', 'Diapers, formula', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'family-planning', 'Family Planning Products', 'Contraceptives', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'elderly-care', 'Elderly Care', 'Nursing home fees, home aides', v_parent_id, TRUE, TRUE, 6)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 17: PETS AND ANIMALS
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'pets', 'Pets and Animals', 'Pet-related expenses', '#A78BFA', 'paw-print', NULL, TRUE, TRUE, 17)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'pets';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'pet-food-treats', 'Pet Food and Treats', 'Animal food', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'veterinary', 'Veterinary Care and Vaccinations', 'Vet visits', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'pet-grooming', 'Grooming and Supplies', 'Leashes, beds, grooming', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'pet-insurance', 'Pet Insurance', 'Animal insurance', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'pet-boarding', 'Boarding or Kennel Services', 'Pet sitting', v_parent_id, TRUE, TRUE, 5)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 18: BUSINESS AND PROFESSIONAL
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'business', 'Business and Professional', 'Business expenses', '#87CEEB', 'briefcase', NULL, TRUE, TRUE, 18)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'business';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'office-supplies', 'Office Supplies', 'Paper, ink, stationery', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'marketing', 'Marketing and Advertising', 'Social media ads, promotions', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'professional-development', 'Professional Development', 'Conferences, certifications', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'business-travel', 'Business Travel', 'Work-related travel', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'equipment-tools', 'Equipment and Tools', 'Business equipment', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'legal-fees', 'Legal Fees', 'Contracts, trademarks', v_parent_id, TRUE, TRUE, 6),
            (p_user_id, 'accounting', 'Accounting and Bookkeeping', 'Financial services', v_parent_id, TRUE, TRUE, 7)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 19: MISCELLANEOUS
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'miscellaneous', 'Miscellaneous', 'Other and uncategorized expenses', '#B4B4B8', 'help-circle', NULL, TRUE, TRUE, 19)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'miscellaneous';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'subscriptions-other', 'Subscriptions', 'Magazines, apps not covered elsewhere', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'fees-fines', 'Fees and Fines', 'Overdue charges, penalties', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'postage-shipping', 'Postage and Shipping', 'Mail and delivery costs', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'storage-rentals', 'Storage Unit Rentals', 'Storage facilities', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'emergency-funds', 'Emergency Funds', 'Unplanned expenses', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'lottery-gambling', 'Lottery or Gambling', 'If minimal', v_parent_id, TRUE, TRUE, 6),
            (p_user_id, 'cultural-traditional', 'Cultural or Traditional Expenses', 'Initiation rites, customs', v_parent_id, TRUE, TRUE, 7),
            (p_user_id, 'environmental', 'Environmental Initiatives', 'Recycling fees, eco-products', v_parent_id, TRUE, TRUE, 8)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PHASE 3: Seed categories for all existing users
-- =====================================================

DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM auth.users LOOP
        PERFORM create_default_categories_for_user(user_record.id);
        RAISE NOTICE 'Created categories for user %', user_record.id;
    END LOOP;
END $$;

-- =====================================================
-- PHASE 4: Update trigger for new users
-- =====================================================

-- Drop existing triggers first
DROP TRIGGER IF EXISTS on_user_created_create_categories ON auth.users;

-- Recreate trigger function
CREATE OR REPLACE FUNCTION trigger_create_default_categories()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM create_default_categories_for_user(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER on_user_created_create_categories
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_default_categories();

-- =====================================================
-- PHASE 5: Update get_budgetable_categories function
-- =====================================================

-- Drop existing function first (signature may have changed)
DROP FUNCTION IF EXISTS get_budgetable_categories(uuid);

-- Update the function to return all budgetable categories
CREATE OR REPLACE FUNCTION get_budgetable_categories(p_user_id UUID)
RETURNS TABLE (
  category_id UUID,
  category_slug VARCHAR(100),
  category_name VARCHAR(255),
  parent_id UUID,
  parent_name VARCHAR(255),
  parent_slug VARCHAR(100),
  is_subcategory BOOLEAN,
  color VARCHAR(7),
  icon VARCHAR(50)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ec.id AS category_id,
    ec.slug AS category_slug,
    ec.name AS category_name,
    ec.parent_category_id AS parent_id,
    parent.name AS parent_name,
    parent.slug AS parent_slug,
    (ec.parent_category_id IS NOT NULL) AS is_subcategory,
    COALESCE(ec.color, parent.color) AS color,
    COALESCE(ec.icon, parent.icon) AS icon
  FROM expense_categories ec
  LEFT JOIN expense_categories parent ON ec.parent_category_id = parent.id
  WHERE ec.user_id = p_user_id
    AND ec.is_active = TRUE
    AND ec.parent_category_id IS NOT NULL  -- Only subcategories are budgetable
  ORDER BY
    parent.display_order,
    ec.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Summary:
-- 1. Deleted all existing budgets, category references, and categories
-- 2. Created 19 parent categories with 140+ subcategories
-- 3. Seeded categories for all existing users
-- 4. Updated new user trigger
-- 5. Updated get_budgetable_categories function
-- =====================================================
