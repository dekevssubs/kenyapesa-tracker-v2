/**
 * Centralized Icon Mappings for KenyaPesa Tracker
 * Replaces emoji with Lucide React icons for consistency
 *
 * Supports 19 parent categories with 140+ subcategories
 */

import {
  // General
  Home,
  Package,
  Wallet,
  HelpCircle,

  // Housing
  Building,
  Wrench,
  Shield,
  Sofa,
  SprayCan,
  TreeDeciduous,
  Truck,

  // Utilities
  Zap,
  Droplets,
  Flame,
  Wifi,
  Smartphone,
  Phone,
  Tv,
  Trash2,
  BatteryCharging,

  // Transportation
  Car,
  Bus,
  Train,
  Plane,
  Ship,
  Bike,
  Fuel,
  ParkingCircle,
  Milestone,
  GraduationCap,

  // Food & Groceries
  Utensils,
  ShoppingCart,
  Apple,
  Milk,
  Coffee,
  Wine,
  Cookie,
  UtensilsCrossed,
  ChefHat,
  Salad,

  // Healthcare
  HeartPulse,
  Stethoscope,
  Building2,
  Pill,
  ShieldCheck,
  Smile,
  Eye,
  Leaf,
  Syringe,
  Brain,
  TestTube,
  Ambulance,
  Baby,

  // Education
  BookOpen,
  Book,
  Pencil,
  Backpack,
  Trophy,
  Users,
  FileText,
  Laptop,
  Award,
  Monitor,

  // Entertainment
  Film,
  Play,
  Music,
  BookMarked,
  Palette,
  Dumbbell,
  MapPin,
  Gamepad2,
  PartyPopper,
  Theater,
  Dice5,
  Mountain,

  // Personal Care
  Scissors,
  Sparkles,
  Heart,
  CircleUserRound,
  Activity,

  // Clothing
  Shirt,
  Footprints,
  Gem,
  Watch,
  ShoppingBag,

  // Household Supplies
  Lightbulb,
  CookingPot,
  Bed,
  Bug,
  Archive,

  // Electronics
  Monitor as MonitorIcon,
  Headphones,
  Printer,
  Speaker,

  // Financial
  Landmark,
  PiggyBank,
  TrendingUp,
  CreditCard,
  CircleDollarSign,
  Banknote,
  Calculator,
  ArrowLeftRight,

  // Insurance
  ShieldPlus,

  // Taxes
  Receipt,
  FileCheck,

  // Gifts & Donations
  Gift,
  Church,
  HandHeart,
  HeartHandshake,
  HandCoins,
  UsersRound,

  // Childcare
  Blocks,

  // Pets
  PawPrint,
  Dog,

  // Business
  Briefcase,
  Megaphone,
  Scale,

  // Date/Calendar
  Calendar,
  CalendarDays,
  CalendarRange,
  CalendarClock,

  // General purpose
  DollarSign,
  AlertTriangle
} from 'lucide-react'

