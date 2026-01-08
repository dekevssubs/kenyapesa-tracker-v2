/**
 * Goal Service
 *
 * Handles goal management with account integration and contribution tracking
 * Features:
 * - Goal creation with linked savings account
 * - Contribution tracking with source account
 * - Automatic fund transfers via account_transactions
 * - Goal completion, abandonment, and pause functionality
 * - Withdrawal support
 *
 * Category Note (per canonical spec):
 * - Goals do NOT use expense categories for transaction classification
 * - Goal's 'category' field is for goal TYPE (vacation, emergency-fund) - not expense type
 * - Transfers/withdrawals may use system category or NULL
 */

export class GoalService {
  constructor(supabase, userId) {
    this.supabase = supabase
    this.userId = userId
    this._categoryCache = {}
  }

  /**
   * Get category_id from slug (for system transactions only)
   */
  async getCategoryId(slug) {
    if (!slug) return null
    if (this._categoryCache[slug]) return this._categoryCache[slug]
    try {
      const { data } = await this.supabase
        .from('expense_categories')
        .select('id')
        .eq('user_id', this.userId)
        .eq('slug', slug)
        .eq('is_active', true)
        .single()
      if (data) {
        this._categoryCache[slug] = data.id
        return data.id
      }
      return null
    } catch (err) {
      return null
    }
  }

  /**
   * Goal statuses
   */
  static STATUS = {
    ACTIVE: 'active',
    COMPLETED: 'completed',
    ABANDONED: 'abandoned',
    PAUSED: 'paused'
  }

  /**
   * Contribution types
   */
  static CONTRIBUTION_TYPE = {
    CONTRIBUTION: 'contribution',
    WITHDRAWAL: 'withdrawal',
    REFUND: 'refund'
  }

