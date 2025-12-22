import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { formatCurrency } from '../utils/calculations'
import { TrendingUp, Plus, Edit2, Trash2, X, DollarSign, AlertCircle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const ASSET_TYPES = [
  { value: 'cash', label: '💵 Cash', isLiability: false },
  { value: 'savings', label: '🏦 Savings Account', isLiability: false },
  { value: 'investment', label: '📈 Investments', isLiability: false },
  { value: 'property', label: '🏠 Property', isLiability: false },
  { value: 'vehicle', label: '🚗 Vehicle', isLiability: false },
  { value: 'other_asset', label: '💎 Other Asset', isLiability: false },
  { value: 'loan', label: '🏦 Loan', isLiability: true },
  { value: 'credit_card', label: '💳 Credit Card Debt', isLiability: true },
  { value: 'debt', label: '💸 Other Debt', isLiability: true },
  { value: 'other_liability', label: '⚠️ Other Liability', isLiability: true }
]

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#EF4444']

export default function NetWorth() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [netWorthHistory, setNetWorthHistory] = useState([])
  const [summary, setSummary] = useState({
    totalAssets: 0,
    totalLiabilities: 0,
    netWorth: 0
  })

  const [formData, setFormData] = useState({
    asset_name: '',
    asset_type: 'savings',
    amount: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    if (user) {
      fetchNetWorth()
    }
  }, [user])

  const fetchNetWorth = async () => {
    try {
      const { data, error } = await supabase
        .from('net_worth')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

      if (error) throw error

      setItems(data || [])
      calculateSummary(data || [])
      calculateHistory(data || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching net worth:', error)
      setLoading(false)
    }
  }

  const calculateSummary = (data) => {
    const assets = data.filter(item => !item.is_liability)
    const liabilities = data.filter(item => item.is_liability)

    const totalAssets = assets.reduce((sum, item) => sum + parseFloat(item.amount), 0)
    const totalLiabilities = liabilities.reduce((sum, item) => sum + parseFloat(item.amount), 0)

    setSummary({
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities
    })
  }

  const calculateHistory = (data) => {
    // Group by month
    const monthlyMap = {}
    
    data.forEach(item => {
      const month = item.date.slice(0, 7)
      if (!monthlyMap[month]) {
        monthlyMap[month] = { assets: 0, liabilities: 0 }
      }
      
      if (item.is_liability) {
        monthlyMap[month].liabilities += parseFloat(item.amount)
      } else {
        monthlyMap[month].assets += parseFloat(item.amount)
      }
    })

    const history = Object.entries(monthlyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6) // Last 6 months
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-KE', { month: 'short', year: 'numeric' }),
        assets: data.assets,
        liabilities: data.liabilities,
        netWorth: data.assets - data.liabilities
      }))

    setNetWorthHistory(history)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.asset_name || !formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const selectedType = ASSET_TYPES.find(t => t.value === formData.asset_type)

      if (editingItem) {
        const { error } = await supabase
          .from('net_worth')
          .update({
            asset_name: formData.asset_name,
            asset_type: formData.asset_type,
            amount: parseFloat(formData.amount),
            is_liability: selectedType.isLiability,
            notes: formData.notes,
            date: formData.date
          })
          .eq('id', editingItem.id)
          .eq('user_id', user.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('net_worth')
          .insert([
            {
              user_id: user.id,
              asset_name: formData.asset_name,
              asset_type: formData.asset_type,
              amount: parseFloat(formData.amount),
              is_liability: selectedType.isLiability,
              notes: formData.notes,
              date: formData.date
            }
          ])

        if (error) throw error
      }

      setFormData({
        asset_name: '',
        asset_type: 'savings',
        amount: '',
        notes: '',
        date: new Date().toISOString().split('T')[0]
      })
      setShowModal(false)
      setEditingItem(null)
      fetchNetWorth()
    } catch (error) {
      console.error('Error saving item:', error)
      alert('Error saving. Please try again.')
    }
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setFormData({
      asset_name: item.asset_name,
      asset_type: item.asset_type,
      amount: item.amount,
      notes: item.notes || '',
      date: item.date
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const { error } = await supabase
        .from('net_worth')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
      fetchNetWorth()
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  const getAssetsByType = (isLiability) => {
    return items
      .filter(item => item.is_liability === isLiability)
      .reduce((acc, item) => {
        const existing = acc.find(a => a.name === item.asset_type)
        if (existing) {
          existing.value += parseFloat(item.amount)
        } else {
          acc.push({
            name: ASSET_TYPES.find(t => t.value === item.asset_type)?.label || item.asset_type,
            value: parseFloat(item.amount)
          })
        }
        return acc
      }, [])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-20 rounded-xl p-4">
              <TrendingUp className="h-10 w-10 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">Net Worth Tracker</h2>
              <p className="text-emerald-100 mt-1">Track your assets and liabilities</p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingItem(null)
              setFormData({
                asset_name: '',
                asset_type: 'savings',
                amount: '',
                notes: '',
                date: new Date().toISOString().split('T')[0]
              })
              setShowModal(true)
            }}
            className="bg-white text-emerald-600 hover:bg-emerald-50 px-6 py-3 rounded-xl font-semibold flex items-center transition-all shadow-md"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Asset/Liability
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
          <p className="text-green-100 font-medium mb-2">Total Assets</p>
          <p className="text-4xl font-bold">{formatCurrency(summary.totalAssets)}</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-lg">
          <p className="text-red-100 font-medium mb-2">Total Liabilities</p>
          <p className="text-4xl font-bold">{formatCurrency(summary.totalLiabilities)}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
          <p className="text-blue-100 font-medium mb-2">Net Worth</p>
          <p className={`text-4xl font-bold ${summary.netWorth >= 0 ? 'text-white' : 'text-red-200'}`}>
            {formatCurrency(summary.netWorth)}
          </p>
        </div>
      </div>

      {/* Net Worth Trend */}
      {netWorthHistory.length > 0 && (
        <div className="card">
          <h3 className="text-xl font-bold text-gray-900 mb-8">Net Worth Trend (Last 6 Months)</h3>
          <div className="bg-gray-50 rounded-xl p-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={netWorthHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="netWorth" stroke="#3B82F6" strokeWidth={3} name="Net Worth" />
                <Line type="monotone" dataKey="assets" stroke="#10B981" strokeWidth={2} name="Assets" />
                <Line type="monotone" dataKey="liabilities" stroke="#EF4444" strokeWidth={2} name="Liabilities" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Assets & Liabilities Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets */}
        <div className="card">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Assets</h3>
          {getAssetsByType(false).length > 0 ? (
            <div className="space-y-4">
              {getAssetsByType(false).map((asset, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                  <span className="font-semibold text-gray-900">{asset.name}</span>
                  <span className="text-lg font-bold text-green-600">{formatCurrency(asset.value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No assets added yet</p>
          )}
        </div>

        {/* Liabilities */}
        <div className="card">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Liabilities</h3>
          {getAssetsByType(true).length > 0 ? (
            <div className="space-y-4">
              {getAssetsByType(true).map((liability, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                  <span className="font-semibold text-gray-900">{liability.name}</span>
                  <span className="text-lg font-bold text-red-600">{formatCurrency(liability.value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No liabilities added yet</p>
          )}
        </div>
      </div>

      {/* All Items List */}
      <div className="card">
        <h3 className="text-xl font-bold text-gray-900 mb-6">All Items</h3>
        {items.length === 0 ? (
          <div className="text-center py-16">
            <DollarSign className="h-20 w-20 text-gray-300 mx-auto mb-6" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No items yet</h3>
            <p className="text-gray-500 mb-6">Start tracking your assets and liabilities</p>
            <button onClick={() => setShowModal(true)} className="btn btn-primary px-8 py-3">
              Add Your First Item
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-5 rounded-xl ${
                  item.is_liability ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-1">
                    <span className="text-xl">
                      {ASSET_TYPES.find(t => t.value === item.asset_type)?.label.split(' ')[0] || '💰'}
                    </span>
                    <h4 className="font-bold text-gray-900">{item.asset_name}</h4>
                  </div>
                  <p className="text-sm text-gray-600 ml-9">
                    {ASSET_TYPES.find(t => t.value === item.asset_type)?.label.slice(2) || item.asset_type}
                    {' • '}
                    {new Date(item.date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  {item.notes && (
                    <p className="text-sm text-gray-500 ml-9 mt-1">{item.notes}</p>
                  )}
                </div>
                <div className="flex items-center space-x-4 ml-6">
                  <p className={`text-2xl font-bold ${item.is_liability ? 'text-red-600' : 'text-green-600'}`}>
                    {item.is_liability ? '-' : '+'}{formatCurrency(item.amount)}
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 animate-slideIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-gray-900">
                {editingItem ? 'Edit Item' : 'Add Asset or Liability'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingItem(null)
                }}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <label className="block text-base font-semibold text-gray-700">
                  Type *
                </label>
                <select
                  className="select text-base py-3.5"
                  value={formData.asset_type}
                  onChange={(e) => setFormData({ ...formData, asset_type: e.target.value })}
                  required
                >
                  <optgroup label="Assets">
                    {ASSET_TYPES.filter(t => !t.isLiability).map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Liabilities">
                    {ASSET_TYPES.filter(t => t.isLiability).map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-base font-semibold text-gray-700">
                    Name *
                  </label>
                  <input
                    type="text"
                    className="input text-base py-3.5"
                    placeholder="KCB Savings, Fuliza Loan..."
                    value={formData.asset_name}
                    onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-base font-semibold text-gray-700">
                    Amount (KES) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input text-base py-3.5"
                    placeholder="50,000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-base font-semibold text-gray-700">
                  Date *
                </label>
                <input
                  type="date"
                  className="input text-base py-3.5"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-3">
                <label className="block text-base font-semibold text-gray-700">
                  Notes (Optional)
                </label>
                <textarea
                  className="input text-base py-3.5 min-h-[100px]"
                  placeholder="Additional details..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="flex space-x-4 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingItem(null)
                  }}
                  className="flex-1 btn btn-secondary py-4 text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn btn-primary py-4 text-base"
                >
                  {editingItem ? 'Update' : 'Add'} Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}