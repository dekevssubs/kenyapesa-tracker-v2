import { useState } from 'react'
import { X, TrendingUp } from 'lucide-react'
import { formatCurrency } from '../../utils/calculations'

const RETURN_TYPES = [
  { value: 'interest', label: 'Interest', description: 'Interest earned on deposits (MMF, Savings, FD)' },
  { value: 'dividend', label: 'Dividend', description: 'Dividends from Saccos, Stocks, REITs' },
  { value: 'capital_gain', label: 'Capital Gain', description: 'Profit from selling investments' },
  { value: 'capital_loss', label: 'Capital Loss', description: 'Loss from selling investments' },
  { value: 'bonus', label: 'Bonus', description: 'Bonus shares or units' }
]

export default function RecordInvestmentReturnModal({ isOpen, onClose, onSubmit, accounts }) {
  const [formData, setFormData] = useState({
    account_id: '',
    return_type: 'interest',
    amount: '',
    rate: '',
    period_start: '',
    period_end: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  })
  const [selectedAccount, setSelectedAccount] = useState(null)

  const handleAccountChange = (e) => {
    const accountId = e.target.value
    setFormData({ ...formData, account_id: accountId })
    const account = accounts.find(a => a.id === accountId)
    setSelectedAccount(account)

    // Auto-fill rate if account has one
    if (account?.interest_rate && !formData.rate) {
      setFormData(prev => ({ ...prev, rate: account.interest_rate.toString() }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.account_id) {
      alert('Please select an investment account')
      return
    }

    const amount = parseFloat(formData.amount)
    if (!amount || amount === 0) {
      alert('Please enter a valid amount')
      return
    }

    const returnData = {
      account_id: formData.account_id,
      return_type: formData.return_type,
      amount: Math.abs(amount), // Store as positive, return_type indicates gain/loss
      rate: formData.rate ? parseFloat(formData.rate) : null,
      period_start: formData.period_start || null,
      period_end: formData.period_end || null,
      date: formData.date,
      notes: formData.notes
    }

    await onSubmit(returnData)
    handleClose()
  }

  const handleClose = () => {
    setFormData({
      account_id: '',
      return_type: 'interest',
      amount: '',
      rate: '',
      period_start: '',
      period_end: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    })
    setSelectedAccount(null)
    onClose()
  }

  if (!isOpen) return null

  // Filter to only investment accounts
  const investmentAccounts = accounts.filter(a => a.account_type === 'investment')

  const selectedReturnType = RETURN_TYPES.find(t => t.value === formData.return_type)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-slideIn">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Record Investment Return</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Track interest, dividends, and capital gains
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Investment Account */}
          <div className="form-group">
            <label className="label">Investment Account *</label>
            <select
              className="select"
              value={formData.account_id}
              onChange={handleAccountChange}
              required
            >
              <option value="">Select investment account</option>
              {investmentAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} - {formatCurrency(account.current_balance)}
                  {account.interest_rate && ` (${account.interest_rate}% p.a.)`}
                </option>
              ))}
            </select>
            {selectedAccount && (
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Current Balance:</strong> {formatCurrency(selectedAccount.current_balance)}
                </p>
                {selectedAccount.institution_name && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {selectedAccount.institution_name}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Return Type */}
          <div className="form-group">
            <label className="label">Return Type *</label>
            <select
              className="select"
              value={formData.return_type}
              onChange={(e) => setFormData({ ...formData, return_type: e.target.value })}
              required
            >
              {RETURN_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {selectedReturnType && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {selectedReturnType.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Amount */}
            <div className="form-group">
              <label className="label">Amount (KES) *</label>
              <input
                type="number"
                step="0.01"
                className="input"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
              {formData.return_type === 'capital_loss' && formData.amount && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Enter as positive number (will be recorded as loss)
                </p>
              )}
            </div>

            {/* Rate */}
            <div className="form-group">
              <label className="label">Rate (% p.a.) {(formData.return_type === 'interest' || formData.return_type === 'dividend') && '*'}</label>
              <input
                type="number"
                step="0.01"
                className="input"
                placeholder="e.g., 12.5"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                required={formData.return_type === 'interest' || formData.return_type === 'dividend'}
              />
            </div>
          </div>

          {/* Period (optional) */}
          {(formData.return_type === 'interest' || formData.return_type === 'dividend') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="label">Period Start (Optional)</label>
                <input
                  type="date"
                  className="input"
                  value={formData.period_start}
                  onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="label">Period End (Optional)</label>
                <input
                  type="date"
                  className="input"
                  value={formData.period_end}
                  onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Date */}
          <div className="form-group">
            <label className="label">Date Received *</label>
            <input
              type="date"
              className="input"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="label">Notes (Optional)</label>
            <textarea
              className="textarea"
              placeholder="e.g., Monthly interest for December"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          {/* Summary */}
          {formData.amount && selectedAccount && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-2 border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Return Summary</p>
                <TrendingUp className={`h-5 w-5 ${formData.return_type === 'capital_loss' ? 'text-red-500' : 'text-green-500'}`} />
              </div>
              <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <div className="flex justify-between">
                  <span>Account:</span>
                  <span className="font-medium">{selectedAccount.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Type:</span>
                  <span className="font-medium capitalize">{formData.return_type.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-300 dark:border-gray-500">
                  <span>Return Amount:</span>
                  <span className={formData.return_type === 'capital_loss' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                    {formData.return_type === 'capital_loss' ? '-' : '+'}{formatCurrency(formData.amount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 pt-1">
                  <span>New Balance:</span>
                  <span className="font-medium">
                    {formatCurrency(
                      parseFloat(selectedAccount.current_balance) +
                      (formData.return_type === 'capital_loss' ? -parseFloat(formData.amount) : parseFloat(formData.amount))
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

        </form>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex space-x-3 p-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 btn btn-secondary py-3"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 btn btn-primary py-3"
          >
            Record Return
          </button>
        </div>
      </div>
    </div>
  )
}
