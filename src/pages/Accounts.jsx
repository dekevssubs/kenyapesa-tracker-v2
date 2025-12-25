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
  History
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
  const [showReturnModal, setShowReturnModal] = useState(false)

  useEffect(() => {
    if (user) {
      fetchAccounts()
    }
  }, [user])

  const fetchAccounts = async () => {
    try {
      const service = new AccountService(supabase, user.id)
      const accountsData = await service.getAccounts()
      const balancesData = await service.getBalanceByType()

      setAccounts(accountsData)
      setBalances(balancesData)
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
        fetchAccounts()
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
    // Check if account has transactions
    try {
      const { data: transactions, error } = await supabase
        .from('account_transactions')
        .select('id')
        .or(`from_account_id.eq.${account.id},to_account_id.eq.${account.id}`)
        .limit(1)

      if (error) throw error

      if (transactions && transactions.length > 0) {
        const confirmDelete = confirm(
          `⚠️ Warning: ${account.name} has transaction history.\n\n` +
          `Deleting this account will:\n` +
          `• Remove all transaction history\n` +
          `• This action cannot be undone\n\n` +
          `Are you sure you want to delete this account?`
        )

        if (!confirmDelete) return
      } else {
        const confirmDelete = confirm(
          `Are you sure you want to delete ${account.name}?`
        )

        if (!confirmDelete) return
      }

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

      // Delete the account (cascade will delete transactions)
      const { error: deleteError } = await supabase
        .from('accounts')
        .delete()
        .eq('id', account.id)
        .eq('user_id', user.id)

      if (deleteError) throw deleteError

      showToast('Success', `${account.name} deleted successfully`, 'success')
      fetchAccounts()
    } catch (error) {
      console.error('Error deleting account:', error)
      showToast('Error', 'Failed to delete account', 'error')
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAccounts.map((account) => {
              const Icon = getAccountIcon(account.category)
              const gradient = getAccountColor(account.account_type)

              return (
                <div
                  key={account.id}
                  className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-600"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} text-white`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex items-center space-x-2">
                      {account.is_primary && (
                        <span className="badge bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs">
                          Primary
                        </span>
                      )}
                      <button
                        onClick={() => handleEditAccount(account)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Edit account"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(account)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Delete account"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    {account.name}
                  </h4>

                  {account.institution_name && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {account.institution_name}
                    </p>
                  )}

                  <div className="mb-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Balance</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {showBalances ? formatCurrency(account.current_balance) : '••••••'}
                    </p>
                  </div>

                  {account.interest_rate && (
                    <div className="flex items-center text-sm text-green-600">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      {account.interest_rate}% p.a.
                    </div>
                  )}

                  {account.account_number && (
                    <p className="text-xs text-gray-500 mt-2">
                      A/C: •••• {account.account_number.slice(-4)}
                    </p>
                  )}
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
        onClose={() => setShowTransferModal(false)}
        onSubmit={handleTransfer}
        accounts={accounts}
      />

      {/* Record Investment Return Modal */}
      <RecordInvestmentReturnModal
        isOpen={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        onSubmit={handleRecordReturn}
        accounts={accounts}
      />
    </div>
  )
}