  /**
   * Create a new goal with optional linked account
   * @param {object} goalData - Goal data
   * @returns {Promise<object>} - {success, goalId, error}
   */
  async createGoal(goalData) {
    try {
      const {
        name,
        target_amount,
        current_amount = 0,
        deadline,
        description,
        category,
        linked_account_id
      } = goalData

      // Validate required fields
      if (!name || !name.trim()) {
        return {
          success: false,
          error: 'Goal name is required'
        }
      }

      if (!target_amount || target_amount <= 0) {
        return {
          success: false,
          error: 'Target amount must be greater than zero'
        }
      }

      const { data: goal, error } = await this.supabase
        .from('goals')
        .insert({
          user_id: this.userId,
          name: name.trim(),
          target_amount: parseFloat(target_amount),
          current_amount: parseFloat(current_amount),
          deadline: deadline || null,
          description: description || null,
          category: category || 'other',
          linked_account_id: linked_account_id || null,
          status: GoalService.STATUS.ACTIVE
        })
        .select('id')
        .single()

      if (error) throw error

      return {
        success: true,
        goalId: goal.id
      }
    } catch (error) {
      console.error('Error creating goal:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Make a contribution to a goal
   * @param {string} goalId - Goal ID
   * @param {number} amount - Contribution amount
   * @param {string} fromAccountId - Source account ID
   * @param {string} date - Contribution date
   * @param {string} notes - Optional notes
   * @returns {Promise<object>} - {success, contributionId, accountTransactionId, newBalance, error}
   */
  async makeContribution(goalId, amount, fromAccountId, date = null, notes = null) {
    try {
      // Validate inputs
      if (!goalId || !amount || !fromAccountId) {
        return {
          success: false,
          error: 'Goal ID, amount, and source account are required'
        }
      }

      if (amount <= 0) {
        return {
          success: false,
          error: 'Contribution amount must be greater than zero'
        }
      }

      // Get goal details
      const { data: goal, error: goalError } = await this.supabase
        .from('goals')
        .select('*, linked_account_id, status, name')
        .eq('id', goalId)
        .eq('user_id', this.userId)
        .single()

      if (goalError) throw goalError

      if (!goal) {
        return {
          success: false,
          error: 'Goal not found'
        }
      }

      if (goal.status !== GoalService.STATUS.ACTIVE) {
        return {
          success: false,
          error: `Cannot contribute to ${goal.status} goal`
        }
      }

      // Check if goal has linked account
      if (!goal.linked_account_id) {
        return {
          success: false,
          error: 'Goal must have a linked savings account. Please update the goal first.'
        }
      }

      // Check source account balance
      const { data: fromAccount, error: accountError } = await this.supabase
        .from('accounts')
        .select('current_balance, name')
        .eq('id', fromAccountId)
        .eq('user_id', this.userId)
        .single()

      if (accountError) throw accountError

      if (parseFloat(fromAccount.current_balance) < amount) {
        return {
          success: false,
          error: `Insufficient balance in ${fromAccount.name}. Available: KES ${parseFloat(fromAccount.current_balance).toFixed(2)}`
        }
      }

      const contributionDate = date || new Date().toISOString().split('T')[0]

      // Use database function to process contribution with account transfer
      const { data: result, error: processError } = await this.supabase
        .rpc('process_goal_contribution', {
          p_user_id: this.userId,
          p_goal_id: goalId,
          p_from_account_id: fromAccountId,
          p_to_account_id: goal.linked_account_id,
          p_amount: parseFloat(amount),
          p_contribution_date: contributionDate,
          p_notes: notes
        })

      if (processError) throw processError

      if (!result.success) {
        throw new Error(result.error)
      }

      // CANONICAL GOAL ALLOCATION ARCHITECTURE
      // Create allocation record linking this goal to the account transaction
      const { error: allocationError } = await this.supabase
        .from('goal_allocations')
        .insert({
          goal_id: goalId,
          account_transaction_id: result.account_transaction_id,
          amount: parseFloat(amount)
        })

      if (allocationError) throw allocationError

      // Calculate new goal balance from allocations
      const newBalance = await this.calculateGoalBalance(goalId)

      return {
        success: true,
        contributionId: result.contribution_id,
        accountTransactionId: result.account_transaction_id,
        newBalance: newBalance
      }
    } catch (error) {
      console.error('Error making contribution:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Make a withdrawal from a goal
   * @param {string} goalId - Goal ID
   * @param {number} amount - Withdrawal amount
   * @param {string} toAccountId - Destination account ID
   * @param {string} reason - Withdrawal reason
   * @param {string} date - Withdrawal date
   * @returns {Promise<object>} - {success, withdrawalId, accountTransactionId, newBalance, error}
   */
  async makeWithdrawal(goalId, amount, toAccountId, reason = null, date = null) {
    try {
      // Validate inputs
      if (!goalId || !amount || !toAccountId) {
        return {
          success: false,
          error: 'Goal ID, amount, and destination account are required'
        }
      }

      if (amount <= 0) {
        return {
          success: false,
          error: 'Withdrawal amount must be greater than zero'
        }
      }

      // Get goal details with linked account
      const { data: goal, error: goalError } = await this.supabase
        .from('goals')
        .select(`
          *,
          linked_account:accounts!goals_linked_account_id_fkey (
            id,
            name,
            current_balance
          )
        `)
        .eq('id', goalId)
        .eq('user_id', this.userId)
        .single()

      if (goalError) throw goalError

      if (!goal.linked_account_id) {
        return {
          success: false,
          error: 'Goal must have a linked savings account'
        }
      }

      // CANONICAL: Check goal allocation balance, not account balance
      const goalBalance = await this.calculateGoalBalance(goalId)
      if (goalBalance < amount) {
        return {
          success: false,
          error: `Insufficient balance allocated to this goal. Available: KES ${goalBalance.toFixed(2)}`
        }
      }

      // Also verify linked account has sufficient funds
      const accountBalance = parseFloat(goal.linked_account?.current_balance || 0)
      if (accountBalance < amount) {
        return {
          success: false,
          error: `Insufficient balance in linked account. Available: KES ${accountBalance.toFixed(2)}`
        }
      }

      const withdrawalDate = date || new Date().toISOString().split('T')[0]

      // Create account transaction (transfer from goal account to destination)
      const { data: accountTx, error: txError } = await this.supabase
        .from('account_transactions')
        .insert({
          user_id: this.userId,
          from_account_id: goal.linked_account_id,
          to_account_id: toAccountId,
          transaction_type: 'transfer',
          amount: parseFloat(amount),
          date: withdrawalDate,
          category: 'goal_withdrawal',
          description: `Withdrawal from goal: ${goal.name}${reason ? ' - ' + reason : ''}`,
          reference_type: 'goal',
          reference_id: goalId
        })
        .select('id')
        .single()

      if (txError) throw txError

      // Create goal contribution record (negative)
      const { data: withdrawal, error: withdrawalError } = await this.supabase
        .from('goal_contributions')
        .insert({
          user_id: this.userId,
          goal_id: goalId,
          from_account_id: toAccountId,
          amount: parseFloat(amount),
          contribution_date: withdrawalDate,
          notes: reason || 'Withdrawal from goal',
          transaction_type: GoalService.CONTRIBUTION_TYPE.WITHDRAWAL,
          account_transaction_id: accountTx.id
        })
        .select('id')
        .single()

      if (withdrawalError) throw withdrawalError

      // CANONICAL: Reduce goal_allocations (FIFO - oldest first)
      const { data: allocations, error: allocError } = await this.supabase
        .from('goal_allocations')
        .select('id, amount')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: true })

      if (allocError) throw allocError

      let remainingToReduce = parseFloat(amount)
      const allocationsToDelete = []
      const allocationsToUpdate = []

      for (const allocation of allocations) {
        if (remainingToReduce <= 0) break

        const allocAmount = parseFloat(allocation.amount)

        if (allocAmount <= remainingToReduce) {
          // Delete this allocation entirely
          allocationsToDelete.push(allocation.id)
          remainingToReduce -= allocAmount
        } else {
          // Partially reduce this allocation
          allocationsToUpdate.push({
            id: allocation.id,
            newAmount: allocAmount - remainingToReduce
          })
          remainingToReduce = 0
        }
      }

      // Delete fully consumed allocations
      if (allocationsToDelete.length > 0) {
        const { error: deleteError } = await this.supabase
          .from('goal_allocations')
          .delete()
          .in('id', allocationsToDelete)

        if (deleteError) throw deleteError
      }

      // Update partially consumed allocations
      for (const update of allocationsToUpdate) {
        const { error: updateError } = await this.supabase
          .from('goal_allocations')
          .update({ amount: update.newAmount })
          .eq('id', update.id)

        if (updateError) throw updateError
      }

      // Calculate new goal balance from remaining allocations
      const newBalance = await this.calculateGoalBalance(goalId)

      return {
        success: true,
        withdrawalId: withdrawal.id,
        accountTransactionId: accountTx.id,
        newBalance: newBalance
      }
    } catch (error) {
      console.error('Error making withdrawal:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Abandon a goal and optionally refund accumulated funds
   * @param {string} goalId - Goal ID
   * @param {string} reason - Abandonment reason
   * @param {string} refundToAccountId - Optional account to refund to
   * @returns {Promise<object>} - {success, refundedAmount, accountTransactionId, error}
   */
  async abandonGoal(goalId, reason, refundToAccountId = null) {
    try {
      if (!goalId) {
        return {
          success: false,
          error: 'Goal ID is required'
        }
      }

      // Use database function to handle abandonment
      const { data: result, error } = await this.supabase
        .rpc('abandon_goal', {
          p_user_id: this.userId,
          p_goal_id: goalId,
          p_abandonment_reason: reason || 'Goal abandoned',
          p_refund_to_account_id: refundToAccountId
        })

      if (error) throw error

      if (!result.success) {
        throw new Error(result.error)
      }

      return {
        success: true,
        refundedAmount: result.refunded_amount,
        accountTransactionId: result.account_transaction_id
      }
    } catch (error) {
      console.error('Error abandoning goal:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Pause a goal
   * @param {string} goalId - Goal ID
   * @returns {Promise<object>} - {success, error}
   */
  async pauseGoal(goalId) {
    try {
      const { error } = await this.supabase
        .from('goals')
        .update({
          status: GoalService.STATUS.PAUSED,
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId)
        .eq('user_id', this.userId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error pausing goal:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Resume a paused goal
   * @param {string} goalId - Goal ID
   * @returns {Promise<object>} - {success, error}
   */
  async resumeGoal(goalId) {
    try {
      const { error } = await this.supabase
        .from('goals')
        .update({
          status: GoalService.STATUS.ACTIVE,
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId)
        .eq('user_id', this.userId)
        .eq('status', GoalService.STATUS.PAUSED)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error resuming goal:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Update goal details
   * @param {string} goalId - Goal ID
   * @param {object} updates - Fields to update
   * @returns {Promise<object>} - {success, error}
   */
  async updateGoal(goalId, updates) {
    try {
      const { error } = await this.supabase
        .from('goals')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId)
        .eq('user_id', this.userId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error updating goal:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Calculate goal balance from goal_allocations
   * CANONICAL: goal.current_amount = SUM(goal_allocations.amount)
   * @param {string} goalId - Goal ID
   * @returns {Promise<number>} - Goal balance
   */
  async calculateGoalBalance(goalId) {
    try {
      const { data: allocations, error } = await this.supabase
        .from('goal_allocations')
        .select('amount')
        .eq('goal_id', goalId)

      if (error) throw error

      if (!allocations || allocations.length === 0) {
        return 0
      }

      return allocations.reduce((sum, alloc) => sum + parseFloat(alloc.amount || 0), 0)
    } catch (error) {
      console.error('Error calculating goal balance:', error)
      return 0
    }
  }

  /**
   * Get all goals with contributions
   * @param {object} filters - {status, category}
   * @returns {Promise<object>} - {success, goals, summary, error}
   */
  async getAllGoals(filters = {}) {
    try {
      let query = this.supabase
        .from('goals')
        .select(`
          *,
          linked_account:accounts!goals_linked_account_id_fkey (
            id,
            name,
            account_type,
            current_balance
          )
        `)
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false })

      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.category) {
        query = query.eq('category', filters.category)
      }

      const { data: goals, error } = await query

      if (error) throw error

      // CANONICAL GOAL ALLOCATION ARCHITECTURE
      // Goals are virtual sub-accounts that track allocations of real account balances
      // current_amount = SUM(goal_allocations.amount), NOT account.current_balance
      const goalsWithRealProgress = await Promise.all(goals.map(async goal => {
        const allocatedAmount = await this.calculateGoalBalance(goal.id)
        return {
          ...goal,
          current_amount: allocatedAmount
        }
      }))

      // Calculate summary
      const summary = {
        total: goalsWithRealProgress.length,
        active: goalsWithRealProgress.filter(g => g.status === GoalService.STATUS.ACTIVE).length,
        completed: goalsWithRealProgress.filter(g => g.status === GoalService.STATUS.COMPLETED).length,
        abandoned: goalsWithRealProgress.filter(g => g.status === GoalService.STATUS.ABANDONED).length,
        paused: goalsWithRealProgress.filter(g => g.status === GoalService.STATUS.PAUSED).length,
        totalTargetAmount: goalsWithRealProgress
          .filter(g => g.status === GoalService.STATUS.ACTIVE)
          .reduce((sum, g) => sum + parseFloat(g.target_amount), 0),
        totalSavedAmount: goalsWithRealProgress
          .filter(g => g.status === GoalService.STATUS.ACTIVE)
          .reduce((sum, g) => sum + parseFloat(g.current_amount), 0)
      }

      return {
        success: true,
        goals: goalsWithRealProgress || [],
        summary
      }
    } catch (error) {
      console.error('Error getting goals:', error)
      return {
        success: false,
        goals: [],
        error: error.message
      }
    }
  }

  /**
   * Get goal with contribution history
   * @param {string} goalId - Goal ID
   * @returns {Promise<object>} - {success, goal, contributions, error}
   */
  async getGoalWithContributions(goalId) {
    try {
      // Get goal details
      const { data: goal, error: goalError } = await this.supabase
        .from('goals')
        .select(`
          *,
          linked_account:accounts!goals_linked_account_id_fkey (
            id,
            name,
            account_type,
            current_balance
          )
        `)
        .eq('id', goalId)
        .eq('user_id', this.userId)
        .single()

      if (goalError) throw goalError

      // Get contribution history
      const { data: contributions, error: contribError } = await this.supabase
        .from('goal_contributions')
        .select(`
          *,
          from_account:accounts!goal_contributions_from_account_id_fkey (
            id,
            name,
            account_type
          )
        `)
        .eq('goal_id', goalId)
        .order('contribution_date', { ascending: false })

      if (contribError) throw contribError

      // CANONICAL GOAL ALLOCATION ARCHITECTURE
      // Calculate current amount from goal_allocations, not account balance
      const allocatedAmount = await this.calculateGoalBalance(goalId)
      const goalWithRealProgress = {
        ...goal,
        current_amount: allocatedAmount
      }

      return {
        success: true,
        goal: goalWithRealProgress,
        contributions: contributions || []
      }
    } catch (error) {
      console.error('Error getting goal with contributions:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Get accounts suitable for goal linking (savings/investment accounts)
   * @returns {Promise<object>} - {success, accounts, error}
   */
  async getAccountsForGoals() {
    try {
      const { data: accounts, error } = await this.supabase
        .from('accounts')
        .select('id, name, account_type, category, current_balance, institution_name')
        .eq('user_id', this.userId)
        .in('account_type', ['cash', 'savings', 'investment'])
        .order('is_primary', { ascending: false })
        .order('current_balance', { ascending: false })

      if (error) throw error

      return {
        success: true,
        accounts: accounts || []
      }
    } catch (error) {
      console.error('Error getting accounts for goals:', error)
      return {
        success: false,
        accounts: [],
        error: error.message
      }
    }
  }

  /**
   * Delete a goal (only if no contributions made)
   * @param {string} goalId - Goal ID
   * @returns {Promise<object>} - {success, error}
   */
  async deleteGoal(goalId) {
    try {
      // Check if goal has contributions
      const { data: contributions, error: checkError } = await this.supabase
        .from('goal_contributions')
        .select('id')
        .eq('goal_id', goalId)
        .limit(1)

      if (checkError) throw checkError

      if (contributions && contributions.length > 0) {
        return {
          success: false,
          error: 'Cannot delete goal with contributions. Consider abandoning it instead.'
        }
      }

      // Delete goal
      const { error } = await this.supabase
        .from('goals')
        .delete()
        .eq('id', goalId)
        .eq('user_id', this.userId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error deleting goal:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}

export default GoalService
