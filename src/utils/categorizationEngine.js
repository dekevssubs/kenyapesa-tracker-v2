/**
 * Auto-Categorization Engine
 *
 * Purpose: Deterministic, explainable transaction categorization
 *
 * Core Principles:
 * - Deterministic (same input → same output)
 * - Explainable (log why each category was assigned)
 * - User overrides always win
 * - Safety over coverage (better uncategorized than miscategorized)
 *
 * Rule Evaluation Order:
 * 1. System transaction types
 * 2. Transfer detection
 * 3. Fee detection
 * 4. Merchant / Paybill match
 * 5. Keyword match
 * 6. Account-based fallback
 * 7. Uncategorized
 */

import { supabase } from './supabase'

// =====================================================
// RULE EVALUATION ORDER (Priority)
// =====================================================
const CATEGORIZATION_METHODS = {
  USER_OVERRIDE: 'user_override',        // Priority 0 (highest)
  SYSTEM_TYPE: 'system_type',            // Priority 1
  TRANSFER_DETECTION: 'transfer_detection', // Priority 2
  FEE_DETECTION: 'fee_detection',        // Priority 3
  PAYBILL_MATCH: 'paybill_match',        // Priority 4
  MERCHANT_MATCH: 'merchant_match',      // Priority 5
  KEYWORD_MATCH: 'keyword_match',        // Priority 6
  ACCOUNT_FALLBACK: 'account_fallback',  // Priority 7
  UNCATEGORIZED: 'uncategorized'         // Priority 8 (default)
}

// =====================================================
// SYSTEM TRANSACTION TYPE → CATEGORY MAPPING
// =====================================================
const SYSTEM_TYPE_CATEGORIES = {
  'income': 'income',                    // Income transactions
  'transfer': null,                      // Transfers are EXCLUDED from categorization
  'investment_deposit': 'savings',       // Investment deposits → savings
  'investment_withdrawal': 'savings',    // Investment withdrawals → savings
  'investment_return': 'income',         // Investment returns → income
  'lending': 'debt',                     // Money lent out → debt (receivable)
  'repayment': 'income',                 // Loan repayment received → income
  'transaction_fee': 'fees',             // Transaction fees → fees
  'reversal': null,                      // Reversals are EXCLUDED (metadata only)
  'expense': null,                       // Expenses need further categorization
  'bad_debt_write_off': 'debt'           // Bad debt write-offs → debt
}

// =====================================================
// CATEGORIZATION ENGINE CLASS
// =====================================================
class CategorizationEngine {
  /**
   * Categorize a transaction based on rule evaluation order
   * @param {Object} transaction - Transaction object from account_transactions
   * @param {UUID} userId - User ID for rule lookups
   * @returns {Object} { categoryId, method, confidence, explanation }
   */
  static async categorizeTransaction(transaction, userId) {
    // Step 0: Check for user override (highest priority)
    const override = await this.checkUserOverride(transaction.id, userId)
    if (override) return override

    // Step 1: Check system transaction type
    const systemCategory = await this.checkSystemType(transaction, userId)
    if (systemCategory) return systemCategory

    // Step 2: Check if it's a transfer (exclude from categorization)
    const isTransfer = await this.detectTransfer(transaction, userId)
    if (isTransfer) return isTransfer

    // Step 3: Check if it's a fee
    const isFee = await this.detectFee(transaction, userId)
    if (isFee) return isFee

    // Step 4: Check merchant/paybill match
    const merchantMatch = await this.matchMerchantOrPaybill(transaction, userId)
    if (merchantMatch) return merchantMatch

    // Step 5: Check keyword match
    const keywordMatch = await this.matchKeyword(transaction, userId)
    if (keywordMatch) return keywordMatch

    // Step 6: Account-based fallback
    const accountFallback = await this.accountBasedFallback(transaction, userId)
    if (accountFallback) return accountFallback

    // Step 7: Uncategorized (safe fallback)
    return this.uncategorized(transaction, userId)
  }

  // =====================================================
  // STEP 0: User Override (Highest Priority)
  // =====================================================
  static async checkUserOverride(transactionId, userId) {
    try {
      const { data, error } = await supabase
        .from('category_overrides')
        .select(`
          id,
          category_id,
          override_reason,
          expense_categories (
            id,
            name,
            slug
          )
        `)
        .eq('transaction_id', transactionId)
        .eq('user_id', userId)
        .single()

      if (error || !data) return null

      return {
        categoryId: data.category_id,
        categorySlug: data.expense_categories.slug,
        categoryName: data.expense_categories.name,
        method: CATEGORIZATION_METHODS.USER_OVERRIDE,
        confidence: 1.0,
        explanation: `User manually categorized as "${data.expense_categories.name}"`,
        ruleId: null,
        overrideId: data.id
      }
    } catch (err) {
      console.error('Error checking user override:', err)
      return null
    }
  }

