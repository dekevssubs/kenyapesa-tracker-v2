/**
 * Kenya Transaction Fees Calculator
 *
 * Calculates transaction fees for various Kenya payment methods:
 * - M-Pesa Send Money (P2P)
 * - M-Pesa Withdraw (Agent & ATM)
 * - M-Pesa PayBill
 * - M-Pesa Buy Goods (Till)
 * - M-Pesa to Bank Transfer
 * - Bank Transfers
 * - Airtel Money
 *
 * Based on 2025 official Safaricom fee structures
 * Note: All M-Pesa fees shown are INCLUSIVE of 15% Excise Duty
 * Supports auto-calculation with manual override
 */

// ============================================================================
// M-PESA SEND MONEY (P2P) FEE TABLE (2025)
// Source: Safaricom official tariffs
// ============================================================================
const MPESA_SEND_FEES = [
  { min: 1, max: 100, fee: 0 },
  { min: 101, max: 500, fee: 7 },
  { min: 501, max: 1000, fee: 13 },
  { min: 1001, max: 1500, fee: 23 },
  { min: 1501, max: 2500, fee: 33 },
  { min: 2501, max: 3500, fee: 53 },
  { min: 3501, max: 5000, fee: 57 },
  { min: 5001, max: 7500, fee: 78 },
  { min: 7501, max: 10000, fee: 90 },
  { min: 10001, max: 15000, fee: 100 },
  { min: 15001, max: 20000, fee: 105 },
  { min: 20001, max: 35000, fee: 108 },
  { min: 35001, max: 50000, fee: 108 },
  { min: 50001, max: 150000, fee: 108 },
  { min: 150001, max: 250000, fee: 108 }
]

// ============================================================================
// M-PESA WITHDRAW (AGENT) FEE TABLE (2025)
// Minimum withdrawal: KES 50
// ============================================================================
const MPESA_WITHDRAW_AGENT_FEES = [
  { min: 50, max: 100, fee: 11 },
  { min: 101, max: 500, fee: 29 },
  { min: 501, max: 1000, fee: 29 },
  { min: 1001, max: 1500, fee: 29 },
  { min: 1501, max: 2500, fee: 29 },
  { min: 2501, max: 3500, fee: 52 },
  { min: 3501, max: 5000, fee: 69 },
  { min: 5001, max: 7500, fee: 87 },
  { min: 7501, max: 10000, fee: 115 },
  { min: 10001, max: 15000, fee: 167 },
  { min: 15001, max: 20000, fee: 185 },
  { min: 20001, max: 25000, fee: 197 },
  { min: 25001, max: 30000, fee: 220 },
  { min: 30001, max: 35000, fee: 247 },
  { min: 35001, max: 40000, fee: 270 },
  { min: 40001, max: 45000, fee: 281 },
  { min: 45001, max: 50000, fee: 292 },
  { min: 50001, max: 150000, fee: 309 }
]

// ============================================================================
// M-PESA WITHDRAW (ATM) FEE TABLE (2025)
// Minimum withdrawal: KES 200, Maximum: KES 40,000
// ============================================================================
const MPESA_WITHDRAW_ATM_FEES = [
  { min: 200, max: 2500, fee: 35 },
  { min: 2501, max: 5000, fee: 69 },
  { min: 5001, max: 10000, fee: 115 },
  { min: 10001, max: 20000, fee: 161 },
  { min: 20001, max: 40000, fee: 203 }
]

// ============================================================================
// M-PESA PAYBILL FEE TABLE (2025)
// Same structure as Send Money P2P
// ============================================================================
const MPESA_PAYBILL_FEES = [
  { min: 1, max: 100, fee: 0 },
  { min: 101, max: 500, fee: 7 },
  { min: 501, max: 1000, fee: 13 },
  { min: 1001, max: 1500, fee: 23 },
  { min: 1501, max: 2500, fee: 33 },
  { min: 2501, max: 3500, fee: 53 },
  { min: 3501, max: 5000, fee: 57 },
  { min: 5001, max: 7500, fee: 78 },
  { min: 7501, max: 10000, fee: 90 },
  { min: 10001, max: 15000, fee: 100 },
  { min: 15001, max: 20000, fee: 105 },
  { min: 20001, max: 35000, fee: 108 },
  { min: 35001, max: 50000, fee: 108 },
  { min: 50001, max: 150000, fee: 108 },
  { min: 150001, max: 250000, fee: 108 }
]

