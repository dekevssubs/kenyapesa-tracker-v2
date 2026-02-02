-- =====================================================
-- Migration 048: Add Family Support subcategories
-- =====================================================
-- Adds new subcategories under "Gifts, Donations, and Contributions":
--   - Home Projects (renovations, repairs for family)
--   - Farming Support (seeds, equipment, labor for family farms)
--   - Family Manpower (hired help for family tasks)
-- =====================================================

-- PHASE 1: Add subcategories for all existing users
DO $$
DECLARE
    user_record RECORD;
    v_parent_id UUID;
BEGIN
    FOR user_record IN SELECT id FROM auth.users LOOP
        -- Find the gifts-donations parent category for this user
        SELECT id INTO v_parent_id
        FROM expense_categories
        WHERE user_id = user_record.id AND slug = 'gifts-donations';

        IF v_parent_id IS NOT NULL THEN
            INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
                (user_record.id, 'home-projects', 'Home Projects', 'Renovations, repairs, building for family', v_parent_id, TRUE, TRUE, 9),
                (user_record.id, 'farming-support', 'Farming Support', 'Seeds, equipment, farm inputs for family', v_parent_id, TRUE, TRUE, 10),
                (user_record.id, 'family-manpower', 'Family Manpower', 'Hired labor and help for family tasks', v_parent_id, TRUE, TRUE, 11)
            ON CONFLICT (user_id, slug) DO NOTHING;
        END IF;
    END LOOP;
END $$;

