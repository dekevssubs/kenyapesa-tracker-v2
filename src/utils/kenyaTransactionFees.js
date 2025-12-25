/**
 * Kenya Transaction Fees Calculator
 *
 * Calculates transaction fees for various Kenya payment methods:
 * - M-Pesa Send Money
 * - M-Pesa Withdraw (Agent & ATM)
 * - Bank Transfers
 * - Airtel Money
 *
 * Based on 2024/2025 official fee structures
 * Supports auto-calculation with manual override
 */

// ============================================================================
// M-PESA SEND MONEY FEE TABLE (2024/2025)
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
  { min: 35001, max: 50000, fee: 110 },
  { min: 50001, max: 150000, fee: 113 },
  { min: 150001, max: 250000, fee: 115 },
  { min: 250001, max: 500000, fee: 115 }
]

// ============================================================================
// M-PESA WITHDRAW (AGENT) FEE TABLE (2024/2025)
// ============================================================================
const MPESA_WITHDRAW_AGENT_FEES = [
  { min: 50, max: 100, fee: 11 },
  { min: 101, max: 1500, fee: 29 },
  { min: 1501, max: 2500, fee: 54 },
  { min: 2501, max: 3500, fee: 69 },
  { min: 3501, max: 5000, fee: 87 },
  { min: 5001, max: 7500, fee: 115 },
  { min: 7501, max: 10000, fee: 167 },
  { min: 10001, max: 15000, fee: 185 },
  { min: 15001, max: 20000, fee: 197 },
  { min: 20001, max: 25000, fee: 208 },
  { min: 25001, max: 30000, fee: 220 },
  { min: 30001, max: 35000, fee: 255 },
  { min: 35001, max: 40000, fee: 278 },
  { min: 40001, max: 45000, fee: 289 },
  { min: 45001, max: 50000, fee: 300 },
  { min: 50001, max: 70000, fee: 346 }
]

// ============================================================================
// M-PESA WITHDRAW (ATM) FEE TABLE (2024/2025)
// ============================================================================
const MPESA_WITHDRAW_ATM_FEES = [
  { min: 200, max: 2500, fee: 33 },
  { min: 2501, max: 5000, fee: 67 },
  { min: 5001, max: 10000, fee: 100 },
  { min: 10001, max: 20000, fee: 133 },
  { min: 20001, max: 30000, fee: 150 }
]

// ============================================================================
// BANK TRANSFER FEE TABLE (Approximate - varies by bank)
// ============================================================================
const BANK_TRANSFER_FEES = [
  { min: 1, max: 5000, fee: 0 },      // Most banks: free internal transfers
  { min: 5001, max: 10000, fee: 30 },  // Small transfers
  { min: 10001, max: 25000, fee: 50 }, // Medium transfers
  { min: 25001, max: 50000, fee: 75 }, // Large transfers
  { min: 50001, max: 100000, fee: 100 }, // Very large transfers
  { min: 100001, max: Infinity, fee: 150 } // Maximum fee
]

// ============================================================================
// AIRTEL MONEY FEE TABLE (2024/2025)
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
  { min: 150001, max: 250000, fee: 108 },
  { min: 250001, max: 500000, fee: 125 }
]

// ============================================================================
// FEE METHOD DEFINITIONS
// ============================================================================
export const FEE_METHODS = {
  MPESA_SEND: 'mpesa_send',
  MPESA_WITHDRAW_AGENT: 'mpesa_withdraw_agent',
  MPESA_WITHDRAW_ATM: 'mpesa_withdraw_atm',
  BANK_TRANSFER: 'bank_transfer',
  AIRTEL_MONEY: 'airtel_money',
  MANUAL: 'manual' // User manually entered fee
}

const FEE_TABLES = {
  [FEE_METHODS.MPESA_SEND]: MPESA_SEND_FEES,
  [FEE_METHODS.MPESA_WITHDRAW_AGENT]: MPESA_WITHDRAW_AGENT_FEES,
  [FEE_METHODS.MPESA_WITHDRAW_ATM]: MPESA_WITHDRAW_ATM_FEES,
  [FEE_METHODS.BANK_TRANSFER]: BANK_TRANSFER_FEES,
  [FEE_METHODS.AIRTEL_MONEY]: AIRTEL_MONEY_FEES
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Calculate transaction fee based on amount and fee method
 * @param {number} amount - Transaction amount in KES
 * @param {string} feeMethod - Fee method (see FEE_METHODS)
 * @returns {number} - Fee amount in KES
 */
export function calculateTransactionFee(amount, feeMethod) {
  // Validate inputs
  if (!amount || amount <= 0) {
    return 0
  }

  if (!feeMethod || feeMethod === FEE_METHODS.MANUAL) {
    return 0 // Manual override - caller provides fee
  }

  // Get fee table for method
  const feeTable = FEE_TABLES[feeMethod]
  if (!feeTable) {
    console.warn(`Unknown fee method: ${feeMethod}`)
    return 0
  }

  // Find matching tier
  const tier = feeTable.find(t => amount >= t.min && amount <= t.max)
  if (!tier) {
    // Amount exceeds maximum tier - use highest tier fee
    return feeTable[feeTable.length - 1].fee
  }

  return tier.fee
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
 * @returns {Array} - Array of {value, label, description}
 */
export function getAvailableFeeMethods() {
  return [
    {
      value: FEE_METHODS.MPESA_SEND,
      label: 'M-Pesa Send Money',
      description: 'Send to another M-Pesa user'
    },
    {
      value: FEE_METHODS.MPESA_WITHDRAW_AGENT,
      label: 'M-Pesa Withdraw (Agent)',
      description: 'Withdraw cash from agent'
    },
    {
      value: FEE_METHODS.MPESA_WITHDRAW_ATM,
      label: 'M-Pesa Withdraw (ATM)',
      description: 'Withdraw cash from ATM'
    },
    {
      value: FEE_METHODS.BANK_TRANSFER,
      label: 'Bank Transfer',
      description: 'Mobile/internet banking'
    },
    {
      value: FEE_METHODS.AIRTEL_MONEY,
      label: 'Airtel Money',
      description: 'Send via Airtel Money'
    },
    {
      value: FEE_METHODS.MANUAL,
      label: 'Manual Override',
      description: 'Enter fee manually'
    }
  ]
}

/**
 * Format fee breakdown for display
 * @param {number} amount - Transaction amount
 * @param {number} fee - Transaction fee
 * @param {string} paymentMethod - Payment method used
 * @returns {object} - {amount, fee, total, method, formattedAmount, formattedFee, formattedTotal}
 */
export function formatFeeBreakdown(amount, fee, paymentMethod) {
  // Handle invalid/empty inputs
  const validAmount = parseFloat(amount) || 0
  const validFee = parseFloat(fee) || 0
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
  getFeeEstimation,
  getAvailableFeeMethods,
  formatFeeBreakdown,
  getFeeTierInfo,
  suggestCheapestMethod
}
