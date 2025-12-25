/**
 * Centralized Icon Mappings for KenyaPesa Tracker
 * Replaces emoji with Lucide React icons for consistency
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
  CalendarClock
} from 'lucide-react'

// ========================================
// EXPENSE CATEGORY ICONS
// ========================================
export const CATEGORY_ICONS = {
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
  other: Package
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
 * @param {string} category - Category name
 * @returns {Component} Lucide icon component
 */
export function getCategoryIcon(category) {
  return CATEGORY_ICONS[category] || Package
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
// CATEGORY COLORS (for consistency)
// ========================================
export const CATEGORY_COLORS = {
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
  other: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30'
}

/**
 * Get color classes for category badge
 * @param {string} category - Category name
 * @returns {string} Tailwind CSS classes
 */
export function getCategoryColor(category) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.other
}