  // =====================================================
  // STEP 1: System Transaction Type
  // =====================================================
  static async checkSystemType(transaction, userId) {
    const transactionType = transaction.transaction_type
    const categorySlug = SYSTEM_TYPE_CATEGORIES[transactionType]

    // If no mapping or explicitly null (transfers, reversals), skip
    if (!categorySlug) return null

    // Get category ID from slug
    const { data, error } = await supabase
      .rpc('get_category_id', {
        p_user_id: userId,
        p_slug: categorySlug
      })

    if (error || !data) return null

    return {
      categoryId: data,
      categorySlug,
      method: CATEGORIZATION_METHODS.SYSTEM_TYPE,
      confidence: 1.0,
      explanation: `System transaction type "${transactionType}" → "${categorySlug}"`,
      ruleId: null,
      overrideId: null
    }
  }

  // =====================================================
  // STEP 2: Transfer Detection
  // =====================================================
  static async detectTransfer(transaction, userId) {
    const transactionType = transaction.transaction_type

    // Explicit transfers are excluded
    if (transactionType === 'transfer') {
      return {
        categoryId: null,
        categorySlug: null,
        method: CATEGORIZATION_METHODS.TRANSFER_DETECTION,
        confidence: 1.0,
        explanation: 'Transfer transactions are excluded from categorization',
        ruleId: null,
        overrideId: null,
        isTransfer: true // Flag for exclusion
      }
    }

    // Check if both from_account_id and to_account_id belong to same user
    if (transaction.from_account_id && transaction.to_account_id) {
      const { data: fromAccount } = await supabase
        .from('accounts')
        .select('user_id')
        .eq('id', transaction.from_account_id)
        .single()

      const { data: toAccount } = await supabase
        .from('accounts')
        .select('user_id')
        .eq('id', transaction.to_account_id)
        .single()

      if (fromAccount?.user_id === userId && toAccount?.user_id === userId) {
        return {
          categoryId: null,
          categorySlug: null,
          method: CATEGORIZATION_METHODS.TRANSFER_DETECTION,
          confidence: 0.95,
          explanation: 'Detected as internal transfer (both accounts belong to user)',
          ruleId: null,
          overrideId: null,
          isTransfer: true
        }
      }
    }

    return null // Not a transfer
  }

  // =====================================================
  // STEP 3: Fee Detection
  // =====================================================
  static async detectFee(transaction, userId) {
    const transactionType = transaction.transaction_type

    // Explicit fee transactions
    if (transactionType === 'transaction_fee') {
      // Get "fees" category
      const { data: categoryId } = await supabase
        .rpc('get_category_id', {
          p_user_id: userId,
          p_slug: 'fees'
        })

      if (!categoryId) return null

      return {
        categoryId,
        categorySlug: 'fees',
        method: CATEGORIZATION_METHODS.FEE_DETECTION,
        confidence: 1.0,
        explanation: 'Transaction fee detected from system type',
        ruleId: null,
        overrideId: null
      }
    }

    // Keyword-based fee detection in description
    const description = (transaction.description || '').toLowerCase()
    const feeKeywords = ['fee', 'charge', 'commission', 'service charge', 'bank charge']

    for (const keyword of feeKeywords) {
      if (description.includes(keyword)) {
        const { data: categoryId } = await supabase
          .rpc('get_category_id', {
            p_user_id: userId,
            p_slug: 'fees'
          })

        if (!categoryId) return null

        return {
          categoryId,
          categorySlug: 'fees',
          method: CATEGORIZATION_METHODS.FEE_DETECTION,
          confidence: 0.85,
          explanation: `Fee keyword detected: "${keyword}"`,
          ruleId: null,
          overrideId: null
        }
      }
    }

    return null // Not a fee
  }

