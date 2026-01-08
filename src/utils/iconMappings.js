/**
 * Centralized Icon Mappings for KenyaPesa Tracker
 * Replaces emoji with Lucide React icons for consistency
 *
 * Supports both legacy flat categories and new hierarchical categories
 */

import {
  Home,
  Bus,
  Pizza,
  Lightbulb,
  Smartphone,
  Film,
  Heart,
  BookOpen,
  Shirt,
  PiggyBank,
  CreditCard,
  Package,
  Wallet,
  Briefcase,
  TrendingUp,
  Gift,
  DollarSign,
  Building2,
  Car,
  Gem,
  AlertTriangle,
  Calendar,
  CalendarDays,
  CalendarRange,
  CalendarClock,
  Fuel,
  Train,
  Stethoscope,
  Pill,
  GraduationCap,
  Book,
  ShoppingBag,
  Scissors,
  Play,
  Music,
  Gamepad2,
  Users,
  Receipt,
  Zap,
  Droplets,
  Flame,
  Wifi,
  Utensils,
  Coffee,
  CircleDollarSign,
  HelpCircle,
  Wrench,
  Banknote
} from 'lucide-react'

// ========================================
// EXPENSE CATEGORY ICONS (Extended for hierarchical categories)
// ========================================
export const CATEGORY_ICONS = {
  // === Legacy flat categories (backward compatibility) ===
  rent: Home,
  transport: Bus,
  food: Pizza,
  utilities: Lightbulb,
  airtime: Smartphone,
  entertainment: Film,
  health: Heart,
  education: BookOpen,
  clothing: Shirt,
  savings: PiggyBank,
  debt: CreditCard,
  loan: CreditCard,
  other: Package,

  // === New hierarchical categories (parent slugs) ===
  'housing': Home,
  'food-dining': Utensils,
  'financial': CircleDollarSign,
  'personal': ShoppingBag,
  'family-social': Users,
  'business': Briefcase,
  'miscellaneous': Package,

  // === Subcategory slugs ===
  // Housing
  'mortgage': Home,
  'home-maintenance': Wrench,

  // Utilities
  'electricity': Zap,
  'water': Droplets,
  'gas': Flame,
  'internet': Wifi,

  // Food & Dining
  'groceries': Pizza,
  'restaurants': Utensils,
  'takeout': Coffee,

  // Transport
  'fuel': Fuel,
  'public-transport': Train,
  'ride-hailing': Car,
  'vehicle-maintenance': Wrench,

  // Health
  'medical-bills': Stethoscope,
  'insurance': Heart,
  'pharmacy': Pill,

  // Education
  'school-fees': GraduationCap,
  'courses': BookOpen,
  'books': Book,

  // Personal
  'personal-care': Scissors,

  // Entertainment
  'subscriptions': Play,
  'events': Music,
  'hobbies': Gamepad2,

  // Financial
  'bank-fees': Building2,
  'transaction-charges': Receipt,

  // Family & Social
  'gifts': Gift,
  'donations': Heart,

  // Business
  'business-expenses': Briefcase,

  // Miscellaneous
  'uncategorized': HelpCircle
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

// ========================================
// CATEGORY COLORS (for consistency - extended for hierarchical categories)
// ========================================
export const CATEGORY_COLORS = {
  // === Legacy flat categories ===
  rent: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
  transport: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
  food: 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30',
  utilities: 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30',
  airtime: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
  entertainment: 'text-pink-600 bg-pink-100 dark:text-pink-400 dark:bg-pink-900/30',
  health: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
  education: 'text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30',
  clothing: 'text-cyan-600 bg-cyan-100 dark:text-cyan-400 dark:bg-cyan-900/30',
  savings: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30',
  debt: 'text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-900/30',
  loan: 'text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-900/30',
  other: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30',

  // === New hierarchical parent categories ===
  'housing': 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
  'food-dining': 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30',
  'financial': 'text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-900/30',
  'personal': 'text-cyan-600 bg-cyan-100 dark:text-cyan-400 dark:bg-cyan-900/30',
  'family-social': 'text-pink-600 bg-pink-100 dark:text-pink-400 dark:bg-pink-900/30',
  'business': 'text-sky-600 bg-sky-100 dark:text-sky-400 dark:bg-sky-900/30',
  'miscellaneous': 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30',

  // === Subcategory slugs (inherit parent colors with slight variations) ===
  // Housing subcategories
  'mortgage': 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
  'home-maintenance': 'text-purple-500 bg-purple-50 dark:text-purple-300 dark:bg-purple-900/20',

  // Utilities subcategories
  'electricity': 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30',
  'water': 'text-blue-500 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
  'gas': 'text-orange-500 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30',
  'internet': 'text-teal-600 bg-teal-100 dark:text-teal-400 dark:bg-teal-900/30',

  // Food & Dining subcategories
  'groceries': 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30',
  'restaurants': 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30',
  'takeout': 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30',

  // Transport subcategories
  'fuel': 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
  'public-transport': 'text-blue-500 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/20',
  'ride-hailing': 'text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30',
  'vehicle-maintenance': 'text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-900/30',

  // Health subcategories
  'medical-bills': 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
  'insurance': 'text-red-500 bg-red-50 dark:text-red-300 dark:bg-red-900/20',
  'pharmacy': 'text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-900/30',

  // Education subcategories
  'school-fees': 'text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30',
  'courses': 'text-indigo-500 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-900/20',
  'books': 'text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-900/30',

  // Personal subcategories
  'personal-care': 'text-cyan-500 bg-cyan-50 dark:text-cyan-300 dark:bg-cyan-900/20',

  // Entertainment subcategories
  'subscriptions': 'text-pink-600 bg-pink-100 dark:text-pink-400 dark:bg-pink-900/30',
  'events': 'text-fuchsia-600 bg-fuchsia-100 dark:text-fuchsia-400 dark:bg-fuchsia-900/30',
  'hobbies': 'text-purple-500 bg-purple-50 dark:text-purple-300 dark:bg-purple-900/20',

  // Financial subcategories
  'bank-fees': 'text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-900/30',
  'transaction-charges': 'text-slate-500 bg-slate-50 dark:text-slate-300 dark:bg-slate-900/20',

  // Family & Social subcategories
  'gifts': 'text-pink-600 bg-pink-100 dark:text-pink-400 dark:bg-pink-900/30',
  'donations': 'text-rose-500 bg-rose-50 dark:text-rose-300 dark:bg-rose-900/20',

  // Business subcategories
  'business-expenses': 'text-sky-600 bg-sky-100 dark:text-sky-400 dark:bg-sky-900/30',

  // Miscellaneous subcategories
  'uncategorized': 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30'
}

/**
 * Get color classes for category badge
 * @param {string} category - Category name or slug
 * @returns {string} Tailwind CSS classes
 */
export function getCategoryColor(category) {
  if (!category) return CATEGORY_COLORS.other
  // Try exact match first, then lowercase, then default
  return CATEGORY_COLORS[category] ||
         CATEGORY_COLORS[category.toLowerCase()] ||
         CATEGORY_COLORS.other
}
