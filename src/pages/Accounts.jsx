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
import BankCard from '../components/accounts/BankCard'
import AccountDetailsModal from '../components/accounts/AccountDetailsModal'
import {
  Wallet,
  TrendingUp,
  Plus,
  ArrowRightLeft,
  PiggyBank,
  Smartphone,
  Eye,
  EyeOff,
  Filter
} from 'lucide-react'

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
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [detailsAccount, setDetailsAccount] = useState(null)

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

  const handleTransfer = async (fromAccountId, toAccountId, amount, description, transactionFee = 0) => {
    try {
      const service = new AccountService(supabase, user.id)
      const result = await service.transferBetweenAccounts(fromAccountId, toAccountId, amount, description, transactionFee)

      if (result.success) {
        const feeText = transactionFee > 0 ? ` (+ ${formatCurrency(transactionFee)} fee)` : ''
        showToast('Success', `Transferred ${formatCurrency(amount)}${feeText} successfully!`, 'success')
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

  const handleViewDetails = (account) => {
    setDetailsAccount(account)
    setShowDetailsModal(true)
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredAccounts.map((account) => (
              <BankCard
                key={account.id}
                account={account}
                showBalance={showBalances}
                onEdit={handleEditAccount}
                onDelete={handleDeleteAccount}
                onStatusChange={handleStatusChange}
                onViewDetails={handleViewDetails}
              />
            ))}
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

      {/* Account Details Modal */}
      <AccountDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false)
          setDetailsAccount(null)
        }}
        account={detailsAccount}
        linkedGoals={detailsAccount ? accountGoals[detailsAccount.id] || [] : []}
      />
    </div>
  )
}
