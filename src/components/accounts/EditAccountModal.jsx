import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export default function EditAccountModal({ isOpen, onClose, onSubmit, account }) {
  const [formData, setFormData] = useState({
    name: '',
    institution_name: '',
    account_number: '',
    interest_rate: '',
    is_primary: false
  })

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name || '',
        institution_name: account.institution_name || '',
        account_number: account.account_number || '',
        interest_rate: account.interest_rate?.toString() || '',
        is_primary: account.is_primary || false
      })
    }
  }, [account])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      alert('Please enter an account name')
      return
    }

    const accountData = {
      ...formData,
      interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : null
    }

    await onSubmit(accountData)
  }

  const handleClose = () => {
    onClose()
  }

  if (!isOpen || !account) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-slideIn">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Edit Account</h2>
            <p className="text-sm text-gray-600 mt-1">
              Update account details
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Account Info (Read-only) */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Account Type</p>
            <p className="font-semibold text-gray-900 capitalize">
              {account.account_type} - {account.category?.replace(/_/g, ' ')}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Account type and category cannot be changed
            </p>
          </div>

          {/* Account Name */}
          <div className="form-group">
            <label className="label">Account Name *</label>
            <input
              type="text"
              className="input"
              placeholder="e.g., M-Pesa Main, KCB Savings"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          {/* Institution Name */}
          <div className="form-group">
            <label className="label">Institution Name (Optional)</label>
            <input
              type="text"
              className="input"
              placeholder="e.g., Safaricom, KCB Bank"
              value={formData.institution_name}
              onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
            />
          </div>

          {/* Account Number */}
          <div className="form-group">
            <label className="label">Account Number (Optional)</label>
            <input
              type="text"
              className="input"
              placeholder="e.g., 0722123456, 1234567890"
              value={formData.account_number}
              onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
            />
            <p className="text-xs text-gray-500 mt-1">
              Last 4 digits will be masked for security
            </p>
          </div>

          {/* Interest Rate */}
          {account.account_type === 'investment' && (
            <div className="form-group">
              <label className="label">Interest/Return Rate (% p.a.)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                placeholder="e.g., 10.5"
                value={formData.interest_rate}
                onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
              />
            </div>
          )}

          {/* Primary Account */}
          <div className="form-group">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox"
                checked={formData.is_primary}
                onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
              />
              <div>
                <span className="font-medium text-gray-900">Set as Primary Account</span>
                <p className="text-sm text-gray-600">
                  This will be the default account for {account.account_type} transactions
                </p>
              </div>
            </label>
          </div>

          {/* Current Balance Info */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm font-medium text-blue-900 mb-1">Current Balance</p>
            <p className="text-2xl font-bold text-blue-700">
              KES {parseFloat(account.current_balance || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Balance is automatically updated from transactions
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="btn btn-primary"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
