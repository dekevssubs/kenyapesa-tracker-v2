import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../utils/supabase'
import { AccountService } from '../utils/accountService'
import { formatCurrency } from '../utils/calculations'
import AddAccountModal from '../components/accounts/AddAccountModal'
import EditAccountModal from '../components/accounts/EditAccountModal'
import TransferMoneyModal from '../components/accounts/TransferMoneyModal'
import RecordInvestmentReturnModal from '../components/accounts/RecordInvestmentReturnModal'
import ConfirmationModal from '../components/ConfirmationModal'
import {
  Wallet,
  TrendingUp,
  Plus,
  ArrowRightLeft,
  PiggyBank,
  Building2,
  Smartphone,
  Users,
  Landmark,
  BarChart3,
  Eye,
  EyeOff,
  Filter,
  Edit2,
  Trash2,
  History,
  MoreVertical,
  CheckCircle,
  XCircle,
  PauseCircle,
  CreditCard,
  Target
} from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Accounts() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState([])
  const [balances, setBalances] = useState({
    cash: 0,
    investment: 0,
    virtual: 0,
    total: 0
  })
  const [showBalances, setShowBalances] = useState(true)
  const [filterType, setFilterType] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferFromAccount, setTransferFromAccount] = useState(null) // Pre-selected source account
  const [pendingDeleteAccount, setPendingDeleteAccount] = useState(null) // Account to delete after transfer
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'danger',
    onConfirm: () => {}
  })
  const [accountGoals, setAccountGoals] = useState({}) // Goals per account with allocations

  useEffect(() => {
    if (user) {
      fetchAccounts()
    }
  }, [user])

  const fetchAccounts = async () => {
    try {
      const service = new AccountService(supabase, user.id)
      // Pass false to include inactive accounts in the list
      const accountsData = await service.getAccounts(false)
      const balancesData = await service.getBalanceByType()

      setAccounts(accountsData)
      setBalances(balancesData)

      // Fetch goals with allocations for each account
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select(`
          id,
          name,
          target_amount,
          linked_account_id,
          status,
          goal_allocations (
            amount
          )
        `)
        .eq('user_id', user.id)
        .in('status', ['active', 'paused'])

      if (goalsError) throw goalsError

      // Group goals by linked_account_id with calculated allocations
      const goalsMap = {}
      if (goalsData) {
        goalsData.forEach(goal => {
          if (goal.linked_account_id) {
            if (!goalsMap[goal.linked_account_id]) {
              goalsMap[goal.linked_account_id] = []
            }
            // Calculate current amount from allocations
            const currentAmount = (goal.goal_allocations || [])
              .reduce((sum, alloc) => sum + parseFloat(alloc.amount || 0), 0)

            goalsMap[goal.linked_account_id].push({
              id: goal.id,
              name: goal.name,
              target_amount: parseFloat(goal.target_amount || 0),
              current_amount: currentAmount,
              status: goal.status
            })
          }
        })
      }
      setAccountGoals(goalsMap)

      setLoading(false)
    } catch (error) {
      console.error('Error fetching accounts:', error)
      showToast('Error', 'Failed to fetch accounts', 'error')
      setLoading(false)
    }
  }

  const handleAddAccount = async (accountData) => {
    try {
      const service = new AccountService(supabase, user.id)
      const result = await service.createAccount(accountData)

      if (result.success) {
        showToast('Success', `${accountData.name} added successfully!`, 'success')
        fetchAccounts()
      } else {
        showToast('Error', result.error || 'Failed to add account', 'error')
      }
    } catch (error) {
      console.error('Error adding account:', error)
      showToast('Error', 'Failed to add account', 'error')
    }
  }

  const handleTransfer = async (fromAccountId, toAccountId, amount, description) => {
    try {
      const service = new AccountService(supabase, user.id)
      const result = await service.transferBetweenAccounts(fromAccountId, toAccountId, amount, description)

      if (result.success) {
        showToast('Success', `Transferred ${formatCurrency(amount)} successfully!`, 'success')
        await fetchAccounts()

        // Check if this was a transfer before deletion
        if (pendingDeleteAccount && pendingDeleteAccount.id === fromAccountId) {
          const accountToDelete = pendingDeleteAccount
          setPendingDeleteAccount(null)
          setTransferFromAccount(null)
          setShowTransferModal(false)

          // Prompt to delete the now-empty account
          setConfirmModal({
            isOpen: true,
            title: 'Delete Account Now?',
            message: `Funds transferred successfully!\n\nDo you want to delete ${accountToDelete.name} now?`,
            variant: 'warning',
            onConfirm: async () => {
              try {
                const { error: deleteError } = await supabase
                  .from('accounts')
                  .delete()
                  .eq('id', accountToDelete.id)
                  .eq('user_id', user.id)

                if (deleteError) throw deleteError

                showToast('Success', `${accountToDelete.name} deleted successfully`, 'success')
                fetchAccounts()
              } catch (err) {
                console.error('Error deleting account:', err)
                showToast('Error', 'Failed to delete account', 'error')
              }
            }
          })
        }
      } else {
        showToast('Error', result.error || 'Failed to transfer money', 'error')
      }
    } catch (error) {
      console.error('Error transferring money:', error)
      showToast('Error', 'Failed to transfer money', 'error')
    }
  }

  const handleRecordReturn = async (returnData) => {
    try {
      const service = new AccountService(supabase, user.id)
      const result = await service.recordInvestmentReturn(returnData)

      if (result.success) {
        showToast('Success', `${returnData.return_type} of ${formatCurrency(returnData.amount)} recorded!`, 'success')
        fetchAccounts()
      } else {
        showToast('Error', result.error || 'Failed to record investment return', 'error')
      }
    } catch (error) {
      console.error('Error recording investment return:', error)
      showToast('Error', 'Failed to record investment return', 'error')
    }
  }

  const handleEditAccount = (account) => {
    setEditingAccount(account)
    setShowEditModal(true)
  }

  const handleUpdateAccount = async (accountData) => {
    try {
      const { error } = await supabase
        .from('accounts')
        .update({
          name: accountData.name,
          institution_name: accountData.institution_name,
          account_number: accountData.account_number,
          interest_rate: accountData.interest_rate,
          is_primary: accountData.is_primary
        })
        .eq('id', editingAccount.id)
        .eq('user_id', user.id)

      if (error) throw error

      // If setting as primary, unset other primary accounts of same type
      if (accountData.is_primary && !editingAccount.is_primary) {
        await supabase
          .from('accounts')
          .update({ is_primary: false })
          .eq('user_id', user.id)
          .eq('account_type', editingAccount.account_type)
          .neq('id', editingAccount.id)
      }

      showToast('Success', `${accountData.name} updated successfully!`, 'success')
      setShowEditModal(false)
      setEditingAccount(null)
      fetchAccounts()
    } catch (error) {
      console.error('Error updating account:', error)
      showToast('Error', 'Failed to update account', 'error')
    }
  }

  const handleDeleteAccount = async (account) => {
    // Prevent deleting the only primary account
    if (account.is_primary) {
      const otherAccountsOfType = accounts.filter(
        a => a.account_type === account.account_type && a.id !== account.id
      )

      if (otherAccountsOfType.length === 0) {
        showToast('Error', 'Cannot delete the only account of this type. Add another account first.', 'error')
        return
      }
    }

    // Check if account has balance - must transfer first
    const balance = parseFloat(account.current_balance || 0)
    if (balance > 0) {
      showToast(
        'Transfer Required',
        `${account.name} has ${formatCurrency(balance)}. Please transfer the funds to another account before deleting.`,
        'warning',
        6000
      )
      // Open transfer modal with this account pre-selected as source
      // Mark account as pending deletion so we can auto-delete after transfer
      // Include account name in description so history shows it after account is deleted
      setTransferFromAccount({
        ...account,
        pendingDeleteDescription: `Transfer from ${account.name} (account closing)`
      })
      setPendingDeleteAccount(account)
      setShowTransferModal(true)
      return
    }

    // Check if account has transactions
    try {
      const { data: transactions, error } = await supabase
        .from('account_transactions')
        .select('id')
        .or(`from_account_id.eq.${account.id},to_account_id.eq.${account.id}`)
        .limit(1)

      if (error) throw error

      const hasTransactions = transactions && transactions.length > 0

      setConfirmModal({
        isOpen: true,
        title: hasTransactions ? 'Delete Account with History?' : 'Delete Account?',
        message: hasTransactions
          ? `${account.name} has transaction history.\n\nDeleting this account will:\n• Remove all transaction history\n• This action cannot be undone`
          : `Are you sure you want to delete ${account.name}?`,
        variant: 'danger',
        onConfirm: async () => {
          try {
            const { error: deleteError } = await supabase
              .from('accounts')
              .delete()
              .eq('id', account.id)
              .eq('user_id', user.id)

            if (deleteError) throw deleteError

            showToast('Success', `${account.name} deleted successfully`, 'success')
            fetchAccounts()
          } catch (err) {
            console.error('Error deleting account:', err)
            showToast('Error', 'Failed to delete account', 'error')
          }
        }
      })
    } catch (error) {
      console.error('Error checking transactions:', error)
      showToast('Error', 'Failed to check account transactions', 'error')
    }
  }

  const getAccountIcon = (category) => {
    const iconMap = {
      mpesa: Smartphone,
      bank: Building2,
      cash: Wallet,
      airtel_money: Smartphone,
      tkash: Smartphone,
      money_market_fund: TrendingUp,
      sacco: Users,
      treasury_bill: Landmark,
      treasury_bond: Landmark,
      m_akiba: Landmark,
      stocks: BarChart3,
      reit: Building2,
      fixed_deposit: PiggyBank,
      chama: Users
    }
    return iconMap[category] || Wallet
  }

  const getAccountColor = (accountType) => {
    const colorMap = {
      cash: 'from-green-500 to-green-600',
      investment: 'from-blue-500 to-blue-600',
      virtual: 'from-purple-500 to-purple-600'
    }
    return colorMap[accountType] || 'from-gray-500 to-gray-600'
  }

  const getStatusConfig = (isActive) => {
    if (isActive === false) {
      return { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', icon: XCircle, label: 'Inactive' }
    }
    return { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', icon: CheckCircle, label: 'Active' }
  }

  const handleStatusChange = async (account, newIsActive) => {
    const actionText = newIsActive ? 'activate' : 'deactivate'
    const statusText = newIsActive ? 'active' : 'inactive'

    setConfirmModal({
      isOpen: true,
      title: `${newIsActive ? 'Activate' : 'Deactivate'} Account?`,
      message: `Are you sure you want to ${actionText} ${account.name}?${!newIsActive ? '\n\nInactive accounts cannot be used for transactions.' : ''}`,
      variant: newIsActive ? 'info' : 'warning',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('accounts')
            .update({ is_active: newIsActive })
            .eq('id', account.id)
            .eq('user_id', user.id)

          if (error) throw error

          showToast('Success', `${account.name} is now ${statusText}`, 'success')
          fetchAccounts()
        } catch (err) {
          console.error('Error updating account status:', err)
          showToast('Error', 'Failed to update account status', 'error')
        }
      }
    })
  }

  const filteredAccounts = accounts.filter(account => {
    if (filterType === 'all') return true
    return account.account_type === filterType
  })

  const cashAccounts = accounts.filter(a => a.account_type === 'cash')
  const investmentAccounts = accounts.filter(a => a.account_type === 'investment')
  const virtualAccounts = accounts.filter(a => a.account_type === 'virtual')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Accounts</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your cash and investment accounts</p>
        </div>
        <button
          onClick={() => setShowBalances(!showBalances)}
          className="btn btn-secondary flex items-center"
        >
          {showBalances ? <EyeOff className="h-5 w-5 mr-2" /> : <Eye className="h-5 w-5 mr-2" />}
          {showBalances ? 'Hide' : 'Show'} Balances
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Net Worth */}
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-indigo-100 text-sm font-medium">Total Net Worth</p>
            <Wallet className="h-6 w-6 text-indigo-200" />
          </div>
          <p className="text-4xl font-bold">
            {showBalances ? formatCurrency(balances.total) : '••••••'}
          </p>
          <p className="text-indigo-100 text-sm mt-2">
            {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
          </p>
        </div>

        {/* Liquid Cash */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-green-100 text-sm font-medium">Liquid Cash</p>
            <Smartphone className="h-6 w-6 text-green-200" />
          </div>
          <p className="text-4xl font-bold">
            {showBalances ? formatCurrency(balances.cash) : '••••••'}
          </p>
          <p className="text-green-100 text-sm mt-2">
            {cashAccounts.length} cash {cashAccounts.length === 1 ? 'account' : 'accounts'}
          </p>
        </div>

        {/* Investments */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-blue-100 text-sm font-medium">Investments</p>
            <TrendingUp className="h-6 w-6 text-blue-200" />
          </div>
          <p className="text-4xl font-bold">
            {showBalances ? formatCurrency(balances.investment) : '••••••'}
          </p>
          <p className="text-blue-100 text-sm mt-2">
            {investmentAccounts.length} investment {investmentAccounts.length === 1 ? 'account' : 'accounts'}
          </p>
        </div>

        {/* Virtual/Savings */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-purple-100 text-sm font-medium">Virtual Accounts</p>
            <PiggyBank className="h-6 w-6 text-purple-200" />
          </div>
          <p className="text-4xl font-bold">
            {showBalances ? formatCurrency(balances.virtual) : '••••••'}
          </p>
          <p className="text-purple-100 text-sm mt-2">
            {virtualAccounts.length} virtual {virtualAccounts.length === 1 ? 'account' : 'accounts'}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary py-4 flex items-center justify-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add New Account
          </button>
          <button
            onClick={() => setShowTransferModal(true)}
            className="btn btn-secondary py-4 flex items-center justify-center"
            disabled={accounts.length < 2}
          >
            <ArrowRightLeft className="h-5 w-5 mr-2" />
            Transfer Money
          </button>
          <button
            onClick={() => setShowReturnModal(true)}
            className="btn btn-secondary py-4 flex items-center justify-center"
            disabled={accounts.filter(a => a.account_type === 'investment').length === 0}
          >
            <TrendingUp className="h-5 w-5 mr-2" />
            Record Investment Return
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filter Accounts</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All ({accounts.length})
          </button>
          <button
            onClick={() => setFilterType('cash')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterType === 'cash'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Cash ({cashAccounts.length})
          </button>
          <button
            onClick={() => setFilterType('investment')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterType === 'investment'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Investments ({investmentAccounts.length})
          </button>
          <button
            onClick={() => setFilterType('virtual')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterType === 'virtual'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Virtual ({virtualAccounts.length})
          </button>
        </div>
      </div>

      {/* Accounts List */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Your Accounts {filterType !== 'all' && `(${filteredAccounts.length} filtered)`}
        </h3>

        {filteredAccounts.length === 0 ? (
          <div className="text-center py-12">
            <Wallet className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {accounts.length === 0
                ? 'No accounts yet'
                : 'No accounts match your filter'}
            </p>
            {accounts.length === 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="btn btn-primary"
              >
                Add Your First Account
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAccounts.map((account) => {
              const Icon = getAccountIcon(account.category)
              const gradient = getAccountColor(account.account_type)
              const statusConfig = getStatusConfig(account.is_active)
              const StatusIcon = statusConfig.icon
              const isInactive = account.is_active === false

              // Calculate goal allocations for this account
              const linkedGoals = accountGoals[account.id] || []
              const totalGoalAllocations = linkedGoals.reduce((sum, g) => sum + g.current_amount, 0)
              const availableBalance = parseFloat(account.current_balance || 0) - totalGoalAllocations

              return (
                <div
                  key={account.id}
                  className={`relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 ${isInactive ? 'opacity-75' : ''}`}
                >
                  {/* Gradient Header */}
                  <div className={`h-24 bg-gradient-to-br ${gradient} relative`}>
                    <div className="absolute inset-0 bg-black/10" />
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white/20 to-transparent" />

                    {/* Icon Badge */}
                    <div className="absolute -bottom-6 left-6">
                      <div className={`p-4 rounded-2xl bg-gradient-to-br ${gradient} shadow-lg border-4 border-white dark:border-gray-800`}>
                        <Icon className="h-7 w-7 text-white" />
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="absolute top-3 right-3 flex items-center space-x-2">
                      {account.is_primary && (
                        <span className="px-2 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium">
                          Primary
                        </span>
                      )}
                      <div className="relative group">
                        <button className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {/* Dropdown Menu */}
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                          <button
                            onClick={() => handleEditAccount(account)}
                            className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center"
                          >
                            <Edit2 className="h-4 w-4 mr-2" /> Edit
                          </button>
                          <Link
                            to={`/account-history?account=${account.id}`}
                            className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center"
                          >
                            <History className="h-4 w-4 mr-2" /> View History
                          </Link>
                          <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                          {account.is_active === false ? (
                            <button
                              onClick={() => handleStatusChange(account, true)}
                              className="w-full px-3 py-2 text-left text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" /> Activate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStatusChange(account, false)}
                              className="w-full px-3 py-2 text-left text-sm text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center"
                            >
                              <PauseCircle className="h-4 w-4 mr-2" /> Deactivate
                            </button>
                          )}
                          <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                          <button
                            onClick={() => handleDeleteAccount(account)}
                            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="pt-10 px-6 pb-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {account.name}
                        </h4>
                        {account.institution_name && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {account.institution_name}
                          </p>
                        )}
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </span>
                    </div>

                    {/* Balance */}
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 mb-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium uppercase tracking-wider">Total Balance</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        {showBalances ? formatCurrency(account.current_balance) : '••••••'}
                      </p>

                      {/* Show Available vs Goal Allocations if account has linked goals */}
                      {linkedGoals.length > 0 && showBalances && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Available</span>
                            <span className="font-semibold text-green-600 dark:text-green-400">
                              {formatCurrency(availableBalance)}
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {linkedGoals.map((goal) => (
                              <div key={goal.id} className="flex justify-between items-center text-sm">
                                <span className="flex items-center text-gray-600 dark:text-gray-400">
                                  <Target className="h-3 w-3 mr-1.5 text-purple-500" />
                                  <span className="truncate max-w-[120px]" title={goal.name}>{goal.name}</span>
                                </span>
                                <span className="font-medium text-purple-600 dark:text-purple-400">
                                  {formatCurrency(goal.current_amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Meta Info */}
                    <div className="flex items-center justify-between text-sm">
                      {account.interest_rate ? (
                        <div className="flex items-center text-green-600 dark:text-green-400 font-medium">
                          <TrendingUp className="h-4 w-4 mr-1" />
                          {account.interest_rate}% p.a.
                        </div>
                      ) : (
                        <div></div>
                      )}
                      {account.account_number && (
                        <div className="flex items-center text-gray-500 dark:text-gray-400">
                          <CreditCard className="h-4 w-4 mr-1" />
                          •••• {account.account_number.slice(-4)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Account Modal */}
      <AddAccountModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddAccount}
      />

      {/* Edit Account Modal */}
      <EditAccountModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingAccount(null)
        }}
        onSubmit={handleUpdateAccount}
        account={editingAccount}
      />

      {/* Transfer Money Modal */}
      <TransferMoneyModal
        isOpen={showTransferModal}
        onClose={() => {
          setShowTransferModal(false)
          setTransferFromAccount(null)
          setPendingDeleteAccount(null)
        }}
        onSubmit={handleTransfer}
        accounts={accounts}
        preSelectedFromAccount={transferFromAccount}
      />

      {/* Record Investment Return Modal */}
      <RecordInvestmentReturnModal
        isOpen={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        onSubmit={handleRecordReturn}
        accounts={accounts}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmText={confirmModal.variant === 'danger' ? 'Delete' : 'Confirm'}
      />
    </div>
  )
}