// ============================================================================
// M-PESA BUY GOODS (TILL) FEE TABLE (2025)
// FREE for customers - merchants pay the fee
// ============================================================================
const MPESA_BUY_GOODS_FEES = [
  { min: 1, max: Infinity, fee: 0 }
]

// ============================================================================
// M-PESA TO BANK TRANSFER FEE TABLE (2025)
// Varies slightly by bank, these are approximate standard rates
// ============================================================================
const MPESA_TO_BANK_FEES = [
  { min: 1, max: 100, fee: 0 },
  { min: 101, max: 500, fee: 28 },
  { min: 501, max: 1000, fee: 28 },
  { min: 1001, max: 1500, fee: 28 },
  { min: 1501, max: 2500, fee: 28 },
  { min: 2501, max: 3500, fee: 28 },
  { min: 3501, max: 5000, fee: 28 },
  { min: 5001, max: 7500, fee: 28 },
  { min: 7501, max: 10000, fee: 28 },
  { min: 10001, max: 15000, fee: 28 },
  { min: 15001, max: 20000, fee: 28 },
  { min: 20001, max: 35000, fee: 55 },
  { min: 35001, max: 50000, fee: 55 },
  { min: 50001, max: 150000, fee: 55 }
]

// ============================================================================
// BANK TRANSFER FEE TABLE (Approximate - varies by bank)
// ============================================================================
const BANK_TRANSFER_FEES = [
  { min: 1, max: 5000, fee: 0 },
  { min: 5001, max: 10000, fee: 30 },
  { min: 10001, max: 25000, fee: 50 },
  { min: 25001, max: 50000, fee: 75 },
  { min: 50001, max: 100000, fee: 100 },
  { min: 100001, max: Infinity, fee: 150 }
]

// ============================================================================
// AIRTEL MONEY FEE TABLE (2025)
// Generally 5-10% cheaper than M-Pesa
// ============================================================================
const AIRTEL_MONEY_FEES = [
  { min: 1, max: 100, fee: 0 },
  { min: 101, max: 500, fee: 5 },
  { min: 501, max: 1000, fee: 10 },
  { min: 1001, max: 1500, fee: 20 },
  { min: 1501, max: 2500, fee: 30 },
  { min: 2501, max: 3500, fee: 48 },
  { min: 3501, max: 5000, fee: 52 },
  { min: 5001, max: 7500, fee: 70 },
  { min: 7501, max: 10000, fee: 82 },
  { min: 10001, max: 15000, fee: 92 },
  { min: 15001, max: 20000, fee: 97 },
  { min: 20001, max: 35000, fee: 100 },
  { min: 35001, max: 50000, fee: 102 },
  { min: 50001, max: 150000, fee: 105 },
  { min: 150001, max: 250000, fee: 108 }
]

// ============================================================================
// FEE METHOD DEFINITIONS
// ============================================================================
export const FEE_METHODS = {
  MPESA_SEND: 'mpesa_send',
  MPESA_WITHDRAW_AGENT: 'mpesa_withdraw_agent',
  MPESA_WITHDRAW_ATM: 'mpesa_withdraw_atm',
  MPESA_PAYBILL: 'mpesa_paybill',
  MPESA_BUY_GOODS: 'mpesa_buy_goods',
  MPESA_TO_BANK: 'mpesa_to_bank',
  BANK_TRANSFER: 'bank_transfer',
  AIRTEL_MONEY: 'airtel_money',
  MANUAL: 'manual' // User manually entered fee
}