// ========================================
// EXPENSE CATEGORY ICONS (All 19 parents + 140+ subcategories)
// ========================================
export const CATEGORY_ICONS = {
  // =========================================================
  // PARENT CATEGORY 1: HOUSING
  // =========================================================
  'housing': Home,
  'rent-mortgage': Home,
  'property-taxes': FileText,
  'home-maintenance': Wrench,
  'home-insurance': Shield,
  'furnishings': Sofa,
  'cleaning-services': SprayCan,
  'security-services': Shield,
  'gardening': TreeDeciduous,
  'moving-expenses': Truck,

  // =========================================================
  // PARENT CATEGORY 2: UTILITIES
  // =========================================================
  'utilities': Zap,
  'electricity': Zap,
  'water-sewerage': Droplets,
  'gas-cooking-fuel': Flame,
  'internet-broadband': Wifi,
  'mobile-data': Smartphone,
  'landline': Phone,
  'cable-tv': Tv,
  'waste-management': Trash2,
  'generator': BatteryCharging,

  // =========================================================
  // PARENT CATEGORY 3: TRANSPORTATION
  // =========================================================
  'transportation': Car,
  'fuel': Fuel,
  'public-transport': Bus,
  'vehicle-purchase': Car,
  'vehicle-maintenance': Wrench,
  'parking': ParkingCircle,
  'toll-roads': Milestone,
  'vehicle-insurance': Shield,
  'ride-hailing': Car,
  'bicycle-scooter': Bike,
  'air-travel': Plane,
  'ferry-boat': Ship,
  'driving-lessons': GraduationCap,

  // =========================================================
  // PARENT CATEGORY 4: FOOD AND GROCERIES
  // =========================================================
  'food-groceries': Utensils,
  'groceries': ShoppingCart,
  'fresh-produce': Apple,
  'dairy-eggs': Milk,
  'beverages': Coffee,
  'alcohol-tobacco': Wine,
  'snacks': Cookie,
  'dining-out': UtensilsCrossed,
  'takeaway-delivery': ChefHat,
  'baking-ingredients': CookingPot,
  'dietary-supplements': Salad,
  'pet-food': PawPrint,

  // =========================================================
  // PARENT CATEGORY 5: HEALTHCARE
  // =========================================================
  'healthcare': HeartPulse,
  'doctor-consultations': Stethoscope,
  'hospital': Building2,
  'medications': Pill,
  'health-insurance': ShieldCheck,
  'dental': Smile,
  'optical': Eye,
  'alternative-medicine': Leaf,
  'vaccinations': Syringe,
  'mental-health': Brain,
  'medical-devices': HeartPulse,
  'lab-tests': TestTube,
  'ambulance': Ambulance,
  'reproductive-health': Baby,

  // =========================================================
  // PARENT CATEGORY 6: EDUCATION
  // =========================================================
  'education': GraduationCap,
  'school-fees': GraduationCap,
  'books-textbooks': Book,
  'stationery': Pencil,
  'uniforms': Shirt,
  'extracurricular': Trophy,
  'tutoring': Users,
  'exam-fees': FileText,
  'school-transport': Bus,
  'educational-tech': Laptop,
  'scholarships': Award,
  'vocational-training': Wrench,
  'online-courses': Monitor,

  // =========================================================
  // PARENT CATEGORY 7: ENTERTAINMENT AND LEISURE
  // =========================================================
  'entertainment': Film,
  'streaming': Play,
  'cinema': Film,
  'music-concerts': Music,
  'books-magazines': BookMarked,
  'hobbies-crafts': Palette,
  'sports-gym': Dumbbell,
  'travel-vacations': MapPin,
  'gaming': Gamepad2,
  'social-events': PartyPopper,
  'cultural-activities': Theater,
  'betting-lotteries': Dice5,
  'outdoor-activities': Mountain,

  // =========================================================
  // PARENT CATEGORY 8: PERSONAL CARE
  // =========================================================
  'personal-care': Scissors,
  'haircuts-salon': Scissors,
  'cosmetics': Sparkles,
  'skincare': Heart,
  'hygiene-products': SprayCan,
  'fitness-classes': Dumbbell,
  'spa-wellness': Sparkles,
  'tattoos-piercings': CircleUserRound,
  'weight-loss': Activity,
  'fragrances': Sparkles,

  // =========================================================
  // PARENT CATEGORY 9: CLOTHING AND ACCESSORIES
  // =========================================================
  'clothing': Shirt,
  'everyday-clothing': Shirt,
  'work-attire': Briefcase,
  'shoes': Footprints,
  'underwear': Shirt,
  'jewelry-watches': Watch,
  'bags-accessories': ShoppingBag,
  'sportswear': Dumbbell,
  'laundry-cleaning': SprayCan,
  'tailoring': Scissors,
  'seasonal-clothing': Shirt,

  // =========================================================
  // PARENT CATEGORY 10: HOUSEHOLD SUPPLIES
  // =========================================================
  'household-supplies': SprayCan,
  'cleaning-products': SprayCan,
  'kitchen-utensils': CookingPot,
  'toiletries': SprayCan,
  'bedding-linens': Bed,
  'appliance-repairs': Wrench,
  'pest-control': Bug,
  'home-organization': Archive,
  'batteries-bulbs': Lightbulb,

  // =========================================================
  // PARENT CATEGORY 11: ELECTRONICS AND GADGETS
  // =========================================================
  'electronics': Smartphone,
  'device-purchases': Smartphone,
  'accessories': Headphones,
  'repairs-maintenance': Wrench,
  'software-subscriptions': MonitorIcon,
  'printing-scanning': Printer,
  'home-entertainment': Speaker,

  // =========================================================
  // PARENT CATEGORY 12: FINANCIAL OBLIGATIONS
  // =========================================================
  'financial': Landmark,
  'savings-deposits': PiggyBank,
  'investments': TrendingUp,
  'bank-fees': Landmark,
  'loan-repayments': CreditCard,
  'credit-card': CreditCard,
  'retirement': PiggyBank,
  'financial-advisory': Calculator,
  'currency-exchange': ArrowLeftRight,

  // =========================================================
  // PARENT CATEGORY 13: INSURANCE
  // =========================================================
  'insurance': ShieldCheck,
  'health-insurance-premium': ShieldCheck,
  'life-insurance': Heart,
  'vehicle-insurance-premium': Car,
  'home-renters-insurance': Home,
  'travel-insurance': Plane,
  'business-insurance': Briefcase,
  'disability-insurance': ShieldPlus,

  // =========================================================
  // PARENT CATEGORY 14: TAXES AND GOVERNMENT FEES
  // =========================================================
  'taxes': Receipt,
  'income-tax': Receipt,
  'vat': Receipt,
  'property-tax': Home,
  'business-licenses': FileCheck,
  'vehicle-registration': Car,
  'import-duties': Ship,
  'fines-penalties': AlertTriangle,

  // =========================================================
  // PARENT CATEGORY 15: GIFTS, DONATIONS, AND CONTRIBUTIONS
  // =========================================================
  'gifts-donations': Gift,
  'birthday-gifts': Gift,
  'holiday-gifts': Gift,
  'wedding-dowry': HeartHandshake,
  'charity': HandHeart,
  'tithes-offerings': Church,
  'harambee': HandCoins,
  'family-support': UsersRound,
  'chama': UsersRound,

  // =========================================================
  // PARENT CATEGORY 16: CHILDCARE AND FAMILY
  // =========================================================
  'childcare-family': Baby,
  'babysitting-nanny': Baby,
  'daycare-preschool': Blocks,
  'childrens-toys': Blocks,
  'baby-supplies': Baby,
  'family-planning': HeartPulse,
  'elderly-care': HeartHandshake,

  // =========================================================
  // PARENT CATEGORY 17: PETS AND ANIMALS
  // =========================================================
  'pets': PawPrint,
  'pet-food-treats': PawPrint,
  'veterinary': Stethoscope,
  'pet-grooming': Scissors,
  'pet-insurance': ShieldCheck,
  'pet-boarding': Dog,

  // =========================================================
  // PARENT CATEGORY 18: BUSINESS AND PROFESSIONAL
  // =========================================================
  'business': Briefcase,
  'office-supplies': Pencil,
  'marketing': Megaphone,
  'professional-development': GraduationCap,
  'business-travel': Plane,
  'equipment-tools': Wrench,
  'legal-fees': Scale,
  'accounting': Calculator,

  // =========================================================
  // PARENT CATEGORY 19: MISCELLANEOUS
  // =========================================================
  'miscellaneous': HelpCircle,
  'subscriptions-other': Play,
  'fees-fines': AlertTriangle,
  'postage-shipping': Package,
  'storage-rentals': Archive,
  'emergency-funds': Banknote,
  'lottery-gambling': Dice5,
  'cultural-traditional': Users,
  'environmental': Leaf,

  // =========================================================
  // LEGACY CATEGORIES (backward compatibility)
  // =========================================================
  'rent': Home,
  'transport': Bus,
  'food': Utensils,
  'airtime': Smartphone,
  'health': HeartPulse,
  'savings': PiggyBank,
  'debt': CreditCard,
  'loan': CreditCard,
  'other': Package,
  'uncategorized': HelpCircle,
  'gifts': Gift,
  'donations': HandHeart
}