  // =====================================================
  // STEP 4: Merchant / Paybill Match
  // =====================================================
  static async matchMerchantOrPaybill(transaction, userId) {
    const description = (transaction.description || '').toLowerCase()
    const counterparty = (transaction.counterparty || '').toLowerCase()
    const paybillNumber = transaction.paybill_number

    // Query categorization_rules for merchant and paybill matches
    const { data: rules, error } = await supabase
      .from('categorization_rules')
      .select(`
        id,
        category_id,
        pattern,
        match_field,
        min_amount,
        max_amount,
        confidence_score,
        rule_type,
        expense_categories (
          id,
          slug,
          name
        )
      `)
      .eq('user_id', userId)
      .in('rule_type', ['merchant', 'paybill'])
      .eq('is_active', true)
      .order('priority', { ascending: false })

    if (error || !rules || rules.length === 0) return null

    // Check each rule
    for (const rule of rules) {
      const pattern = rule.pattern.toLowerCase()
      let isMatch = false

      // Amount range check
      if (rule.min_amount && transaction.amount < rule.min_amount) continue
      if (rule.max_amount && transaction.amount > rule.max_amount) continue

      // Field-specific matching
      switch (rule.match_field) {
        case 'description':
          isMatch = description.includes(pattern)
          break
        case 'counterparty':
          isMatch = counterparty.includes(pattern)
          break
        case 'paybill_number':
          isMatch = paybillNumber === pattern
          break
        default:
          // Match against any field
          isMatch = description.includes(pattern) || counterparty.includes(pattern)
      }

      if (isMatch) {
        // Update rule match count
        await this.updateRuleMatchCount(rule.id)

        return {
          categoryId: rule.category_id,
          categorySlug: rule.expense_categories.slug,
          categoryName: rule.expense_categories.name,
          method: rule.rule_type === 'merchant' ? CATEGORIZATION_METHODS.MERCHANT_MATCH : CATEGORIZATION_METHODS.PAYBILL_MATCH,
          confidence: rule.confidence_score || 0.9,
          explanation: `Matched ${rule.rule_type} pattern: "${rule.pattern}" in ${rule.match_field}`,
          ruleId: rule.id,
          overrideId: null
        }
      }
    }

    return null // No match
  }

  // =====================================================
  // STEP 5: Keyword Match
  // =====================================================
  static async matchKeyword(transaction, userId) {
    const description = (transaction.description || '').toLowerCase()
    const notes = (transaction.notes || '').toLowerCase()

    // Query categorization_rules for keyword matches
    const { data: rules, error } = await supabase
      .from('categorization_rules')
      .select(`
        id,
        category_id,
        pattern,
        match_field,
        min_amount,
        max_amount,
        confidence_score,
        expense_categories (
          id,
          slug,
          name
        )
      `)
      .eq('user_id', userId)
      .eq('rule_type', 'keyword')
      .eq('is_active', true)
      .order('priority', { ascending: false })

    if (error || !rules || rules.length === 0) return null

    // Check each keyword rule
    for (const rule of rules) {
      const keyword = rule.pattern.toLowerCase()
      let isMatch = false

      // Amount range check
      if (rule.min_amount && transaction.amount < rule.min_amount) continue
      if (rule.max_amount && transaction.amount > rule.max_amount) continue

      // Field-specific matching
      switch (rule.match_field) {
        case 'description':
          isMatch = description.includes(keyword)
          break
        case 'notes':
          isMatch = notes.includes(keyword)
          break
        default:
          // Match against description or notes
          isMatch = description.includes(keyword) || notes.includes(keyword)
      }

      if (isMatch) {
        // Update rule match count
        await this.updateRuleMatchCount(rule.id)

        return {
          categoryId: rule.category_id,
          categorySlug: rule.expense_categories.slug,
          categoryName: rule.expense_categories.name,
          method: CATEGORIZATION_METHODS.KEYWORD_MATCH,
          confidence: rule.confidence_score || 0.75,
          explanation: `Matched keyword: "${rule.pattern}" in ${rule.match_field || 'description/notes'}`,
          ruleId: rule.id,
          overrideId: null
        }
      }
    }

    return null // No match
  }

