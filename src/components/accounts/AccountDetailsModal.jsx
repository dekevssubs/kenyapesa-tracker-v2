import { X, TrendingUp, Target, Wallet, Calendar, Building2, CreditCard, Info } from 'lucide-react'
import { formatCurrency } from '../../utils/calculations'
import { getBankColor, getDisplayInstitution } from '../../utils/bankBrandColors'

export default function AccountDetailsModal({ isOpen, onClose, account, linkedGoals = [] }) {
  if (!isOpen || !account) return null

  const bankColors = getBankColor(account.institution_name, account.category, account.account_type)
  const displayInstitution = getDisplayInstitution(account.institution_name, account.category, account.name)

  // Calculate goal allocations
  const totalGoalAllocations = linkedGoals.reduce((sum, g) => sum + g.current_amount, 0)
  const availableBalance = parseFloat(account.current_balance || 0) - totalGoalAllocations

  // Account type labels
  const accountTypeLabels = {
    cash: 'Cash Account',
    investment: 'Investment Account',
    virtual: 'Virtual Account'
  }

  // Category labels
  const categoryLabels = {
    mpesa: 'M-Pesa',
    airtel_money: 'Airtel Money',
    tkash: 'T-Kash',
    bank: 'Bank Account',
    cash: 'Cash',
    money_market_fund: 'Money Market Fund',
    sacco: 'Sacco',
    treasury_bill: 'Treasury Bill',
    treasury_bond: 'Treasury Bond',
    m_akiba: 'M-Akiba',
    stocks: 'Stocks',
    reit: 'REIT',
    unit_trust: 'Unit Trust',
    fixed_deposit: 'Fixed Deposit',
    chama: 'Chama',
    emergency_fund: 'Emergency Fund',
    sinking_fund: 'Sinking Fund'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] flex flex-col animate-slideIn">
        {/* Header with gradient */}
        <div className={`relative rounded-t-xl bg-gradient-to-br ${bankColors.gradient} p-6 text-white`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="pr-10">
            <p className="text-sm opacity-80 uppercase tracking-wider mb-1">{displayInstitution}</p>
            <h3 className="text-2xl font-bold">{account.name}</h3>
            <p className="text-sm opacity-80 mt-1">
              {accountTypeLabels[account.account_type] || 'Account'}
              {account.category && ` • ${categoryLabels[account.category] || account.category}`}
            </p>
          </div>

          {/* Balance display */}
          <div className="mt-6">
            <p className="text-sm opacity-80">Total Balance</p>
            <p className="text-4xl font-bold">{formatCurrency(account.current_balance)}</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Balance Breakdown - only show if there are linked goals */}
          {linkedGoals.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center">
                <Wallet className="h-4 w-4 mr-2 text-green-500" />
                Balance Breakdown
              </h4>

              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 space-y-3">
                {/* Available Balance */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Available Balance</span>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(availableBalance)}
                  </span>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Allocated to Goals</p>
                  <div className="space-y-2">
                    {linkedGoals.map((goal) => (
                      <div key={goal.id} className="flex justify-between items-center">
                        <span className="flex items-center text-gray-700 dark:text-gray-300">
                          <Target className="h-4 w-4 mr-2 text-purple-500" />
                          <span className="truncate max-w-[180px]">{goal.name}</span>
                        </span>
                        <span className="font-medium text-purple-600 dark:text-purple-400">
                          {formatCurrency(goal.current_amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total Allocated */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Total Allocated</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    {formatCurrency(totalGoalAllocations)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Account Details */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center">
              <Info className="h-4 w-4 mr-2 text-blue-500" />
              Account Details
            </h4>

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 space-y-3">
              {account.institution_name && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400 flex items-center">
                    <Building2 className="h-4 w-4 mr-2" />
                    Institution
                  </span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {account.institution_name}
                  </span>
                </div>
              )}

              {account.account_number && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400 flex items-center">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Account Number
                  </span>
                  <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                    •••• {account.account_number.slice(-4)}
                  </span>
                </div>
              )}

              {account.interest_rate && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400 flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Interest Rate
                  </span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {account.interest_rate}% p.a.
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400 flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Created
                </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {new Date(account.created_at).toLocaleDateString('en-KE', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Status</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  account.is_active === false
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }`}>
                  {account.is_active === false ? 'Inactive' : 'Active'}
                </span>
              </div>

              {account.is_primary && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Primary Account</span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    Yes
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {account.notes && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                Notes
              </h4>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
                <p className="text-gray-700 dark:text-gray-300 text-sm">{account.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full btn btn-secondary py-3"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