// ========================================
// PAYMENT METHOD ICONS
// ========================================
export const PAYMENT_METHOD_ICONS = {
  mpesa: Smartphone,
  cash: Wallet,
  bank: Building2,
  card: CreditCard
}

// ========================================
// INCOME SOURCE ICONS
// ========================================
export const INCOME_SOURCE_ICONS = {
  salary: Briefcase,
  side_hustle: TrendingUp,
  investment: TrendingUp,
  bonus: Gift,
  gift: Gift,
  other: DollarSign
}

// ========================================
// ASSET TYPE ICONS (for Net Worth)
// ========================================
export const ASSET_TYPE_ICONS = {
  cash: Wallet,
  bank: Building2,
  investment: TrendingUp,
  property: Home,
  vehicle: Car,
  other_asset: Gem
}

// ========================================
// LIABILITY TYPE ICONS (for Net Worth)
// ========================================
export const LIABILITY_TYPE_ICONS = {
  loan: CreditCard,
  debt: AlertTriangle,
  other_liability: Package
}

// ========================================
// FREQUENCY ICONS (for Subscriptions/Bills)
// ========================================
export const FREQUENCY_ICONS = {
  daily: CalendarClock,
  weekly: Calendar,
  monthly: CalendarDays,
  quarterly: CalendarRange,
  yearly: CalendarRange,
  once: Calendar
}