const FEE_TABLES = {
  [FEE_METHODS.MPESA_SEND]: MPESA_SEND_FEES,
  [FEE_METHODS.MPESA_WITHDRAW_AGENT]: MPESA_WITHDRAW_AGENT_FEES,
  [FEE_METHODS.MPESA_WITHDRAW_ATM]: MPESA_WITHDRAW_ATM_FEES,
  [FEE_METHODS.MPESA_PAYBILL]: MPESA_PAYBILL_FEES,
  [FEE_METHODS.MPESA_BUY_GOODS]: MPESA_BUY_GOODS_FEES,
  [FEE_METHODS.MPESA_TO_BANK]: MPESA_TO_BANK_FEES,
  [FEE_METHODS.BANK_TRANSFER]: BANK_TRANSFER_FEES,
  [FEE_METHODS.AIRTEL_MONEY]: AIRTEL_MONEY_FEES
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Calculate transaction fee based on amount and fee method
 * Note: All fees are INCLUSIVE of 15% Excise Duty
 * @param {number} amount - Transaction amount in KES
 * @param {string} feeMethod - Fee method (see FEE_METHODS)
 * @returns {number} - Fee amount in KES (inclusive of excise duty)
 */
export function calculateTransactionFee(amount, feeMethod) {
  if (!amount || amount <= 0) return 0
  if (!feeMethod || feeMethod === FEE_METHODS.MANUAL) return 0

  const feeTable = FEE_TABLES[feeMethod]
  if (!feeTable) {
    console.warn(`Unknown fee method: ${feeMethod}`)
    return 0
  }

  const tier = feeTable.find(t => amount >= t.min && amount <= t.max)
  if (!tier) {
    return feeTable[feeTable.length - 1].fee
  }

  return tier.fee
}

/**
 * Get detailed fee breakdown
 * Note: All fees shown are INCLUSIVE of 15% Excise Duty
 * @param {number} amount - Transaction amount in KES
 * @param {string} feeMethod - Fee method (see FEE_METHODS)
 * @returns {object} - Detailed breakdown {fee, totalDebit, recipientGets, cashReceived}
 */
export function calculateDetailedFee(amount, feeMethod) {
  const parsedAmount = parseFloat(amount) || 0
  const fee = calculateTransactionFee(parsedAmount, feeMethod)

  // For withdrawals, total debit is amount + fee
  // For send/transfer, total debit is amount + fee, recipient gets the amount
  const isWithdrawal = [FEE_METHODS.MPESA_WITHDRAW_AGENT, FEE_METHODS.MPESA_WITHDRAW_ATM].includes(feeMethod)

  return {
    amount: parsedAmount,
    fee,
    totalDebit: parsedAmount + fee,
    recipientGets: parsedAmount,
    cashReceived: isWithdrawal ? parsedAmount : null,
    feeMethod
  }
}

/**
 * Get fee estimation for multiple payment methods
 * Useful for showing user comparison of different payment options
 * @param {number} amount - Transaction amount in KES
 * @param {string} defaultMethod - Default/preferred method to highlight
 * @returns {Array} - Array of {method, label, fee, isDefault, savings}
 */
export function getFeeEstimation(amount, defaultMethod = FEE_METHODS.MPESA_SEND) {
  const estimations = [
    {
      method: FEE_METHODS.MPESA_SEND,
      label: 'M-Pesa Send Money',
      fee: calculateTransactionFee(amount, FEE_METHODS.MPESA_SEND),
      description: 'Send to another M-Pesa user'
    },
    {
      method: FEE_METHODS.MPESA_WITHDRAW_AGENT,
      label: 'M-Pesa Withdraw (Agent)',
      fee: calculateTransactionFee(amount, FEE_METHODS.MPESA_WITHDRAW_AGENT),
      description: 'Withdraw cash from M-Pesa agent'
    },
    {
      method: FEE_METHODS.MPESA_WITHDRAW_ATM,
      label: 'M-Pesa Withdraw (ATM)',
      fee: calculateTransactionFee(amount, FEE_METHODS.MPESA_WITHDRAW_ATM),
      description: 'Withdraw cash from ATM'
    },
    {
      method: FEE_METHODS.BANK_TRANSFER,
      label: 'Bank Transfer',
      fee: calculateTransactionFee(amount, FEE_METHODS.BANK_TRANSFER),
      description: 'Mobile/internet banking transfer'
    },
    {
      method: FEE_METHODS.AIRTEL_MONEY,
      label: 'Airtel Money',
      fee: calculateTransactionFee(amount, FEE_METHODS.AIRTEL_MONEY),
      description: 'Send via Airtel Money'
    }
  ]

  // Mark default method
  estimations.forEach(est => {
    est.isDefault = est.method === defaultMethod
  })

  // Calculate savings compared to default
  const defaultFee = estimations.find(e => e.isDefault)?.fee || 0
  estimations.forEach(est => {
    est.savings = defaultFee - est.fee
  })

  // Sort by fee (lowest first)
  return estimations.sort((a, b) => a.fee - b.fee)
}

/**
 * Get available fee methods with labels
 * @returns {Array} - Array of {value, label, description, icon, category}
 */
export function getAvailableFeeMethods() {
  return [
    {
      value: FEE_METHODS.MPESA_SEND,
      label: 'Send Money (P2P)',
      description: 'Send to another M-Pesa user',
      category: 'mpesa',
      icon: 'send'
    },
    {
      value: FEE_METHODS.MPESA_WITHDRAW_AGENT,
      label: 'Withdraw at Agent',
      description: 'Withdraw cash from M-Pesa agent',
      category: 'mpesa',
      icon: 'agent',
      minAmount: 50,
      maxAmount: 150000
    },
    {
      value: FEE_METHODS.MPESA_WITHDRAW_ATM,
      label: 'Withdraw at ATM',
      description: 'Withdraw cash from ATM',
      category: 'mpesa',
      icon: 'atm',
      minAmount: 200,
      maxAmount: 40000
    },
    {
      value: FEE_METHODS.MPESA_PAYBILL,
      label: 'PayBill',
      description: 'Pay bills and utilities',
      category: 'mpesa',
      icon: 'paybill'
    },
    {
      value: FEE_METHODS.MPESA_BUY_GOODS,
      label: 'Buy Goods (Till)',
      description: 'Pay at merchant till - FREE',
      category: 'mpesa',
      icon: 'till'
    },
    {
      value: FEE_METHODS.MPESA_TO_BANK,
      label: 'M-Pesa to Bank',
      description: 'Transfer to bank account',
      category: 'mpesa',
      icon: 'bank'
    },
    {
      value: FEE_METHODS.BANK_TRANSFER,
      label: 'Bank Transfer',
      description: 'Mobile/internet banking',
      category: 'bank',
      icon: 'bank'
    },
    {
      value: FEE_METHODS.AIRTEL_MONEY,
      label: 'Airtel Money',
      description: 'Send via Airtel Money',
      category: 'airtel',
      icon: 'airtel'
    },
    {
      value: FEE_METHODS.MANUAL,
      label: 'Manual Entry',
      description: 'Enter fee manually',
      category: 'other',
      icon: 'manual'
    }
  ]
}

/**
 * Get M-Pesa specific fee methods only
 * @returns {Array} - Array of M-Pesa fee methods
 */
export function getMpesaFeeMethods() {
  return getAvailableFeeMethods().filter(m => m.category === 'mpesa')
}

/**
 * Format fee breakdown for display
 * @param {number} amount - Transaction amount
 * @param {number} fee - Transaction fee
 * @param {string} paymentMethod - Payment method used
 * @returns {object} - {amount, fee, total, method, formattedAmount, formattedFee, formattedTotal}
 */
export function formatFeeBreakdown(amount, fee, paymentMethod) {
  // Handle invalid/empty inputs with explicit NaN check
  const parsedAmount = parseFloat(amount)
  const parsedFee = parseFloat(fee)

  const validAmount = isNaN(parsedAmount) ? 0 : parsedAmount
  const validFee = isNaN(parsedFee) ? 0 : parsedFee
  const total = validAmount + validFee

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  return {
    amount: validAmount,
    fee: validFee,
    total: total,
    method: paymentMethod,
    formattedAmount: formatCurrency(validAmount),
    formattedFee: formatCurrency(validFee),
    formattedTotal: formatCurrency(total)
  }
}

/**
 * Get fee tier information for an amount
 * Useful for showing user which tier they're in
 * @param {number} amount - Transaction amount
 * @param {string} feeMethod - Fee method
 * @returns {object|null} - {min, max, fee, nextTier}
 */
export function getFeeTierInfo(amount, feeMethod) {
  const feeTable = FEE_TABLES[feeMethod]
  if (!feeTable) return null

  const currentTierIndex = feeTable.findIndex(t => amount >= t.min && amount <= t.max)
  if (currentTierIndex === -1) return null

  const currentTier = feeTable[currentTierIndex]
  const nextTier = feeTable[currentTierIndex + 1] || null

  return {
    min: currentTier.min,
    max: currentTier.max,
    fee: currentTier.fee,
    nextTier: nextTier ? {
      min: nextTier.min,
      max: nextTier.max,
      fee: nextTier.fee,
      amountUntilNextTier: nextTier.min - amount
    } : null
  }
}

/**
 * Suggest cheapest payment method for an amount
 * @param {number} amount - Transaction amount
 * @returns {object} - {method, label, fee, savings}
 */
export function suggestCheapestMethod(amount) {
  const estimations = getFeeEstimation(amount)
  const cheapest = estimations[0] // Already sorted by fee

  return {
    method: cheapest.method,
    label: cheapest.label,
    fee: cheapest.fee,
    description: cheapest.description,
    savings: estimations.find(e => e.method === FEE_METHODS.MPESA_SEND)?.fee - cheapest.fee
  }
}

// ============================================================================
// EXPORT ALL
// ============================================================================
export default {
  FEE_METHODS,
  calculateTransactionFee,
  calculateDetailedFee,
  getFeeEstimation,
  getAvailableFeeMethods,
  getMpesaFeeMethods,
  formatFeeBreakdown,
  getFeeTierInfo,
  suggestCheapestMethod
}