-- PHASE 2: Update the create_default_categories_for_user function
-- so new users also get these subcategories
CREATE OR REPLACE FUNCTION create_default_categories_for_user(p_user_id UUID)
RETURNS void AS $$
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
            (p_user_id, 'rent-mortgage', 'Rent or Mortgage', 'Monthly rent or mortgage payments', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'property-tax', 'Property Taxes', 'Annual property taxes', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'home-maintenance', 'Home Maintenance and Repairs', 'Plumbing, roofing, painting', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'home-insurance', 'Home Insurance', 'Homeowner or renters insurance', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'furnishing', 'Furnishing and Decor', 'Furniture, curtains, decor items', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'security', 'Security Services', 'Guards, alarm systems, CCTV', v_parent_id, TRUE, TRUE, 6),
            (p_user_id, 'house-help', 'House Help', 'Domestic worker salary', v_parent_id, TRUE, TRUE, 7),
            (p_user_id, 'compound-maintenance', 'Compound Maintenance', 'Landscaping, garbage collection', v_parent_id, TRUE, TRUE, 8),
            (p_user_id, 'moving-costs', 'Moving Costs', 'Relocation expenses', v_parent_id, TRUE, TRUE, 9)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 2: UTILITIES
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'utilities', 'Utilities', 'Electricity, water, internet', '#4ECDC4', 'zap', NULL, TRUE, TRUE, 2)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'utilities';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'electricity', 'Electricity', 'KPLC tokens or bills', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'water-sewerage', 'Water and Sewerage', 'Water bills', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'gas-cooking', 'Gas or Cooking Fuel', 'LPG, charcoal, kerosene', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'internet-wifi', 'Internet and WiFi', 'Home internet service', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'mobile-data', 'Mobile Data', 'Phone data bundles', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'airtime', 'Airtime', 'Phone credit top-ups', v_parent_id, TRUE, TRUE, 6),
            (p_user_id, 'cable-tv', 'Cable TV', 'DSTV, StarTimes, Zuku', v_parent_id, TRUE, TRUE, 7),
            (p_user_id, 'trash-collection', 'Trash Collection', 'Garbage disposal services', v_parent_id, TRUE, TRUE, 8),
            (p_user_id, 'solar-power', 'Solar Power', 'Solar panel payments or maintenance', v_parent_id, TRUE, TRUE, 9)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 3: TRANSPORTATION
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'transportation', 'Transportation', 'Fuel, fares, vehicle costs', '#45B7D1', 'car', NULL, TRUE, TRUE, 3)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'transportation';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'fuel', 'Fuel', 'Petrol, diesel', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'public-transport', 'Public Transport', 'Matatu, bus, train fares', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'ride-hailing', 'Ride-Hailing', 'Uber, Bolt, Little', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'boda-boda', 'Boda Boda', 'Motorcycle taxi', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'vehicle-maintenance', 'Vehicle Maintenance', 'Service, repairs, oil change', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'vehicle-insurance', 'Vehicle Insurance', 'Motor vehicle insurance', v_parent_id, TRUE, TRUE, 6),
            (p_user_id, 'parking', 'Parking', 'Parking fees, county parking', v_parent_id, TRUE, TRUE, 7),
            (p_user_id, 'tolls-road-fees', 'Tolls and Road Fees', 'Expressway tolls, road charges', v_parent_id, TRUE, TRUE, 8),
            (p_user_id, 'car-wash', 'Car Wash', 'Vehicle cleaning', v_parent_id, TRUE, TRUE, 9),
            (p_user_id, 'tires-batteries', 'Tires and Batteries', 'Tire and battery replacement', v_parent_id, TRUE, TRUE, 10),
            (p_user_id, 'vehicle-accessories', 'Vehicle Accessories', 'Car accessories, dashcam', v_parent_id, TRUE, TRUE, 11),
            (p_user_id, 'driving-school', 'Driving School', 'Driving lessons, license fees', v_parent_id, TRUE, TRUE, 12)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 4: FOOD AND GROCERIES
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'food-groceries', 'Food and Groceries', 'Food, dining, drinks', '#96CEB4', 'shopping-cart', NULL, TRUE, TRUE, 4)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'food-groceries';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'groceries', 'Groceries', 'Supermarket, market shopping', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'dining-out', 'Dining Out', 'Restaurant meals', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'takeaway-delivery', 'Takeaway and Delivery', 'Food delivery apps, takeout', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'snacks-beverages', 'Snacks and Beverages', 'Coffee, snacks, soft drinks', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'alcohol', 'Alcohol', 'Beer, wine, spirits', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'fresh-produce', 'Fresh Produce', 'Fruits, vegetables from market', v_parent_id, TRUE, TRUE, 6),
            (p_user_id, 'meat-fish', 'Meat and Fish', 'Butchery, fishmonger', v_parent_id, TRUE, TRUE, 7),
            (p_user_id, 'cereals-grains', 'Cereals and Grains', 'Maize, rice, wheat, flour', v_parent_id, TRUE, TRUE, 8),
            (p_user_id, 'dairy', 'Dairy Products', 'Milk, cheese, yogurt', v_parent_id, TRUE, TRUE, 9),
            (p_user_id, 'cooking-ingredients', 'Cooking Ingredients', 'Spices, oil, condiments', v_parent_id, TRUE, TRUE, 10),
            (p_user_id, 'baby-food', 'Baby Food and Formula', 'Infant nutrition', v_parent_id, TRUE, TRUE, 11)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 5: HEALTHCARE
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'healthcare', 'Healthcare', 'Medical, dental, pharmacy', '#F67280', 'heart-pulse', NULL, TRUE, TRUE, 5)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'healthcare';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'doctor-consultations', 'Doctor Consultations', 'GP and specialist visits', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'medications', 'Medications', 'Pharmacy prescriptions', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'hospital-bills', 'Hospital Bills', 'Inpatient and outpatient', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'dental-care', 'Dental Care', 'Dentist visits, braces', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'eye-care', 'Eye Care', 'Optician, glasses, contacts', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'lab-tests', 'Lab Tests and Imaging', 'Blood work, X-rays, scans', v_parent_id, TRUE, TRUE, 6),
            (p_user_id, 'mental-health', 'Mental Health', 'Therapy, counseling', v_parent_id, TRUE, TRUE, 7),
            (p_user_id, 'health-insurance', 'Health Insurance (NHIF/SHA)', 'Medical cover premiums', v_parent_id, TRUE, TRUE, 8),
            (p_user_id, 'traditional-medicine', 'Traditional Medicine', 'Herbal remedies', v_parent_id, TRUE, TRUE, 9),
            (p_user_id, 'physiotherapy', 'Physiotherapy', 'Rehab and physical therapy', v_parent_id, TRUE, TRUE, 10),
            (p_user_id, 'supplements-vitamins', 'Supplements and Vitamins', 'Health supplements', v_parent_id, TRUE, TRUE, 11),
            (p_user_id, 'ambulance-emergency', 'Ambulance and Emergency', 'Emergency services', v_parent_id, TRUE, TRUE, 12),
            (p_user_id, 'maternity-care', 'Maternity Care', 'Prenatal and postnatal', v_parent_id, TRUE, TRUE, 13)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 6: EDUCATION
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'education', 'Education', 'School fees, books, courses', '#6C5CE7', 'graduation-cap', NULL, TRUE, TRUE, 6)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'education';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'school-fees', 'School Fees', 'Tuition for children', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'university-college', 'University or College', 'Higher education fees', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'books-textbooks', 'Books and Textbooks', 'Study materials', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'school-supplies', 'School Supplies', 'Stationery, uniforms, bags', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'online-courses', 'Online Courses', 'Udemy, Coursera, etc.', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'professional-cert', 'Professional Certifications', 'CPA, ACCA, AWS certs', v_parent_id, TRUE, TRUE, 6),
            (p_user_id, 'school-transport', 'School Transport', 'School bus, van service', v_parent_id, TRUE, TRUE, 7),
            (p_user_id, 'boarding-fees', 'Boarding Fees', 'Boarding school costs', v_parent_id, TRUE, TRUE, 8),
            (p_user_id, 'exam-fees', 'Exam Fees', 'KCPE, KCSE, professional exams', v_parent_id, TRUE, TRUE, 9),
            (p_user_id, 'tutoring', 'Tutoring', 'Extra tuition, coaching', v_parent_id, TRUE, TRUE, 10),
            (p_user_id, 'school-trips', 'School Trips', 'Educational excursions', v_parent_id, TRUE, TRUE, 11),
            (p_user_id, 'student-loans', 'Student Loans (HELB)', 'Education loan repayment', v_parent_id, TRUE, TRUE, 12)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 7: ENTERTAINMENT AND LEISURE
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'entertainment', 'Entertainment and Leisure', 'Fun, hobbies, recreation', '#FDCB6E', 'film', NULL, TRUE, TRUE, 7)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'entertainment';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'streaming', 'Streaming Services', 'Netflix, Showmax, Spotify', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'cinema', 'Cinema and Movies', 'Movie tickets', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'concerts-events', 'Concerts and Events', 'Live events, festivals', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'sports-fitness-ent', 'Sports and Fitness', 'Gym, swimming, sports', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'hobbies', 'Hobbies', 'Photography, art, music', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'books-magazines', 'Books and Magazines', 'Leisure reading', v_parent_id, TRUE, TRUE, 6),
            (p_user_id, 'gaming', 'Gaming', 'Video games, consoles', v_parent_id, TRUE, TRUE, 7),
            (p_user_id, 'travel-vacations', 'Travel and Vacations', 'Holiday trips', v_parent_id, TRUE, TRUE, 8),
            (p_user_id, 'accommodation', 'Accommodation', 'Hotels, Airbnb, lodging', v_parent_id, TRUE, TRUE, 9),
            (p_user_id, 'nightlife', 'Nightlife', 'Clubs, bars', v_parent_id, TRUE, TRUE, 10),
            (p_user_id, 'outdoor-activities', 'Outdoor Activities', 'Hiking, camping, safari', v_parent_id, TRUE, TRUE, 11),
            (p_user_id, 'social-clubs', 'Social Clubs', 'Membership fees, clubs', v_parent_id, TRUE, TRUE, 12)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 8: PERSONAL CARE
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'personal-care', 'Personal Care', 'Grooming, wellness, beauty', '#E17055', 'sparkles', NULL, TRUE, TRUE, 8)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'personal-care';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'haircuts-salon', 'Haircuts and Salon', 'Barber, hairdresser', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'cosmetics', 'Cosmetics and Skincare', 'Makeup, lotions, creams', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'toiletries', 'Toiletries', 'Soap, toothpaste, deodorant', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'spa-massage', 'Spa and Massage', 'Relaxation services', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'gym-fitness', 'Gym and Fitness', 'Membership fees, equipment', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'nails', 'Nail Care', 'Manicure, pedicure', v_parent_id, TRUE, TRUE, 6),
            (p_user_id, 'fragrance', 'Fragrance', 'Perfumes, colognes', v_parent_id, TRUE, TRUE, 7),
            (p_user_id, 'personal-hygiene', 'Personal Hygiene Products', 'Sanitary products', v_parent_id, TRUE, TRUE, 8),
            (p_user_id, 'wellness', 'Wellness and Self-Care', 'Yoga, meditation apps', v_parent_id, TRUE, TRUE, 9)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 9: CLOTHING AND ACCESSORIES
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'clothing', 'Clothing and Accessories', 'Clothes, shoes, accessories', '#A29BFE', 'shirt', NULL, TRUE, TRUE, 9)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'clothing';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'everyday-clothing', 'Everyday Clothing', 'Casual and work clothes', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'formal-wear', 'Formal Wear', 'Suits, dresses', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'shoes', 'Shoes and Footwear', 'All types of shoes', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'children-clothing', 'Children Clothing', 'Kids and baby clothes', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'sportswear', 'Sportswear', 'Athletic clothing', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'tailoring', 'Tailoring and Alterations', 'Custom clothing', v_parent_id, TRUE, TRUE, 6),
            (p_user_id, 'jewelry-watches', 'Jewelry and Watches', 'Accessories', v_parent_id, TRUE, TRUE, 7),
            (p_user_id, 'bags-luggage', 'Bags and Luggage', 'Handbags, backpacks', v_parent_id, TRUE, TRUE, 8),
            (p_user_id, 'laundry', 'Laundry and Dry Cleaning', 'Cleaning services', v_parent_id, TRUE, TRUE, 9),
            (p_user_id, 'traditional-attire', 'Traditional Attire', 'Kikoi, kitenge, dashiki', v_parent_id, TRUE, TRUE, 10)
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
            (p_user_id, 'cleaning-products', 'Cleaning Products', 'Detergent, bleach, polish', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'kitchen-utensils', 'Kitchen Utensils', 'Pots, pans, cutlery', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'bedding-linen', 'Bedding and Linen', 'Sheets, blankets, towels', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'light-bulbs', 'Light Bulbs and Electrical', 'Bulbs, extension cables', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'toiletries-household', 'Household Toiletries', 'Tissue, bin liners', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'pest-control', 'Pest Control', 'Insecticides, fumigation', v_parent_id, TRUE, TRUE, 6),
            (p_user_id, 'home-organization', 'Home Organization', 'Storage boxes, organizers', v_parent_id, TRUE, TRUE, 7),
            (p_user_id, 'garden-supplies', 'Garden Supplies', 'Plants, tools, fertilizer', v_parent_id, TRUE, TRUE, 8)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 11: ELECTRONICS AND GADGETS
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'electronics', 'Electronics and Gadgets', 'Devices, repairs, accessories', '#00B894', 'smartphone', NULL, TRUE, TRUE, 11)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'electronics';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'device-purchases', 'Device Purchases', 'Phones, laptops, tablets', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'repairs-maintenance', 'Repairs and Maintenance', 'Screen repairs, servicing', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'accessories', 'Accessories', 'Cases, chargers, cables', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'software-apps', 'Software and Apps', 'App purchases, licenses', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'electronics-insurance', 'Electronics Insurance', 'Device protection plans', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'home-entertainment', 'Home Entertainment Systems', 'Speakers, home theater', v_parent_id, TRUE, TRUE, 6)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 12: FINANCIAL OBLIGATIONS
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'financial', 'Financial Obligations', 'Savings, loans, investments', '#636E72', 'landmark', NULL, TRUE, TRUE, 12)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'financial';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'savings-deposits', 'Savings Deposits', 'Regular savings contributions', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'investments', 'Investments', 'Stocks, bonds, MMF', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'loan-repayments', 'Loan Repayments', 'Personal and bank loans', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'sacco-contributions', 'SACCO Contributions', 'SACCO savings and shares', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'bank-charges', 'Bank Charges', 'Account fees, ATM charges', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'mpesa-charges', 'M-Pesa Charges', 'Transaction fees', v_parent_id, TRUE, TRUE, 6),
            (p_user_id, 'pension-nssf', 'Pension (NSSF)', 'Voluntary pension', v_parent_id, TRUE, TRUE, 7),
            (p_user_id, 'credit-card-payments', 'Credit Card Payments', 'Card bill payments', v_parent_id, TRUE, TRUE, 8)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 13: INSURANCE
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'insurance', 'Insurance', 'Insurance premiums', '#74B9FF', 'shield', NULL, TRUE, TRUE, 13)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'insurance';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'health-insurance-premium', 'Health Insurance Premium', 'NHIF/SHA, private medical', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'life-insurance', 'Life Insurance', 'Life cover premiums', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'motor-insurance', 'Motor Vehicle Insurance', 'Car insurance', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'home-renters-insurance', 'Home or Renters Insurance', 'Property insurance', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'education-insurance', 'Education Insurance', 'Education policies', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'business-insurance', 'Business Insurance', 'Professional cover', v_parent_id, TRUE, TRUE, 6),
            (p_user_id, 'funeral-insurance', 'Funeral Insurance', 'Last expense cover', v_parent_id, TRUE, TRUE, 7)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 14: TAXES AND GOVERNMENT FEES
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'taxes', 'Taxes and Government Fees', 'KRA, licenses, permits', '#D63031', 'file-text', NULL, TRUE, TRUE, 14)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'taxes';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'income-tax', 'Income Tax', 'PAYE, voluntary tax', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'property-tax', 'Property Tax', 'Land rates, county levies', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'vehicle-registration', 'Vehicle Registration', 'NTSA fees, registration', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'business-permits', 'Business Permits', 'County licenses, permits', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'stamp-duty', 'Stamp Duty', 'Property transfer tax', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'government-services', 'Government Services', 'Passport, ID, e-citizen', v_parent_id, TRUE, TRUE, 6),
            (p_user_id, 'housing-levy', 'Housing Levy', 'Affordable housing fund', v_parent_id, TRUE, TRUE, 7)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 15: GIFTS, DONATIONS, AND CONTRIBUTIONS
    -- (Updated with new family support subcategories)
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
            (p_user_id, 'chama', 'Chama or Merry-Go-Round', 'Informal savings groups', v_parent_id, TRUE, TRUE, 8),
            (p_user_id, 'home-projects', 'Home Projects', 'Renovations, repairs, building for family', v_parent_id, TRUE, TRUE, 9),
            (p_user_id, 'farming-support', 'Farming Support', 'Seeds, equipment, farm inputs for family', v_parent_id, TRUE, TRUE, 10),
            (p_user_id, 'family-manpower', 'Family Manpower', 'Hired labor and help for family tasks', v_parent_id, TRUE, TRUE, 11)
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
            (p_user_id, 'babysitting-nanny', 'Babysitting or Nanny', 'Childcare providers', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'daycare-preschool', 'Daycare or Preschool', 'Early childhood care', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'diapers-baby', 'Diapers and Baby Supplies', 'Baby essentials', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'children-activities', 'Children Activities', 'Clubs, sports, parties', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'toys-games', 'Toys and Games', 'Children entertainment', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'elderly-care', 'Elderly Care', 'Care for aging parents', v_parent_id, TRUE, TRUE, 6)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 17: PETS AND ANIMALS
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'pets', 'Pets and Animals', 'Pet care and supplies', '#FFEAA7', 'paw-print', NULL, TRUE, TRUE, 17)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'pets';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'pet-food-treats', 'Pet Food and Treats', 'Animal nutrition', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'veterinary-care', 'Veterinary Care', 'Vet visits, vaccinations', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'pet-grooming', 'Pet Grooming', 'Cleaning, grooming services', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'pet-accessories', 'Pet Accessories', 'Leashes, beds, toys', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'pet-insurance', 'Pet Insurance', 'Animal health cover', v_parent_id, TRUE, TRUE, 5)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 18: BUSINESS AND PROFESSIONAL
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'business', 'Business and Professional', 'Work-related expenses', '#2D3436', 'briefcase', NULL, TRUE, TRUE, 18)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'business';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'office-supplies', 'Office Supplies', 'Pens, paper, printer ink', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'coworking', 'Coworking Space', 'Shared office rental', v_parent_id, TRUE, TRUE, 2),
            (p_user_id, 'marketing', 'Marketing and Advertising', 'Promotions, ads', v_parent_id, TRUE, TRUE, 3),
            (p_user_id, 'professional-development', 'Professional Development', 'Conferences, workshops', v_parent_id, TRUE, TRUE, 4),
            (p_user_id, 'legal-fees', 'Legal Fees', 'Lawyer, notary costs', v_parent_id, TRUE, TRUE, 5),
            (p_user_id, 'accounting-fees', 'Accounting Fees', 'Tax preparation, auditing', v_parent_id, TRUE, TRUE, 6),
            (p_user_id, 'business-travel', 'Business Travel', 'Work trips, per diem', v_parent_id, TRUE, TRUE, 7)
        ON CONFLICT (user_id, slug) DO NOTHING;
    END IF;

    -- =========================================================
    -- PARENT CATEGORY 19: MISCELLANEOUS
    -- =========================================================
    INSERT INTO expense_categories (user_id, slug, name, description, color, icon, parent_category_id, is_system, is_active, display_order)
    VALUES (p_user_id, 'miscellaneous', 'Miscellaneous', 'Other uncategorized expenses', '#B2BEC3', 'more-horizontal', NULL, TRUE, TRUE, 19)
    ON CONFLICT (user_id, slug) DO NOTHING
    RETURNING id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        SELECT id INTO v_parent_id FROM expense_categories WHERE user_id = p_user_id AND slug = 'miscellaneous';
    END IF;

    IF v_parent_id IS NOT NULL THEN
        INSERT INTO expense_categories (user_id, slug, name, description, parent_category_id, is_system, is_active, display_order) VALUES
            (p_user_id, 'subscriptions-other', 'Other Subscriptions', 'Non-entertainment subs', v_parent_id, TRUE, TRUE, 1),
            (p_user_id, 'tips-gratuities', 'Tips and Gratuities', 'Service tips', v_parent_id, TRUE, TRUE, 2),
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
