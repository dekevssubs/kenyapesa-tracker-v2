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
    BANK_LOAN: 'bank_loan',
    SACCO_LOAN: 'sacco_loan',
    CHAMA_LOAN: 'chama_loan',
    CREDIT_CARD: 'credit_card',
    RENT: 'rent',
    INSURANCE: 'insurance',
    RETIREMENT: 'retirement',
    INVESTMENT: 'investment',
    SAVINGS: 'savings',
    WELFARE: 'welfare',
    UNION_DUES: 'union_dues',
    OTHER: 'other'
  }

  /**
   * Mapping of deduction types to expense category slugs
   * Used to automatically categorize deductions as expenses
   */
  static DEDUCTION_TO_CATEGORY_MAP = {
    sacco: 'investments',           // SACCO contributions -> Financial > Investments
    helb_loan: 'loan-repayments',   // HELB loan -> Financial > Loan Repayments
    car_loan: 'loan-repayments',    // Car loan -> Financial > Loan Repayments
    personal_loan: 'loan-repayments', // Personal loan -> Financial > Loan Repayments
    bank_loan: 'loan-repayments',   // Bank loan -> Financial > Loan Repayments
    sacco_loan: 'loan-repayments',  // SACCO loan -> Financial > Loan Repayments
    chama_loan: 'loan-repayments',  // Chama loan -> Financial > Loan Repayments
    credit_card: 'loan-repayments', // Credit card -> Financial > Loan Repayments
    mortgage: 'rent-mortgage',      // Mortgage -> Housing > Rent or Mortgage
    rent: 'rent-mortgage',          // Rent deduction -> Housing > Rent or Mortgage
    insurance: 'home-insurance',    // Insurance -> Housing > Home Insurance
    retirement: 'retirement'        // Retirement -> Financial > Retirement Contributions
    // savings, investment, welfare, union_dues, other -> no auto-mapping (null)
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
        value: IncomeService.DEDUCTION_TYPES.RENT,
        label: 'Rent Deduction',
        description: 'Employer-deducted rent/housing payment'
      },
      {
        value: IncomeService.DEDUCTION_TYPES.PERSONAL_LOAN,
        label: 'Personal Loan',
        description: 'Personal/bank loan repayment'
      },
      {
        value: IncomeService.DEDUCTION_TYPES.BANK_LOAN,
        label: 'Bank Loan',
        description: 'Bank personal loan repayment'
      },
      {
        value: IncomeService.DEDUCTION_TYPES.SACCO_LOAN,
        label: 'SACCO Loan',
        description: 'SACCO loan repayment (different from SACCO contribution)'
      },
      {
        value: IncomeService.DEDUCTION_TYPES.CHAMA_LOAN,
        label: 'Chama Loan',
        description: 'Chama/Merry-go-round loan repayment'
      },
      {
        value: IncomeService.DEDUCTION_TYPES.CREDIT_CARD,
        label: 'Credit Card',
        description: 'Credit card balance repayment'
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
        source_name, // Who paid - employer name, client, etc.
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

      // Debug logging
      console.log('IncomeService.createIncome - Calculation:', {
        grossAmount,
        taxAmount,
        statutoryAmount,
        totalCustomDeductions,
        netAmount,
        customDeductionsCount: customDeductions.length
      })

      // Step 1: Create income record
      const { data: income, error: incomeError } = await this.supabase
        .from('income')
        .insert({
          user_id: this.userId,
          account_id,
          amount: grossAmount,
          source,
          source_name: source_name || null, // Store source of funds
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

        // Step 2b: Process deduction integrations (expenses and reminders)
        const deductionsWithFlags = customDeductions.filter(
          d => d.create_expense || d.create_reminder
        )

        if (deductionsWithFlags.length > 0) {
          const integrationResult = await this.processDeductionIntegrations(
            deductionsWithFlags,
            income.id,
            date,
            null // Don't pass account_id for deduction expenses (they're already deducted)
          )

          console.log('IncomeService - Deduction integrations processed:', {
            expenseCount: integrationResult.expenseResults.length,
            reminderCount: integrationResult.reminderResults.length
          })
        }
      }

      // Step 3: Create account_transaction (income flows TO account)
      // Use NET amount (after all deductions)
      // Build description that includes source of funds for account history
      const sourceLabel = source.replace('_', ' ').charAt(0).toUpperCase() + source.replace('_', ' ').slice(1)
      const transactionDescription = source_name
        ? `${sourceLabel} from ${source_name}${description ? ` - ${description}` : ''}`
        : description || `Income from ${sourceLabel}`

      const { data: accountTransaction, error: txError } = await this.supabase
        .from('account_transactions')
        .insert({
          user_id: this.userId,
          to_account_id: account_id, // Money flows INTO account
          transaction_type: 'income',
          amount: netAmount, // Net amount after deductions
          date,
          category: source,
          description: transactionDescription,
          reference_id: income.id,
          reference_type: 'income'
        })
        .select('id')
        .single()

      if (txError) throw txError

      // Debug: Verify the transaction was created correctly
      console.log('IncomeService - Account Transaction Created:', {
        transactionId: accountTransaction.id,
        to_account_id: account_id,
        amount: netAmount,
        description: transactionDescription
      })

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

  /**
   * RECURRING INCOME METHODS
   */

  /**
   * Calculate next date based on frequency
   * @param {string} currentDate - Current date (YYYY-MM-DD)
   * @param {string} frequency - Frequency (weekly, biweekly, monthly, quarterly, yearly)
   * @returns {string} - Next date (YYYY-MM-DD)
   */
  calculateNextDate(currentDate, frequency) {
    const date = new Date(currentDate)

    switch (frequency) {
      case 'weekly':
        date.setDate(date.getDate() + 7)
        break
      case 'biweekly':
        date.setDate(date.getDate() + 14)
        break
      case 'monthly':
        date.setMonth(date.getMonth() + 1)
        break
      case 'quarterly':
        date.setMonth(date.getMonth() + 3)
        break
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1)
        break
    }

    return date.toISOString().split('T')[0]
  }

  /**
   * Get all recurring income for the user
   * @returns {Promise<object>} - {success, recurringIncomes, error}
   */
  async getAllRecurringIncome() {
    try {
      const { data, error } = await this.supabase
        .from('recurring_income')
        .select(`
          *,
          account:accounts(id, name, account_type)
        `)
        .eq('user_id', this.userId)
        .order('next_date', { ascending: true })

      if (error) throw error

      return {
        success: true,
        recurringIncomes: data || []
      }
    } catch (error) {
      console.error('Error fetching recurring income:', error)
      return {
        success: false,
        error: error.message,
        recurringIncomes: []
      }
    }
  }

  /**
   * Create recurring income template
   * @param {object} recurringData - Recurring income data
   * @returns {Promise<object>} - {success, recurringIncome, error}
   */
  async createRecurringIncome(recurringData) {
    try {
      const { data, error } = await this.supabase
        .from('recurring_income')
        .insert({
          user_id: this.userId,
          ...recurringData,
          next_date: this.calculateNextDate(recurringData.start_date, recurringData.frequency)
        })
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        recurringIncome: data
      }
    } catch (error) {
      console.error('Error creating recurring income:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Update recurring income
   * @param {string} id - Recurring income ID
   * @param {object} updates - Fields to update
   * @returns {Promise<object>} - {success, recurringIncome, error}
   */
  async updateRecurringIncome(id, updates) {
    try {
      const { data, error } = await this.supabase
        .from('recurring_income')
        .update(updates)
        .eq('id', id)
        .eq('user_id', this.userId)
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        recurringIncome: data
      }
    } catch (error) {
      console.error('Error updating recurring income:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Delete recurring income
   * @param {string} id - Recurring income ID
   * @returns {Promise<object>} - {success, error}
   */
  async deleteRecurringIncome(id) {
    try {
      const { error } = await this.supabase
        .from('recurring_income')
        .delete()
        .eq('id', id)
        .eq('user_id', this.userId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error deleting recurring income:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Toggle recurring income active status
   * @param {string} id - Recurring income ID
   * @param {boolean} currentStatus - Current is_active status
   * @returns {Promise<object>} - {success, error}
   */
  async toggleRecurringActive(id, currentStatus) {
    try {
      const { error } = await this.supabase
        .from('recurring_income')
        .update({ is_active: !currentStatus })
        .eq('id', id)
        .eq('user_id', this.userId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error toggling recurring income:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Create income entry from recurring template
   * @param {string} recurringId - Recurring income ID
   * @returns {Promise<object>} - {success, incomeId, error}
   */
  async createIncomeFromRecurring(recurringId) {
    try {
      // Get recurring income template
      const { data: recurring, error: fetchError } = await this.supabase
        .from('recurring_income')
        .select('*')
        .eq('id', recurringId)
        .eq('user_id', this.userId)
        .single()

      if (fetchError) throw fetchError

      // Create income entry
      const result = await this.recordIncome({
        amount: recurring.amount,
        source: recurring.source,
        source_name: recurring.source_name,
        description: recurring.description || `Recurring ${recurring.source}`,
        date: new Date().toISOString().split('T')[0],
        account_id: recurring.account_id,
        is_gross: recurring.is_gross,
        gross_salary: recurring.gross_salary,
        statutory_deductions: recurring.statutory_deductions,
        tax_amount: recurring.tax_amount
      })

      if (!result.success) throw new Error(result.error)

      // Update next_date in recurring_income
      const nextDate = this.calculateNextDate(recurring.next_date, recurring.frequency)
      await this.supabase
        .from('recurring_income')
        .update({
          next_date: nextDate,
          last_auto_created_at: new Date().toISOString()
        })
        .eq('id', recurringId)

      return {
        success: true,
        incomeId: result.incomeId
      }
    } catch (error) {
      console.error('Error creating income from recurring:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * DEDUCTION INTEGRATION METHODS
   * These methods create expenses and reminders from payroll deductions
   */

  /**
   * Get expense category slug for a deduction type
   * @param {string} deductionType - The deduction type
   * @returns {string|null} - Category slug or null if no mapping
   */
  static getCategorySlugForDeduction(deductionType) {
    return IncomeService.DEDUCTION_TO_CATEGORY_MAP[deductionType] || null
  }

  /**
   * Check if a deduction type can be mapped to an expense category
   * @param {string} deductionType - The deduction type
   * @returns {boolean} - True if mappable
   */
  static canMapToExpense(deductionType) {
    return !!IncomeService.DEDUCTION_TO_CATEGORY_MAP[deductionType]
  }

  /**
   * Get category info for a deduction type (for UI display)
   * @param {string} deductionType - The deduction type
   * @returns {object} - {canMap, categorySlug, categoryDisplay}
   */
  static getDeductionCategoryInfo(deductionType) {
    const slug = IncomeService.DEDUCTION_TO_CATEGORY_MAP[deductionType]
    if (!slug) {
      return { canMap: false, categorySlug: null, categoryDisplay: null }
    }

    // Display name mappings
    const displayNames = {
      'investments': 'Financial > Investments (SACCO)',
      'loan-repayments': 'Financial > Loan Repayments',
      'rent-mortgage': 'Housing > Rent or Mortgage',
      'home-insurance': 'Housing > Home Insurance',
      'retirement': 'Financial > Retirement Contributions'
    }

    return {
      canMap: true,
      categorySlug: slug,
      categoryDisplay: displayNames[slug] || slug
    }
  }

  /**
   * Create an expense record from a deduction
   * @param {object} deduction - Deduction data {deduction_type, deduction_name, amount}
   * @param {string} incomeDate - Date of the income (YYYY-MM-DD)
   * @param {string|null} accountId - Optional account ID for the expense
   * @returns {Promise<object>} - {success, expenseId, categoryId, error}
   */
  async createDeductionExpense(deduction, incomeDate, accountId = null) {
    try {
      const categorySlug = IncomeService.getCategorySlugForDeduction(deduction.deduction_type)

      if (!categorySlug) {
        return {
          success: false,
          error: `No expense category mapping for deduction type: ${deduction.deduction_type}`
        }
      }

      // Get category ID from slug
      const { data: category, error: categoryError } = await this.supabase
        .from('expense_categories')
        .select('id, name, parent_category_id')
        .eq('user_id', this.userId)
        .eq('slug', categorySlug)
        .eq('is_active', true)
        .single()

      if (categoryError || !category) {
        console.error('Category lookup error:', categoryError)
        return {
          success: false,
          error: `Could not find expense category: ${categorySlug}`
        }
      }

      // Build expense description
      const description = deduction.deduction_name
        ? `${deduction.deduction_name} (payroll deduction)`
        : `Payroll deduction - ${deduction.deduction_type}`

      // Create expense record
      const expenseData = {
        user_id: this.userId,
        amount: parseFloat(deduction.amount),
        category_id: category.id,
        category: categorySlug,
        description,
        payment_method: 'salary_deduction',
        date: incomeDate,
        transaction_fee: 0
      }

      // Add account_id if provided
      if (accountId) {
        expenseData.account_id = accountId
      }

      const { data: expense, error: expenseError } = await this.supabase
        .from('expenses')
        .insert(expenseData)
        .select('id')
        .single()

      if (expenseError) throw expenseError

      return {
        success: true,
        expenseId: expense.id,
        categoryId: category.id,
        categoryName: category.name
      }
    } catch (error) {
      console.error('Error creating deduction expense:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Create a recurring bill reminder from a deduction
   * @param {object} deduction - Deduction data {deduction_type, deduction_name, amount, frequency}
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @returns {Promise<object>} - {success, recurringId, error}
   */
  async createDeductionReminder(deduction, startDate) {
    try {
      const categorySlug = IncomeService.getCategorySlugForDeduction(deduction.deduction_type)
      let categoryId = null

      // Get category ID if mappable
      if (categorySlug) {
        const { data: category } = await this.supabase
          .from('expense_categories')
          .select('id')
          .eq('user_id', this.userId)
          .eq('slug', categorySlug)
          .eq('is_active', true)
          .single()

        if (category) {
          categoryId = category.id
        }
      }

      // Build reminder name
      const reminderName = deduction.deduction_name
        ? deduction.deduction_name
        : IncomeService.getDeductionTypes().find(t => t.value === deduction.deduction_type)?.label || 'Payroll Deduction'

      // Calculate next date (next month from start date)
      const nextDate = this.calculateNextDate(startDate, deduction.frequency || 'monthly')

      // Create recurring transaction with kind='bill'
      const { data: recurring, error: recurringError } = await this.supabase
        .from('recurring_transactions')
        .insert({
          user_id: this.userId,
          type: 'expense',
          kind: 'bill', // Show as bill in reminders
          name: reminderName,
          amount: parseFloat(deduction.amount),
          frequency: deduction.frequency || 'monthly',
          category: categorySlug,
          category_id: categoryId,
          payment_method: 'salary_deduction',
          start_date: startDate, // Required field
          next_date: nextDate,
          is_active: true,
          auto_add: false, // Don't auto-add since it's deducted from salary
          notes: `Payroll deduction - ${deduction.deduction_type}`
        })
        .select('id')
        .single()

      if (recurringError) throw recurringError

      return {
        success: true,
        recurringId: recurring.id,
        nextDate
      }
    } catch (error) {
      console.error('Error creating deduction reminder:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Process deductions with optional expense and reminder creation
   * Called by createIncome when deductions have integration flags
   * @param {Array} deductions - Array of deductions with create_expense and create_reminder flags
   * @param {string} incomeId - The income ID
   * @param {string} incomeDate - The income date
   * @param {string|null} accountId - Optional account ID
   * @returns {Promise<object>} - {success, expenseResults, reminderResults, error}
   */
  async processDeductionIntegrations(deductions, incomeId, incomeDate, accountId = null) {
    const expenseResults = []
    const reminderResults = []

    for (const deduction of deductions) {
      // Create expense if requested
      if (deduction.create_expense) {
        const expenseResult = await this.createDeductionExpense(deduction, incomeDate, accountId)
        expenseResults.push({
          deductionType: deduction.deduction_type,
          deductionName: deduction.deduction_name,
          ...expenseResult
        })
      }

      // Create reminder if requested and marked as recurring
      if (deduction.create_reminder && deduction.is_recurring) {
        const reminderResult = await this.createDeductionReminder(deduction, incomeDate)
        reminderResults.push({
          deductionType: deduction.deduction_type,
          deductionName: deduction.deduction_name,
          ...reminderResult
        })
      }

      // Transfer to SACCO account if specified
      if (deduction.deduction_type === 'sacco' && deduction.sacco_account_id) {
        const saccoResult = await this.transferToSaccoAccount(
          deduction,
          incomeDate,
          incomeId
        )
        if (saccoResult.success) {
          // Add to expense results for tracking
          expenseResults.push({
            deductionType: deduction.deduction_type,
            deductionName: deduction.deduction_name,
            saccoTransfer: true,
            ...saccoResult
          })
        }
      }

      // Make loan payment if loan account specified
      if (IncomeService.canLinkToLoanAccount(deduction.deduction_type) && deduction.loan_account_id) {
        const loanResult = await this.makeLoanPayment(
          deduction,
          incomeDate,
          incomeId
        )
        if (loanResult.success) {
          // Add to expense results for tracking
          expenseResults.push({
            deductionType: deduction.deduction_type,
            deductionName: deduction.deduction_name,
            loanPayment: true,
            ...loanResult
          })
        }
      }
    }

    return {
      success: true,
      expenseResults,
      reminderResults
    }
  }

  /**
   * SACCO ACCOUNT INTEGRATION
   * Methods for linking SACCO deductions to SACCO accounts
   */

  /**
   * Get user's SACCO accounts for selection
   * @returns {Promise<object>} - {success, accounts, error}
   */
  async getSaccoAccounts() {
    try {
      const { data: accounts, error } = await this.supabase
        .from('accounts')
        .select('id, name, institution_name, current_balance, category')
        .eq('user_id', this.userId)
        .eq('category', 'sacco')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error

      return {
        success: true,
        accounts: accounts || []
      }
    } catch (error) {
      console.error('Error fetching SACCO accounts:', error)
      return {
        success: false,
        accounts: [],
        error: error.message
      }
    }
  }

  /**
   * Transfer deduction amount to SACCO account
   * Creates an account_transaction that increases SACCO balance
   * @param {object} deduction - Deduction data with sacco_account_id
   * @param {string} incomeDate - Date of the income
   * @param {string} incomeId - Related income ID
   * @returns {Promise<object>} - {success, transactionId, error}
   */
  async transferToSaccoAccount(deduction, incomeDate, incomeId) {
    try {
      if (!deduction.sacco_account_id) {
        return {
          success: false,
          error: 'No SACCO account specified'
        }
      }

      // Get SACCO account details for description
      const { data: saccoAccount, error: accountError } = await this.supabase
        .from('accounts')
        .select('id, name, institution_name')
        .eq('id', deduction.sacco_account_id)
        .single()

      if (accountError || !saccoAccount) {
        return {
          success: false,
          error: 'SACCO account not found'
        }
      }

      // Build description
      const description = deduction.deduction_name
        ? `${deduction.deduction_name} - Payroll contribution`
        : `SACCO contribution from salary`

      // Create account_transaction (money flows TO SACCO account)
      const { data: transaction, error: txError } = await this.supabase
        .from('account_transactions')
        .insert({
          user_id: this.userId,
          to_account_id: deduction.sacco_account_id, // Money flows INTO SACCO
          transaction_type: 'sacco_contribution',
          amount: parseFloat(deduction.amount),
          date: incomeDate,
          category: 'sacco',
          description,
          reference_id: incomeId,
          reference_type: 'income_deduction'
        })
        .select('id')
        .single()

      if (txError) throw txError

      console.log('IncomeService - SACCO transfer created:', {
        transactionId: transaction.id,
        saccoAccount: saccoAccount.name,
        amount: deduction.amount
      })

      return {
        success: true,
        transactionId: transaction.id,
        saccoAccountId: saccoAccount.id,
        saccoAccountName: saccoAccount.name
      }
    } catch (error) {
      console.error('Error transferring to SACCO account:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * LOAN ACCOUNT INTEGRATION
   * Methods for linking loan deductions to loan accounts
   */

  // Loan deduction types that can be linked to loan accounts
  static LOAN_DEDUCTION_TYPES = [
    'helb_loan',
    'car_loan',
    'personal_loan',
    'mortgage',
    'bank_loan',
    'sacco_loan',
    'chama_loan',
    'credit_card'
  ]

  // Map deduction types to loan account categories
  static DEDUCTION_TO_LOAN_CATEGORY = {
    helb_loan: ['helb_loan'],
    car_loan: ['car_loan'],
    personal_loan: ['personal_loan', 'bank_loan'],
    mortgage: ['mortgage_loan'],
    bank_loan: ['bank_loan'],
    sacco_loan: ['sacco_loan'],
    chama_loan: ['chama_loan'],
    credit_card: ['credit_card']
  }

  /**
   * Check if deduction type can be linked to a loan account
   * @param {string} type - Deduction type
   * @returns {boolean}
   */
  static canLinkToLoanAccount(type) {
    return IncomeService.LOAN_DEDUCTION_TYPES.includes(type)
  }

  /**
   * Get loan account categories for a deduction type
   * @param {string} deductionType - Deduction type
   * @returns {string[]} - Array of loan account categories
   */
  static getLoanCategoriesForDeduction(deductionType) {
    return IncomeService.DEDUCTION_TO_LOAN_CATEGORY[deductionType] || []
  }

  /**
   * Get user's loan accounts for selection
   * @param {string} deductionType - Optional filter by deduction type
   * @returns {Promise<object>} - {success, accounts, error}
   */
  async getLoanAccounts(deductionType = null) {
    try {
      let query = this.supabase
        .from('accounts')
        .select('id, name, institution_name, current_balance, category, original_loan_amount, loan_start_date, loan_end_date')
        .eq('user_id', this.userId)
        .eq('account_type', 'loan')
        .eq('is_active', true)

      // Filter by category if deduction type specified
      if (deductionType) {
        const loanCategories = IncomeService.getLoanCategoriesForDeduction(deductionType)
        if (loanCategories.length > 0) {
          query = query.in('category', loanCategories)
        }
      }

      const { data: accounts, error } = await query.order('name', { ascending: true })

      if (error) throw error

      return {
        success: true,
        accounts: accounts || []
      }
    } catch (error) {
      console.error('Error fetching loan accounts:', error)
      return {
        success: false,
        accounts: [],
        error: error.message
      }
    }
  }

  /**
   * Make loan payment from deduction
   * Creates an account_transaction that increases loan balance (reduces debt)
   * @param {object} deduction - Deduction data with loan_account_id
   * @param {string} incomeDate - Date of the income
   * @param {string} incomeId - Related income ID
   * @returns {Promise<object>} - {success, transactionId, newBalance, error}
   */
  async makeLoanPayment(deduction, incomeDate, incomeId) {
    try {
      if (!deduction.loan_account_id) {
        return {
          success: false,
          error: 'No loan account specified'
        }
      }

      // Get loan account details
      const { data: loanAccount, error: accountError } = await this.supabase
        .from('accounts')
        .select('id, name, institution_name, current_balance, original_loan_amount')
        .eq('id', deduction.loan_account_id)
        .single()

      if (accountError || !loanAccount) {
        return {
          success: false,
          error: 'Loan account not found'
        }
      }

      // Build description
      const description = deduction.deduction_name
        ? `${deduction.deduction_name} - Payroll deduction payment`
        : `Loan payment from salary`

      // Create account_transaction (money flows TO loan account, increasing balance toward 0)
      // Loan accounts have negative balances, so adding money increases the balance
      const { data: transaction, error: txError } = await this.supabase
        .from('account_transactions')
        .insert({
          user_id: this.userId,
          to_account_id: deduction.loan_account_id, // Money flows INTO loan account
          transaction_type: 'loan_payment',
          amount: parseFloat(deduction.amount),
          date: incomeDate,
          category: 'loan_payment',
          description,
          reference_id: incomeId,
          reference_type: 'income_deduction'
        })
        .select('id')
        .single()

      if (txError) throw txError

      // Get updated balance
      const { data: updatedAccount } = await this.supabase
        .from('accounts')
        .select('current_balance')
        .eq('id', deduction.loan_account_id)
        .single()

      console.log('IncomeService - Loan payment created:', {
        transactionId: transaction.id,
        loanAccount: loanAccount.name,
        amount: deduction.amount,
        previousBalance: loanAccount.current_balance,
        newBalance: updatedAccount?.current_balance
      })

      return {
        success: true,
        transactionId: transaction.id,
        loanAccountId: loanAccount.id,
        loanAccountName: loanAccount.name,
        previousBalance: loanAccount.current_balance,
        newBalance: updatedAccount?.current_balance || loanAccount.current_balance + parseFloat(deduction.amount)
      }
    } catch (error) {
      console.error('Error making loan payment:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}

export default IncomeService