// ========================================
// CATEGORY COLORS (All 19 parents + subcategories)
// ========================================
export const CATEGORY_COLORS = {
  // =========================================================
  // PARENT CATEGORY 1: HOUSING - Purple/Rose
  // =========================================================
  'housing': 'text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-900/30',
  'rent-mortgage': 'text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-900/30',
  'property-taxes': 'text-rose-500 bg-rose-50 dark:text-rose-400 dark:bg-rose-900/20',
  'home-maintenance': 'text-rose-500 bg-rose-50 dark:text-rose-400 dark:bg-rose-900/20',
  'home-insurance': 'text-rose-500 bg-rose-50 dark:text-rose-400 dark:bg-rose-900/20',
  'furnishings': 'text-rose-500 bg-rose-50 dark:text-rose-400 dark:bg-rose-900/20',
  'cleaning-services': 'text-rose-500 bg-rose-50 dark:text-rose-400 dark:bg-rose-900/20',
  'security-services': 'text-rose-500 bg-rose-50 dark:text-rose-400 dark:bg-rose-900/20',
  'gardening': 'text-rose-500 bg-rose-50 dark:text-rose-400 dark:bg-rose-900/20',
  'moving-expenses': 'text-rose-500 bg-rose-50 dark:text-rose-400 dark:bg-rose-900/20',

  // =========================================================
  // PARENT CATEGORY 2: UTILITIES - Yellow/Amber
  // =========================================================
  'utilities': 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30',
  'electricity': 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30',
  'water-sewerage': 'text-blue-500 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
  'gas-cooking-fuel': 'text-orange-500 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30',
  'internet-broadband': 'text-teal-600 bg-teal-100 dark:text-teal-400 dark:bg-teal-900/30',
  'mobile-data': 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
  'landline': 'text-amber-500 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20',
  'cable-tv': 'text-amber-500 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20',
  'waste-management': 'text-amber-500 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20',
  'generator': 'text-amber-500 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20',

  // =========================================================
  // PARENT CATEGORY 3: TRANSPORTATION - Cyan/Teal
  // =========================================================
  'transportation': 'text-cyan-600 bg-cyan-100 dark:text-cyan-400 dark:bg-cyan-900/30',
  'fuel': 'text-cyan-600 bg-cyan-100 dark:text-cyan-400 dark:bg-cyan-900/30',
  'public-transport': 'text-cyan-500 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-900/20',
  'vehicle-purchase': 'text-cyan-500 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-900/20',
  'vehicle-maintenance': 'text-cyan-500 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-900/20',
  'parking': 'text-cyan-500 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-900/20',
  'toll-roads': 'text-cyan-500 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-900/20',
  'vehicle-insurance': 'text-cyan-500 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-900/20',
  'ride-hailing': 'text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30',
  'bicycle-scooter': 'text-cyan-500 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-900/20',
  'air-travel': 'text-sky-600 bg-sky-100 dark:text-sky-400 dark:bg-sky-900/30',
  'ferry-boat': 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
  'driving-lessons': 'text-cyan-500 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-900/20',

  // =========================================================
  // PARENT CATEGORY 4: FOOD AND GROCERIES - Emerald/Green
  // =========================================================
  'food-groceries': 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30',
  'groceries': 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30',
  'fresh-produce': 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
  'dairy-eggs': 'text-emerald-500 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20',
  'beverages': 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30',
  'alcohol-tobacco': 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
  'snacks': 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30',
  'dining-out': 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30',
  'takeaway-delivery': 'text-orange-500 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20',
  'baking-ingredients': 'text-emerald-500 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20',
  'dietary-supplements': 'text-lime-600 bg-lime-100 dark:text-lime-400 dark:bg-lime-900/30',

  // =========================================================
  // PARENT CATEGORY 5: HEALTHCARE - Red
  // =========================================================
  'healthcare': 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
  'doctor-consultations': 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
  'hospital': 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
  'medications': 'text-red-500 bg-red-50 dark:text-red-400 dark:bg-red-900/20',
  'health-insurance': 'text-red-500 bg-red-50 dark:text-red-400 dark:bg-red-900/20',
  'dental': 'text-red-500 bg-red-50 dark:text-red-400 dark:bg-red-900/20',
  'optical': 'text-red-500 bg-red-50 dark:text-red-400 dark:bg-red-900/20',
  'alternative-medicine': 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
  'vaccinations': 'text-red-500 bg-red-50 dark:text-red-400 dark:bg-red-900/20',
  'mental-health': 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
  'medical-devices': 'text-red-500 bg-red-50 dark:text-red-400 dark:bg-red-900/20',
  'lab-tests': 'text-red-500 bg-red-50 dark:text-red-400 dark:bg-red-900/20',
  'ambulance': 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
  'reproductive-health': 'text-pink-600 bg-pink-100 dark:text-pink-400 dark:bg-pink-900/30',

  // =========================================================
  // PARENT CATEGORY 6: EDUCATION - Orange/Amber
  // =========================================================
  'education': 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30',
  'school-fees': 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30',
  'books-textbooks': 'text-orange-500 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20',
  'stationery': 'text-orange-500 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20',
  'uniforms': 'text-orange-500 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20',
  'extracurricular': 'text-orange-500 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20',
  'tutoring': 'text-orange-500 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20',
  'exam-fees': 'text-orange-500 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20',
  'school-transport': 'text-orange-500 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20',
  'educational-tech': 'text-orange-500 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20',
  'scholarships': 'text-orange-500 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20',
  'vocational-training': 'text-orange-500 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20',
  'online-courses': 'text-orange-500 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20',

  // =========================================================
  // PARENT CATEGORY 7: ENTERTAINMENT - Pink/Fuchsia
  // =========================================================
  'entertainment': 'text-pink-600 bg-pink-100 dark:text-pink-400 dark:bg-pink-900/30',
  'streaming': 'text-pink-600 bg-pink-100 dark:text-pink-400 dark:bg-pink-900/30',
  'cinema': 'text-pink-500 bg-pink-50 dark:text-pink-400 dark:bg-pink-900/20',
  'music-concerts': 'text-fuchsia-600 bg-fuchsia-100 dark:text-fuchsia-400 dark:bg-fuchsia-900/30',
  'books-magazines': 'text-pink-500 bg-pink-50 dark:text-pink-400 dark:bg-pink-900/20',
  'hobbies-crafts': 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
  'sports-gym': 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
  'travel-vacations': 'text-sky-600 bg-sky-100 dark:text-sky-400 dark:bg-sky-900/30',
  'gaming': 'text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-900/30',
  'social-events': 'text-pink-500 bg-pink-50 dark:text-pink-400 dark:bg-pink-900/20',
  'cultural-activities': 'text-pink-500 bg-pink-50 dark:text-pink-400 dark:bg-pink-900/20',
  'betting-lotteries': 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
  'outdoor-activities': 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',

  // =========================================================
  // PARENT CATEGORY 8: PERSONAL CARE - Rose/Pink
  // =========================================================
  'personal-care': 'text-rose-500 bg-rose-100 dark:text-rose-400 dark:bg-rose-900/30',
  'haircuts-salon': 'text-rose-500 bg-rose-100 dark:text-rose-400 dark:bg-rose-900/30',
  'cosmetics': 'text-pink-500 bg-pink-100 dark:text-pink-400 dark:bg-pink-900/30',
  'skincare': 'text-rose-400 bg-rose-50 dark:text-rose-400 dark:bg-rose-900/20',
  'hygiene-products': 'text-rose-400 bg-rose-50 dark:text-rose-400 dark:bg-rose-900/20',
  'fitness-classes': 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
  'spa-wellness': 'text-purple-500 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
  'tattoos-piercings': 'text-rose-400 bg-rose-50 dark:text-rose-400 dark:bg-rose-900/20',
  'weight-loss': 'text-rose-400 bg-rose-50 dark:text-rose-400 dark:bg-rose-900/20',
  'fragrances': 'text-rose-400 bg-rose-50 dark:text-rose-400 dark:bg-rose-900/20',

  // =========================================================
  // PARENT CATEGORY 9: CLOTHING - Sky/Cyan
  // =========================================================
  'clothing': 'text-sky-600 bg-sky-100 dark:text-sky-400 dark:bg-sky-900/30',
  'everyday-clothing': 'text-sky-600 bg-sky-100 dark:text-sky-400 dark:bg-sky-900/30',
  'work-attire': 'text-sky-500 bg-sky-50 dark:text-sky-400 dark:bg-sky-900/20',
  'shoes': 'text-sky-500 bg-sky-50 dark:text-sky-400 dark:bg-sky-900/20',
  'underwear': 'text-sky-500 bg-sky-50 dark:text-sky-400 dark:bg-sky-900/20',
  'jewelry-watches': 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30',
  'bags-accessories': 'text-sky-500 bg-sky-50 dark:text-sky-400 dark:bg-sky-900/20',
  'sportswear': 'text-sky-500 bg-sky-50 dark:text-sky-400 dark:bg-sky-900/20',
  'laundry-cleaning': 'text-sky-500 bg-sky-50 dark:text-sky-400 dark:bg-sky-900/20',
  'tailoring': 'text-sky-500 bg-sky-50 dark:text-sky-400 dark:bg-sky-900/20',
  'seasonal-clothing': 'text-sky-500 bg-sky-50 dark:text-sky-400 dark:bg-sky-900/20',

  // =========================================================
  // PARENT CATEGORY 10: HOUSEHOLD SUPPLIES - Lime/Green
  // =========================================================
  'household-supplies': 'text-lime-600 bg-lime-100 dark:text-lime-400 dark:bg-lime-900/30',
  'cleaning-products': 'text-lime-600 bg-lime-100 dark:text-lime-400 dark:bg-lime-900/30',
  'kitchen-utensils': 'text-lime-500 bg-lime-50 dark:text-lime-400 dark:bg-lime-900/20',
  'toiletries': 'text-lime-500 bg-lime-50 dark:text-lime-400 dark:bg-lime-900/20',
  'bedding-linens': 'text-lime-500 bg-lime-50 dark:text-lime-400 dark:bg-lime-900/20',
  'appliance-repairs': 'text-lime-500 bg-lime-50 dark:text-lime-400 dark:bg-lime-900/20',
  'pest-control': 'text-lime-500 bg-lime-50 dark:text-lime-400 dark:bg-lime-900/20',
  'home-organization': 'text-lime-500 bg-lime-50 dark:text-lime-400 dark:bg-lime-900/20',
  'batteries-bulbs': 'text-lime-500 bg-lime-50 dark:text-lime-400 dark:bg-lime-900/20',

  // =========================================================
  // PARENT CATEGORY 11: ELECTRONICS - Blue/Sky
  // =========================================================
  'electronics': 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
  'device-purchases': 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
  'accessories': 'text-blue-500 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20',
  'repairs-maintenance': 'text-blue-500 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20',
  'software-subscriptions': 'text-blue-500 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20',
  'printing-scanning': 'text-blue-500 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20',
  'home-entertainment': 'text-blue-500 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20',

  // =========================================================
  // PARENT CATEGORY 12: FINANCIAL - Slate/Gray
  // =========================================================
  'financial': 'text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-900/30',
  'savings-deposits': 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30',
  'investments': 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
  'bank-fees': 'text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-900/30',
  'loan-repayments': 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
  'credit-card': 'text-slate-500 bg-slate-50 dark:text-slate-400 dark:bg-slate-900/20',
  'retirement': 'text-emerald-500 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20',
  'financial-advisory': 'text-slate-500 bg-slate-50 dark:text-slate-400 dark:bg-slate-900/20',
  'currency-exchange': 'text-slate-500 bg-slate-50 dark:text-slate-400 dark:bg-slate-900/20',

  // =========================================================
  // PARENT CATEGORY 13: INSURANCE - Indigo
  // =========================================================
  'insurance': 'text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30',
  'health-insurance-premium': 'text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30',
  'life-insurance': 'text-indigo-500 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-900/20',
  'vehicle-insurance-premium': 'text-indigo-500 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-900/20',
  'home-renters-insurance': 'text-indigo-500 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-900/20',
  'travel-insurance': 'text-indigo-500 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-900/20',
  'business-insurance': 'text-indigo-500 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-900/20',
  'disability-insurance': 'text-indigo-500 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-900/20',

  // =========================================================
  // PARENT CATEGORY 14: TAXES - Red/Rose
  // =========================================================
  'taxes': 'text-red-700 bg-red-100 dark:text-red-500 dark:bg-red-900/30',
  'income-tax': 'text-red-700 bg-red-100 dark:text-red-500 dark:bg-red-900/30',
  'vat': 'text-red-600 bg-red-50 dark:text-red-500 dark:bg-red-900/20',
  'property-tax': 'text-red-600 bg-red-50 dark:text-red-500 dark:bg-red-900/20',
  'business-licenses': 'text-red-600 bg-red-50 dark:text-red-500 dark:bg-red-900/20',
  'vehicle-registration': 'text-red-600 bg-red-50 dark:text-red-500 dark:bg-red-900/20',
  'import-duties': 'text-red-600 bg-red-50 dark:text-red-500 dark:bg-red-900/20',
  'fines-penalties': 'text-red-600 bg-red-50 dark:text-red-500 dark:bg-red-900/20',

  // =========================================================
  // PARENT CATEGORY 15: GIFTS & DONATIONS - Pink/Rose
  // =========================================================
  'gifts-donations': 'text-pink-600 bg-pink-100 dark:text-pink-400 dark:bg-pink-900/30',
  'birthday-gifts': 'text-pink-600 bg-pink-100 dark:text-pink-400 dark:bg-pink-900/30',
  'holiday-gifts': 'text-pink-500 bg-pink-50 dark:text-pink-400 dark:bg-pink-900/20',
  'wedding-dowry': 'text-pink-500 bg-pink-50 dark:text-pink-400 dark:bg-pink-900/20',
  'charity': 'text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-900/30',
  'tithes-offerings': 'text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-900/30',
  'harambee': 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
  'family-support': 'text-pink-500 bg-pink-50 dark:text-pink-400 dark:bg-pink-900/20',
  'chama': 'text-violet-500 bg-violet-50 dark:text-violet-400 dark:bg-violet-900/20',

  // =========================================================
  // PARENT CATEGORY 16: CHILDCARE - Pink
  // =========================================================
  'childcare-family': 'text-pink-600 bg-pink-100 dark:text-pink-400 dark:bg-pink-900/30',
  'babysitting-nanny': 'text-pink-600 bg-pink-100 dark:text-pink-400 dark:bg-pink-900/30',
  'daycare-preschool': 'text-pink-500 bg-pink-50 dark:text-pink-400 dark:bg-pink-900/20',
  'childrens-toys': 'text-pink-500 bg-pink-50 dark:text-pink-400 dark:bg-pink-900/20',
  'baby-supplies': 'text-pink-500 bg-pink-50 dark:text-pink-400 dark:bg-pink-900/20',
  'family-planning': 'text-pink-500 bg-pink-50 dark:text-pink-400 dark:bg-pink-900/20',
  'elderly-care': 'text-pink-500 bg-pink-50 dark:text-pink-400 dark:bg-pink-900/20',

  // =========================================================
  // PARENT CATEGORY 17: PETS - Violet/Purple
  // =========================================================
  'pets': 'text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-900/30',
  'pet-food': 'text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-900/30',
  'pet-food-treats': 'text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-900/30',
  'veterinary': 'text-violet-500 bg-violet-50 dark:text-violet-400 dark:bg-violet-900/20',
  'pet-grooming': 'text-violet-500 bg-violet-50 dark:text-violet-400 dark:bg-violet-900/20',
  'pet-insurance': 'text-violet-500 bg-violet-50 dark:text-violet-400 dark:bg-violet-900/20',
  'pet-boarding': 'text-violet-500 bg-violet-50 dark:text-violet-400 dark:bg-violet-900/20',

  // =========================================================
  // PARENT CATEGORY 18: BUSINESS - Sky/Blue
  // =========================================================
  'business': 'text-sky-600 bg-sky-100 dark:text-sky-400 dark:bg-sky-900/30',
  'office-supplies': 'text-sky-600 bg-sky-100 dark:text-sky-400 dark:bg-sky-900/30',
  'marketing': 'text-sky-500 bg-sky-50 dark:text-sky-400 dark:bg-sky-900/20',
  'professional-development': 'text-sky-500 bg-sky-50 dark:text-sky-400 dark:bg-sky-900/20',
  'business-travel': 'text-sky-500 bg-sky-50 dark:text-sky-400 dark:bg-sky-900/20',
  'equipment-tools': 'text-sky-500 bg-sky-50 dark:text-sky-400 dark:bg-sky-900/20',
  'legal-fees': 'text-sky-500 bg-sky-50 dark:text-sky-400 dark:bg-sky-900/20',
  'accounting': 'text-sky-500 bg-sky-50 dark:text-sky-400 dark:bg-sky-900/20',

  // =========================================================
  // PARENT CATEGORY 19: MISCELLANEOUS - Gray
  // =========================================================
  'miscellaneous': 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30',
  'subscriptions-other': 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30',
  'fees-fines': 'text-red-500 bg-red-50 dark:text-red-400 dark:bg-red-900/20',
  'postage-shipping': 'text-gray-500 bg-gray-50 dark:text-gray-400 dark:bg-gray-900/20',
  'storage-rentals': 'text-gray-500 bg-gray-50 dark:text-gray-400 dark:bg-gray-900/20',
  'emergency-funds': 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30',
  'lottery-gambling': 'text-gray-500 bg-gray-50 dark:text-gray-400 dark:bg-gray-900/20',
  'cultural-traditional': 'text-gray-500 bg-gray-50 dark:text-gray-400 dark:bg-gray-900/20',
  'environmental': 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',

  // =========================================================
  // LEGACY CATEGORIES (backward compatibility)
  // =========================================================
  'rent': 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
  'transport': 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
  'food': 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30',
  'airtime': 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
  'health': 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
  'savings': 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30',
  'debt': 'text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-900/30',
  'loan': 'text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-900/30',
  'other': 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30',
  'uncategorized': 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30',
  'gifts': 'text-pink-600 bg-pink-100 dark:text-pink-400 dark:bg-pink-900/30',
  'donations': 'text-rose-500 bg-rose-50 dark:text-rose-300 dark:bg-rose-900/20'
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Get icon component for expense category
 * @param {string} category - Category name or slug
 * @returns {Component} Lucide icon component
 */
export function getCategoryIcon(category) {
  if (!category) return Package
  // Try exact match first, then lowercase, then default
  return CATEGORY_ICONS[category] ||
         CATEGORY_ICONS[category.toLowerCase()] ||
         CATEGORY_ICONS[category.replace(/_/g, '-')] ||
         Package
}

/**
 * Get icon component for payment method
 * @param {string} method - Payment method name
 * @returns {Component} Lucide icon component
 */
export function getPaymentIcon(method) {
  return PAYMENT_METHOD_ICONS[method] || Wallet
}

/**
 * Get icon component for income source
 * @param {string} source - Income source name
 * @returns {Component} Lucide icon component
 */
export function getIncomeIcon(source) {
  return INCOME_SOURCE_ICONS[source] || DollarSign
}

/**
 * Get icon component for asset type
 * @param {string} type - Asset type name
 * @returns {Component} Lucide icon component
 */
export function getAssetIcon(type) {
  return ASSET_TYPE_ICONS[type] || Gem
}

/**
 * Get icon component for liability type
 * @param {string} type - Liability type name
 * @returns {Component} Lucide icon component
 */
export function getLiabilityIcon(type) {
  return LIABILITY_TYPE_ICONS[type] || Package
}

/**
 * Get icon component for frequency
 * @param {string} frequency - Frequency type
 * @returns {Component} Lucide icon component
 */
export function getFrequencyIcon(frequency) {
  return FREQUENCY_ICONS[frequency] || Calendar
}

/**
 * Get color classes for category badge
 * @param {string} category - Category name or slug
 * @returns {string} Tailwind CSS classes
 */
export function getCategoryColor(category) {
  if (!category) return CATEGORY_COLORS.other
  // Try exact match first, then lowercase, then with hyphens, then default
  return CATEGORY_COLORS[category] ||
         CATEGORY_COLORS[category.toLowerCase()] ||
         CATEGORY_COLORS[category.replace(/_/g, '-')] ||
         CATEGORY_COLORS.other
}