  // =====================================================
  // STEP 6: Account-Based Fallback
  // =====================================================
  static async accountBasedFallback(transaction, userId) {
    const accountId = transaction.from_account_id || transaction.to_account_id
    if (!accountId) return null

    // Query categorization_rules for account fallback
    const { data: rules, error } = await supabase
      .from('categorization_rules')
      .select(`
        id,
        category_id,
        confidence_score,
        expense_categories (
          id,
          slug,
          name
        )
      `)
      .eq('user_id', userId)
      .eq('rule_type', 'account_fallback')
      .eq('account_id', accountId)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (error || !rules) return null

    // Update rule match count
    await this.updateRuleMatchCount(rules.id)

    return {
      categoryId: rules.category_id,
      categorySlug: rules.expense_categories.slug,
      categoryName: rules.expense_categories.name,
      method: CATEGORIZATION_METHODS.ACCOUNT_FALLBACK,
      confidence: rules.confidence_score || 0.5,
      explanation: `Account-based fallback for account ${accountId}`,
      ruleId: rules.id,
      overrideId: null
    }
  }

  // =====================================================
  // STEP 7: Uncategorized (Safe Default)
  // =====================================================
  static async uncategorized(transaction, userId) {
    // Get "other" category as fallback
    const { data: categoryId } = await supabase
      .rpc('get_category_id', {
        p_user_id: userId,
        p_slug: 'other'
      })

    return {
      categoryId: categoryId || null,
      categorySlug: 'other',
      method: CATEGORIZATION_METHODS.UNCATEGORIZED,
      confidence: 0.0,
      explanation: 'No matching rules found - categorized as "Other"',
      ruleId: null,
      overrideId: null,
      isUncategorized: true
    }
  }

  // =====================================================
  // HELPER: Update Rule Match Count
  // =====================================================
  static async updateRuleMatchCount(ruleId) {
    try {
      await supabase.rpc('increment', {
        table_name: 'categorization_rules',
        row_id: ruleId,
        column_name: 'times_matched'
      })

      await supabase
        .from('categorization_rules')
        .update({ last_matched_at: new Date().toISOString() })
        .eq('id', ruleId)
    } catch (err) {
      console.error('Error updating rule match count:', err)
    }
  }

  // =====================================================
  // AUDIT LOG: Save categorization decision
  // =====================================================
  static async logCategorization(transaction, categorization, userId) {
    // Skip logging for transfers and reversals
    if (categorization.isTransfer) return

    try {
      await supabase
        .from('categorization_audit_log')
        .insert({
          transaction_id: transaction.id,
          user_id: userId,
          category_id: categorization.categoryId,
          categorization_method: categorization.method,
          rule_id: categorization.ruleId,
          override_id: categorization.overrideId,
          confidence_score: categorization.confidence,
          explanation: categorization.explanation
        })
    } catch (err) {
      console.error('Error logging categorization:', err)
    }
  }

  // =====================================================
  // USER OVERRIDE: Create manual category assignment
  // =====================================================
  static async createOverride(transactionId, categoryId, userId, reason = 'manual') {
    try {
      // Get current category (if any)
      const { data: transaction } = await supabase
        .from('account_transactions')
        .select('category_id')
        .eq('id', transactionId)
        .single()

      const previousCategoryId = transaction?.category_id || null

      // Insert or update override
      const { data, error } = await supabase
        .from('category_overrides')
        .upsert({
          transaction_id: transactionId,
          category_id: categoryId,
          user_id: userId,
          override_reason: reason,
          previous_category_id: previousCategoryId,
          confidence_score: 1.0
        }, {
          onConflict: 'transaction_id'
        })
        .select()
        .single()

      if (error) throw error

      // Update transaction category_id in account_transactions
      await supabase
        .from('account_transactions')
        .update({ category_id: categoryId })
        .eq('id', transactionId)

      return { success: true, data }
    } catch (err) {
      console.error('Error creating category override:', err)
      return { success: false, error: err.message }
    }
  }

  // =====================================================
  // BATCH CATEGORIZATION: Categorize multiple transactions
  // =====================================================
  static async categorizeTransactions(transactions, userId) {
    const results = []

    for (const transaction of transactions) {
      try {
        const categorization = await this.categorizeTransaction(transaction, userId)

        // Log to audit trail
        await this.logCategorization(transaction, categorization, userId)

        // Update transaction if category found and not a transfer
        if (categorization.categoryId && !categorization.isTransfer) {
          await supabase
            .from('account_transactions')
            .update({ category_id: categorization.categoryId })
            .eq('id', transaction.id)
        }

        results.push({
          transactionId: transaction.id,
          categorization,
          success: true
        })
      } catch (err) {
        console.error(`Error categorizing transaction ${transaction.id}:`, err)
        results.push({
          transactionId: transaction.id,
          error: err.message,
          success: false
        })
      }
    }

    return results
  }
}

export default CategorizationEngine
export { CATEGORIZATION_METHODS }
