/**
 * Income Service
 *
 * Handles income creation with account integration and custom deductions
 * Features:
 * - Account selection (where income is deposited)
 * - Custom deductions (SACCO, loans, insurance, etc.) beyond statutory
 * - Integration with account_transactions table
 * - Automatic balance updates via database triggers
 */

export class IncomeService {
  constructor(supabase, userId) {
    this.supabase = supabase
    this.userId = userId
  }

  /**
   * Custom deduction types
   */
  static DEDUCTION_TYPES = {
    SACCO: 'sacco',
    PERSONAL_LOAN: 'personal_loan',
    HELB_LOAN: 'helb_loan',
    CAR_LOAN: 'car_loan',
    MORTGAGE: 'mortgage',
    INSURANCE: 'insurance',
    RETIREMENT: 'retirement',
    INVESTMENT: 'investment',
    SAVINGS: 'savings',
    WELFARE: 'welfare',
    UNION_DUES: 'union_dues',
    OTHER: 'other'
  }

  /**
   * Get custom deduction types with labels
   * @returns {Array} - Array of {value, label, description}
   */
  static getDeductionTypes() {
    return [
      {
        value: IncomeService.DEDUCTION_TYPES.SACCO,
        label: 'SACCO Contribution',
        description: 'Monthly SACCO savings/shares contribution'
      },
      {
        value: IncomeService.DEDUCTION_TYPES.HELB_LOAN,
        label: 'HELB Loan Repayment',
        description: 'Higher Education Loans Board loan repayment'
      },
      {
        value: IncomeService.DEDUCTION_TYPES.CAR_LOAN,
        label: 'Car Loan',
        description: 'Vehicle loan repayment'
      },
      {
        value: IncomeService.DEDUCTION_TYPES.MORTGAGE,
        label: 'Mortgage',
        description: 'Home/property mortgage payment'
      },
      {
        value: IncomeService.DEDUCTION_TYPES.PERSONAL_LOAN,
        label: 'Personal Loan',
        description: 'Personal/bank loan repayment'
      },
      {
        value: IncomeService.DEDUCTION_TYPES.INSURANCE,
        label: 'Insurance Premium',
        description: 'Life, health, or other insurance'
      },
      {
        value: IncomeService.DEDUCTION_TYPES.RETIREMENT,
        label: 'Retirement Savings',
        description: 'Additional pension/retirement contributions'
      },
      {
        value: IncomeService.DEDUCTION_TYPES.INVESTMENT,
        label: 'Investment Deduction',
        description: 'Auto-investment from salary (MMF, stocks, etc.)'
      },
      {
        value: IncomeService.DEDUCTION_TYPES.SAVINGS,
        label: 'Savings Plan',
        description: 'Regular savings plan deduction'
      },
      {
        value: IncomeService.DEDUCTION_TYPES.WELFARE,
        label: 'Welfare/Benevolent Fund',
        description: 'Company or group welfare contributions'
      },
      {
        value: IncomeService.DEDUCTION_TYPES.UNION_DUES,
        label: 'Union/Association Dues',
        description: 'Professional association or union fees'
      },
      {
        value: IncomeService.DEDUCTION_TYPES.OTHER,
        label: 'Other Deduction',
        description: 'Custom or other deductions'
      }
    ]
  }

