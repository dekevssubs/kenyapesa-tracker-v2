import { useState } from 'react'
import { X, Search, Smartphone, Building2, TrendingUp, Users, Landmark, BarChart3, Wallet, PiggyBank } from 'lucide-react'
import { KENYA_INVESTMENT_PRESETS, ACCOUNT_TYPE_LABELS, CATEGORY_LABELS } from '../../utils/kenyaInvestmentPresets'

const PRESET_CATEGORIES = [
  { id: 'cash', label: 'Cash Accounts', icon: Smartphone, color: 'text-green-500', data: KENYA_INVESTMENT_PRESETS.cash },
  { id: 'mmf', label: 'Money Market Funds', icon: TrendingUp, color: 'text-blue-500', data: KENYA_INVESTMENT_PRESETS.mmf },
  { id: 'saccos', label: 'Saccos', icon: Users, color: 'text-purple-500', data: KENYA_INVESTMENT_PRESETS.saccos },
  { id: 'government', label: 'Government Securities', icon: Landmark, color: 'text-indigo-500', data: KENYA_INVESTMENT_PRESETS.government },
  { id: 'stocks', label: 'Stocks & REITs', icon: BarChart3, color: 'text-pink-500', data: [...KENYA_INVESTMENT_PRESETS.stocks, ...KENYA_INVESTMENT_PRESETS.reits] },
]

