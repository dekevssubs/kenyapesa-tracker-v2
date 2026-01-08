/**
 * Centralized constants for KenyaPesa Tracker
 * Import these instead of using magic strings throughout the codebase
 */

// ============================================
// TRANSACTION TYPES
// ============================================
export const TRANSACTION_TYPES = {
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  TRANSFER: 'transfer',
  PAYMENT: 'payment',
  INCOME: 'income',
  EXPENSE: 'expense',
  INVESTMENT_DEPOSIT: 'investment_deposit',
  INVESTMENT_WITHDRAWAL: 'investment_withdrawal',
  INVESTMENT_RETURN: 'investment_return',
  LENDING: 'lending',
  REPAYMENT: 'repayment',
  TRANSACTION_FEE: 'transaction_fee',
  REVERSAL: 'reversal',
  BAD_DEBT_WRITE_OFF: 'bad_debt_write_off',
}

// ============================================
// ACCOUNT TYPES
// ============================================
export const ACCOUNT_TYPES = {
  MPESA: 'mpesa',
  BANK: 'bank',
  CASH: 'cash',
  SAVINGS: 'savings',
  CHECKING: 'checking',
  CARD: 'card',
  CREDIT: 'credit',
  INVESTMENT: 'investment',
  // Mobile money
  AIRTEL_MONEY: 'airtel_money',
  TKASH: 'tkash',
  // Investment types
  MONEY_MARKET_FUND: 'money_market_fund',
  SACCO: 'sacco',
  TREASURY_BILL: 'treasury_bill',
  TREASURY_BOND: 'treasury_bond',
  M_AKIBA: 'm_akiba',
  STOCKS: 'stocks',
  UNIT_TRUST: 'unit_trust',
  REIT: 'reit',
  FIXED_DEPOSIT: 'fixed_deposit',
  CHAMA: 'chama',
}

// Account type categories for grouping
export const ACCOUNT_CATEGORIES = {
  MOBILE_MONEY: ['mpesa', 'airtel_money', 'tkash'],
  BANK: ['bank', 'savings', 'checking'],
  CASH: ['cash'],
  INVESTMENT: [
    'money_market_fund', 'sacco', 'treasury_bill', 'treasury_bond',
    'm_akiba', 'stocks', 'unit_trust', 'reit', 'fixed_deposit', 'chama'
  ],
}

// ============================================
// PAYMENT METHODS
// ============================================
export const PAYMENT_METHODS = {
  MPESA: 'mpesa',
  CASH: 'cash',
  BANK: 'bank',
  CARD: 'card',
}

// Array form for dropdowns
export const PAYMENT_METHOD_OPTIONS = ['mpesa', 'cash', 'bank', 'card']

// ============================================
// GOAL STATUS
// ============================================
export const GOAL_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  PAUSED: 'paused',
  ABANDONED: 'abandoned',
}

// ============================================
// LENDING STATUS
// ============================================
export const LENDING_STATUS = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  COMPLETE: 'complete',
  FORGIVEN: 'forgiven',
  OVERDUE: 'overdue',
}

// ============================================
// BILL / EXPENSE FREQUENCIES
// ============================================
export const FREQUENCIES = {
  ONCE: 'once',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly',
}

// Array form for dropdowns
export const FREQUENCY_OPTIONS = ['once', 'weekly', 'monthly', 'quarterly', 'yearly']

// ============================================
// SNOOZE OPTIONS
// ============================================
export const SNOOZE_OPTIONS = {
  ONE_DAY: '1day',
  THREE_DAYS: '3days',
  ONE_WEEK: '1week',
  CUSTOM: 'custom',
}

// ============================================
// DUE DATE FILTERS
// ============================================
export const DUE_DATE_FILTERS = {
  ALL: 'all',
  OVERDUE: 'overdue',
  TODAY: 'today',
  WEEK: 'week',
  MONTH: 'month',
}

// ============================================
// FEE HANDLING METHODS
// ============================================
export const FEE_METHODS = {
  INCLUDED: 'included',
  SEPARATE: 'separate',
}

// ============================================
// CATEGORIZATION METHODS
// ============================================
export const CATEGORIZATION_METHODS = {
  USER_OVERRIDE: 'user_override',
  SYSTEM_TYPE: 'system_type',
  TRANSFER_DETECTION: 'transfer_detection',
  FEE_DETECTION: 'fee_detection',
  PAYBILL_MATCH: 'paybill_match',
  MERCHANT_MATCH: 'merchant_match',
  KEYWORD_MATCH: 'keyword_match',
  ACCOUNT_FALLBACK: 'account_fallback',
  UNCATEGORIZED: 'uncategorized',
}

// ============================================
// CURRENCY
// ============================================
export const CURRENCIES = {
  KES: 'KES',
  USD: 'USD',
  GBP: 'GBP',
  EUR: 'EUR',
}

export const DEFAULT_CURRENCY = 'KES'

// ============================================
// DATE FORMATS
// ============================================
export const DATE_FORMATS = {
  DISPLAY: 'en-KE',
  ISO: 'YYYY-MM-DD',
}

// ============================================
// BUDGET STATUS THRESHOLDS
// ============================================
export const BUDGET_THRESHOLDS = {
  WARNING: 0.8,  // 80% spent = warning
  DANGER: 1.0,   // 100% spent = danger/exceeded
}

// ============================================
// PAGINATION
// ============================================
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
}

// ============================================
// UI CONSTANTS
// ============================================
export const UI = {
  TOAST_DURATION: 3000,
  DEBOUNCE_DELAY: 300,
  ANIMATION_DURATION: 200,
}