  /**
   * Create income with account integration and custom deductions
   * @param {object} incomeData - Income data
   * @param {Array} customDeductions - Array of custom deductions
   * @returns {Promise<object>} - {success, incomeId, accountTransactionId, deductionIds, netAmount, error}
   */
  async createIncome(incomeData, customDeductions = []) {
    try {
      const {
        account_id,
        amount,
        source,
        date,
        description,
        tax_amount,
        statutory_deductions
      } = incomeData

      // Validate required fields
      if (!account_id) {
        return {
          success: false,
          error: 'Account selection is required'
        }
      }

      if (!amount || amount <= 0) {
        return {
          success: false,
          error: 'Valid amount is required'
        }
      }

      // Calculate total custom deductions
      const totalCustomDeductions = customDeductions.reduce(
        (sum, deduction) => sum + parseFloat(deduction.amount || 0),
        0
      )

      // Calculate net amount after all deductions
      const grossAmount = parseFloat(amount)
      const taxAmount = parseFloat(tax_amount || 0)
      const statutoryAmount = parseFloat(statutory_deductions || 0)
      const netAmount = grossAmount - taxAmount - statutoryAmount - totalCustomDeductions

      // Step 1: Create income record
      const { data: income, error: incomeError } = await this.supabase
        .from('income')
        .insert({
          user_id: this.userId,
          account_id,
          amount: grossAmount,
          source,
          date,
          description,
          tax_amount: taxAmount,
          statutory_deductions: statutoryAmount
        })
        .select('id')
        .single()

      if (incomeError) throw incomeError

      const deductionIds = []

      // Step 2: Save custom deductions to custom_deductions table
      if (customDeductions && customDeductions.length > 0) {
        const deductionsToInsert = customDeductions.map(deduction => ({
          user_id: this.userId,
          income_id: income.id,
          deduction_type: deduction.deduction_type,
          deduction_name: deduction.deduction_name,
          amount: parseFloat(deduction.amount),
          is_recurring: deduction.is_recurring || false,
          frequency: deduction.frequency || 'monthly',
          notes: deduction.notes || null
        }))

        const { data: insertedDeductions, error: deductionsError } = await this.supabase
          .from('custom_deductions')
          .insert(deductionsToInsert)
          .select('id')

        if (deductionsError) throw deductionsError

        deductionIds.push(...insertedDeductions.map(d => d.id))
      }

      // Step 3: Create account_transaction (income flows TO account)
      // Use NET amount (after all deductions)
      const { data: accountTransaction, error: txError } = await this.supabase
        .from('account_transactions')
        .insert({
          user_id: this.userId,
          to_account_id: account_id, // Money flows INTO account
          transaction_type: 'income',
          amount: netAmount, // Net amount after deductions
          date,
          category: source,
          description: description || `Income from ${source}`,
          reference_id: income.id,
          reference_type: 'income'
        })
        .select('id')
        .single()

      if (txError) throw txError

      // Step 4: Balance is automatically updated by database trigger

      return {
        success: true,
        incomeId: income.id,
        accountTransactionId: accountTransaction.id,
        deductionIds,
        grossAmount,
        totalDeductions: taxAmount + statutoryAmount + totalCustomDeductions,
        netAmount
      }
    } catch (error) {
      console.error('Error creating income:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Get income with custom deductions
   * @param {string} incomeId - Income ID
   * @returns {Promise<object>} - {success, income, customDeductions, totalDeductions, netAmount, error}
   */
  async getIncomeWithDeductions(incomeId) {
    try {
      // Get income with account info
      const { data: income, error: incomeError } = await this.supabase
        .from('income')
        .select(`
          *,
          accounts (
            id,
            name,
            account_type,
            current_balance
          )
        `)
        .eq('id', incomeId)
        .eq('user_id', this.userId)
        .single()

      if (incomeError) throw incomeError

      // Get custom deductions
      const { data: customDeductions, error: deductionsError } = await this.supabase
        .from('custom_deductions')
        .select('*')
        .eq('income_id', incomeId)
        .order('created_at', { ascending: true })

      if (deductionsError) throw deductionsError

      // Calculate totals
      const grossAmount = parseFloat(income.amount)
      const taxAmount = parseFloat(income.tax_amount || 0)
      const statutoryAmount = parseFloat(income.statutory_deductions || 0)
      const customDeductionsTotal = (customDeductions || []).reduce(
        (sum, d) => sum + parseFloat(d.amount),
        0
      )
      const totalDeductions = taxAmount + statutoryAmount + customDeductionsTotal
      const netAmount = grossAmount - totalDeductions

      return {
        success: true,
        income,
        customDeductions: customDeductions || [],
        grossAmount,
        taxAmount,
        statutoryAmount,
        customDeductionsTotal,
        totalDeductions,
        netAmount
      }
    } catch (error) {
      console.error('Error getting income with deductions:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Update custom deductions for an income record
   * @param {string} incomeId - Income ID
   * @param {Array} customDeductions - New deductions array
   * @returns {Promise<object>} - {success, error}
   */
  async updateCustomDeductions(incomeId, customDeductions) {
    try {
      // Delete existing custom deductions
      const { error: deleteError } = await this.supabase
        .from('custom_deductions')
        .delete()
        .eq('income_id', incomeId)
        .eq('user_id', this.userId)

      if (deleteError) throw deleteError

      // Insert new deductions
      if (customDeductions && customDeductions.length > 0) {
        const deductionsToInsert = customDeductions.map(deduction => ({
          user_id: this.userId,
          income_id: incomeId,
          deduction_type: deduction.deduction_type,
          deduction_name: deduction.deduction_name,
          amount: parseFloat(deduction.amount),
          is_recurring: deduction.is_recurring || false,
          frequency: deduction.frequency || 'monthly',
          notes: deduction.notes || null
        }))

        const { error: insertError } = await this.supabase
          .from('custom_deductions')
          .insert(deductionsToInsert)

        if (insertError) throw insertError
      }

      // Recalculate and update account_transaction amount
      await this.recalculateIncomeTransaction(incomeId)

      return { success: true }
    } catch (error) {
      console.error('Error updating custom deductions:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Recalculate account_transaction amount after deductions change
   * @param {string} incomeId - Income ID
   * @returns {Promise<object>} - {success, error}
   */
  async recalculateIncomeTransaction(incomeId) {
    try {
      // Get income details with deductions
      const incomeData = await this.getIncomeWithDeductions(incomeId)
      if (!incomeData.success) throw new Error(incomeData.error)

      // Update account_transaction with new net amount
      const { error } = await this.supabase
        .from('account_transactions')
        .update({ amount: incomeData.netAmount })
        .eq('reference_id', incomeId)
        .eq('reference_type', 'income')

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error recalculating income transaction:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Get recurring custom deductions for user
   * Useful for auto-filling when creating new income
   * @returns {Promise<object>} - {success, deductions, error}
   */
  async getRecurringDeductions() {
    try {
      const { data: deductions, error } = await this.supabase
        .from('custom_deductions')
        .select('deduction_type, deduction_name, amount, notes')
        .eq('user_id', this.userId)
        .eq('is_recurring', true)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      // Group by deduction name to get unique recurring deductions
      const uniqueDeductions = []
      const seen = new Set()

      deductions.forEach(d => {
        const key = `${d.deduction_type}-${d.deduction_name}`
        if (!seen.has(key)) {
          seen.add(key)
          uniqueDeductions.push(d)
        }
      })

      return {
        success: true,
        deductions: uniqueDeductions
      }
    } catch (error) {
      console.error('Error getting recurring deductions:', error)
      return {
        success: false,
        deductions: [],
        error: error.message
      }
    }
  }

  /**
   * Get income summary with custom deductions breakdown
   * @param {object} filters - {startDate, endDate, source}
   * @returns {Promise<object>} - {success, summary, error}
   */
  async getIncomeSummaryWithDeductions(filters = {}) {
    try {
      let query = this.supabase
        .from('income')
        .select(`
          *,
          custom_deductions (
            deduction_type,
            amount
          )
        `)
        .eq('user_id', this.userId)

      if (filters.startDate) {
        query = query.gte('date', filters.startDate)
      }

      if (filters.endDate) {
        query = query.lte('date', filters.endDate)
      }

      if (filters.source) {
        query = query.eq('source', filters.source)
      }

      const { data: incomeRecords, error } = await query

      if (error) throw error

      // Calculate summary
      const summary = {
        count: incomeRecords.length,
        totalGross: 0,
        totalTax: 0,
        totalStatutory: 0,
        totalCustomDeductions: 0,
        totalNet: 0,
        byDeductionType: {},
        bySource: {}
      }

      incomeRecords.forEach(income => {
        const gross = parseFloat(income.amount)
        const tax = parseFloat(income.tax_amount || 0)
        const statutory = parseFloat(income.statutory_deductions || 0)

        summary.totalGross += gross
        summary.totalTax += tax
        summary.totalStatutory += statutory

        // Calculate custom deductions for this income
        const customDeductions = income.custom_deductions || []
        const customTotal = customDeductions.reduce(
          (sum, d) => sum + parseFloat(d.amount),
          0
        )
        summary.totalCustomDeductions += customTotal

        // Group by deduction type
        customDeductions.forEach(d => {
          if (!summary.byDeductionType[d.deduction_type]) {
            summary.byDeductionType[d.deduction_type] = { total: 0, count: 0 }
          }
          summary.byDeductionType[d.deduction_type].total += parseFloat(d.amount)
          summary.byDeductionType[d.deduction_type].count++
        })

        // Group by source
        if (!summary.bySource[income.source]) {
          summary.bySource[income.source] = {
            gross: 0,
            deductions: 0,
            net: 0,
            count: 0
          }
        }
        const netAmount = gross - tax - statutory - customTotal
        summary.bySource[income.source].gross += gross
        summary.bySource[income.source].deductions += tax + statutory + customTotal
        summary.bySource[income.source].net += netAmount
        summary.bySource[income.source].count++
      })

      summary.totalNet = summary.totalGross - summary.totalTax - summary.totalStatutory - summary.totalCustomDeductions

      return {
        success: true,
        summary
      }
    } catch (error) {
      console.error('Error getting income summary:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Delete income and associated custom deductions
   * @param {string} incomeId - Income ID
   * @returns {Promise<object>} - {success, error}
   */
  async deleteIncome(incomeId) {
    try {
      // Step 1: Delete custom deductions
      const { error: deductionsError } = await this.supabase
        .from('custom_deductions')
        .delete()
        .eq('income_id', incomeId)
        .eq('user_id', this.userId)

      if (deductionsError) throw deductionsError

      // Step 2: Delete account_transaction
      const { error: txError } = await this.supabase
        .from('account_transactions')
        .delete()
        .eq('reference_id', incomeId)
        .eq('reference_type', 'income')

      if (txError) throw txError

      // Step 3: Delete income record
      const { error: incomeError } = await this.supabase
        .from('income')
        .delete()
        .eq('id', incomeId)
        .eq('user_id', this.userId)

      if (incomeError) throw incomeError

      return { success: true }
    } catch (error) {
      console.error('Error deleting income:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Get account options for income form
   * All cash and investment accounts
   * @returns {Promise<object>} - {success, accounts, error}
   */
  async getAccountsForIncome() {
    try {
      const { data: accounts, error } = await this.supabase
        .from('accounts')
        .select('id, name, account_type, category, current_balance, institution_name')
        .eq('user_id', this.userId)
        .in('account_type', ['cash', 'investment'])
        .order('is_primary', { ascending: false }) // Primary accounts first
        .order('name', { ascending: true })

      if (error) throw error

      return {
        success: true,
        accounts: accounts || []
      }
    } catch (error) {
      console.error('Error getting accounts for income:', error)
      return {
        success: false,
        accounts: [],
        error: error.message
      }
    }
  }
}

export default IncomeService