export default function AddAccountModal({ isOpen, onClose, onSubmit }) {
  const [step, setStep] = useState(1) // 1: Select Type, 2: Enter Details
  const [selectedPreset, setSelectedPreset] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    account_type: 'cash',
    category: '',
    institution_name: '',
    account_number: '',
    current_balance: '',
    interest_rate: '',
    is_primary: false,
    notes: ''
  })

  const handlePresetSelect = (preset) => {
    setSelectedPreset(preset)
    setFormData({
      ...formData,
      name: preset.name,
      account_type: preset.account_type,
      category: preset.category,
      institution_name: preset.institution || '',
      interest_rate: preset.typical_rate || preset.typical_dividend || ''
    })
    setStep(2)
  }

  const handleCustomAccount = () => {
    setSelectedPreset(null)
    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      alert('Please enter an account name')
      return
    }

    const accountData = {
      ...formData,
      current_balance: parseFloat(formData.current_balance) || 0,
      interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : null
    }

    await onSubmit(accountData)
    handleClose()
  }

  const handleClose = () => {
    setStep(1)
    setSelectedPreset(null)
    setSelectedCategory(null)
    setSearchTerm('')
    setFormData({
      name: '',
      account_type: 'cash',
      category: '',
      institution_name: '',
      account_number: '',
      current_balance: '',
      interest_rate: '',
      is_primary: false,
      notes: ''
    })
    onClose()
  }

  if (!isOpen) return null

  const filteredCategories = PRESET_CATEGORIES.map(cat => ({
    ...cat,
    data: cat.data.filter(preset =>
      preset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      preset.institution?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(cat => cat.data.length > 0)

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-slideIn">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {step === 1 ? 'Add New Account' : `Set Up ${selectedPreset?.name || 'Custom Account'}`}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {step === 1 ? 'Choose from popular Kenyan options or create custom' : 'Enter your account details'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 ? (
            <>
              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    className="input pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
                    placeholder="Search for MMF, Sacco, Bank..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Preset Categories */}
              <div className="space-y-6">
                {filteredCategories.map((category) => {
                  const Icon = category.icon
                  return (
                    <div key={category.id}>
                      <div className="flex items-center space-x-2 mb-3">
                        <Icon className={`h-5 w-5 ${category.color}`} />
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">{category.label}</h4>
                        <span className="text-sm text-gray-500 dark:text-gray-400">({category.data.length})</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {category.data.map((preset) => (
                          <button
                            key={preset.name}
                            onClick={() => handlePresetSelect(preset)}
                            className="p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all text-left group"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                  {preset.name}
                                </p>
                                {preset.institution && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {preset.institution}
                                  </p>
                                )}
                              </div>
                              {(preset.typical_rate || preset.typical_dividend) && (
                                <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">
                                  {preset.typical_rate || preset.typical_dividend}% p.a.
                                </span>
                              )}
                            </div>
                            {preset.description && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                                {preset.description}
                              </p>
                            )}
                            {preset.min_investment && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                Min: KES {preset.min_investment.toLocaleString()}
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Custom Account Option */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleCustomAccount}
                  className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all"
                >
                  <div className="flex items-center justify-center space-x-2 text-gray-600 dark:text-gray-300">
                    <Wallet className="h-5 w-5" />
                    <span className="font-medium">Create Custom Account</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    For accounts not listed above
                  </p>
                </button>
              </div>
            </>
          ) : (
            // Step 2: Account Details Form
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Account Name */}
              <div className="form-group">
                <label className="label text-gray-700 dark:text-gray-300">Account Name *</label>
                <input
                  type="text"
                  className="input dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                  placeholder="e.g., Main M-Pesa, CIC MMF"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Account Type */}
                <div className="form-group">
                  <label className="label text-gray-700 dark:text-gray-300">Account Type *</label>
                  <select
                    className="select dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                    value={formData.account_type}
                    onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                    required
                  >
                    <option value="cash">Cash Account</option>
                    <option value="investment">Investment Account</option>
                    <option value="virtual">Virtual Account</option>
                  </select>
                </div>

                {/* Category */}
                <div className="form-group">
                  <label className="label text-gray-700 dark:text-gray-300">Category *</label>
                  <select
                    className="select dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                  >
                    <option value="">Select Category</option>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Institution Name */}
              <div className="form-group">
                <label className="label text-gray-700 dark:text-gray-300">Institution/Provider (Optional)</label>
                <input
                  type="text"
                  className="input dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                  placeholder="e.g., Safaricom, CIC Asset Management"
                  value={formData.institution_name}
                  onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Account Number */}
                <div className="form-group">
                  <label className="label text-gray-700 dark:text-gray-300">Account Number (Optional)</label>
                  <input
                    type="text"
                    className="input dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                    placeholder="e.g., 07XXXXXXXX"
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  />
                </div>

                {/* Current Balance */}
                <div className="form-group">
                  <label className="label text-gray-700 dark:text-gray-300">Current Balance (KES)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                    placeholder="0.00"
                    value={formData.current_balance}
                    onChange={(e) => setFormData({ ...formData, current_balance: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Leave blank if starting fresh
                  </p>
                </div>
              </div>

              {/* Interest Rate (for investments) */}
              {formData.account_type === 'investment' && (
                <div className="form-group">
                  <label className="label text-gray-700 dark:text-gray-300">Interest/Dividend Rate (% per annum)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                    placeholder="e.g., 12.5"
                    value={formData.interest_rate}
                    onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                  />
                </div>
              )}

              {/* Notes */}
              <div className="form-group">
                <label className="label text-gray-700 dark:text-gray-300">Notes (Optional)</label>
                <textarea
                  className="textarea dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                  placeholder="Any additional information..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Primary Account Checkbox */}
              <div className="form-group">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700"
                    checked={formData.is_primary}
                    onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Set as primary account (for income and default expenses)
                  </span>
                </label>
              </div>

              {/* Preset Info Banner */}
              {selectedPreset && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>💡 About {selectedPreset.name}:</strong> {selectedPreset.description}
                  </p>
                  {selectedPreset.min_investment && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                      Minimum Investment: KES {selectedPreset.min_investment.toLocaleString()}
                    </p>
                  )}
                  {selectedPreset.liquidity && (
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      Liquidity: {selectedPreset.liquidity}
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 btn btn-secondary py-3"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 btn btn-primary py-3"
                >
                  Add Account
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
