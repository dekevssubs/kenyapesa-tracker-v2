import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { formatCurrency, calculateNetSalary } from '../utils/calculations'
import { Plus, Edit2, Trash2, DollarSign, TrendingUp, X, Calculator, FileText } from 'lucide-react'

const INCOME_SOURCES = ['salary', 'side_hustle', 'investment', 'bonus', 'gift', 'other']

export default function Income() {
  const { user } = useAuth()
  const [incomes, setIncomes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingIncome, setEditingIncome] = useState(null)
  const [totalIncome, setTotalIncome] = useState(0)
  const [showCalculator, setShowCalculator] = useState(false)

  const [formData, setFormData] = useState({
    amount: '',
    source: 'salary',
    description: '',
    date: new Date().toISOString().split('T')[0],
    gross_salary: '', // For salary with deductions
    is_gross: false
  })

  const [calculatedSalary, setCalculatedSalary] = useState(null)

  useEffect(() => {
    if (user) {
      fetchIncomes()
    }
  }, [user])

  useEffect(() => {
    // Auto-calculate when gross salary is entered
    if (formData.is_gross && formData.gross_salary && parseFloat(formData.gross_salary) > 0) {
      const result = calculateNetSalary(parseFloat(formData.gross_salary))
      setCalculatedSalary(result)
      setFormData(prev => ({ ...prev, amount: result.netSalary.toString() }))
    } else {
      setCalculatedSalary(null)
    }
  }, [formData.gross_salary, formData.is_gross])

  const fetchIncomes = async () => {
    try {
      const { data, error } = await supabase
        .from('income')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

      if (error) throw error

      setIncomes(data || [])
      
      const currentDate = new Date()
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

      const monthlyTotal = (data || [])
        .filter(income => {
          const incomeDate = new Date(income.date)
          return incomeDate >= firstDay && incomeDate <= lastDay
        })
        .reduce((sum, income) => sum + parseFloat(income.amount), 0)

      setTotalIncome(monthlyTotal)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching incomes:', error)
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    try {
      const incomeData = {
        user_id: user.id,
        amount: parseFloat(formData.amount),
        source: formData.source,
        description: formData.description,
        date: formData.date
      }

      if (editingIncome) {
        const { error } = await supabase
          .from('income')
          .update(incomeData)
          .eq('id', editingIncome.id)
          .eq('user_id', user.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('income')
          .insert([incomeData])

        if (error) throw error

        // If salary with deductions, also save to deductions table
        if (formData.is_gross && calculatedSalary) {
          const currentMonth = new Date(formData.date).toISOString().split('T')[0].slice(0, 7) + '-01'
          
          await supabase
            .from('deductions')
            .upsert([
              {
                user_id: user.id,
                gross_salary: calculatedSalary.grossSalary,
                nssf: calculatedSalary.nssf,
                housing_levy: calculatedSalary.housingLevy,
                shif: calculatedSalary.shif,
                taxable_income: calculatedSalary.taxableIncome,
                paye: calculatedSalary.paye,
                personal_relief: calculatedSalary.personalRelief,
                total_deductions: calculatedSalary.totalDeductions,
                net_salary: calculatedSalary.netSalary,
                month: currentMonth
              }
            ], { onConflict: 'user_id,month' })
        }
      }

      setFormData({
        amount: '',
        source: 'salary',
        description: '',
        date: new Date().toISOString().split('T')[0],
        gross_salary: '',
        is_gross: false
      })
      setCalculatedSalary(null)
      setShowModal(false)
      setEditingIncome(null)
      fetchIncomes()
    } catch (error) {
      console.error('Error saving income:', error)
      alert('Error saving income. Please try again.')
    }
  }

  const handleEdit = (income) => {
    setEditingIncome(income)
    setFormData({
      amount: income.amount,
      source: income.source,
      description: income.description || '',
      date: income.date,
      gross_salary: '',
      is_gross: false
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this income entry?')) return

    try {
      const { error } = await supabase
        .from('income')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
      fetchIncomes()
    } catch (error) {
      console.error('Error deleting income:', error)
      alert('Error deleting income. Please try again.')
    }
  }

  const getSourceIcon = (source) => {
    const icons = {
      salary: '💼',
      side_hustle: '💻',
      investment: '📈',
      bonus: '🎁',
      gift: '🎀',
      other: '💰'
    }
    return icons[source] || '💰'
  }

  const getSourceColor = (source) => {
    const colors = {
      salary: 'bg-blue-100 text-blue-800',
      side_hustle: 'bg-purple-100 text-purple-800',
      investment: 'bg-green-100 text-green-800',
      bonus: 'bg-yellow-100 text-yellow-800',
      gift: 'bg-pink-100 text-pink-800',
      other: 'bg-gray-100 text-gray-800'
    }
    return colors[source] || 'bg-gray-100 text-gray-800'
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
      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <TrendingUp className="h-10 w-10 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">Income Tracking</h2>
              <p className="text-green-100 mt-1">Monitor all your earnings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-stat bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-green-100 font-medium">Total Income This Month</p>
            <TrendingUp className="h-6 w-6 text-green-200" />
          </div>
          <p className="text-4xl font-bold mb-2">{formatCurrency(totalIncome)}</p>
          <p className="text-sm text-green-100">
            {incomes.filter(i => {
              const d = new Date(i.date)
              const now = new Date()
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
            }).length} transactions this month
          </p>
        </div>

        <div className="card flex items-center justify-center">
          <button
            onClick={() => {
              setEditingIncome(null)
              setFormData({
                amount: '',
                source: 'salary',
                description: '',
                date: new Date().toISOString().split('T')[0],
                gross_salary: '',
                is_gross: false
              })
              setCalculatedSalary(null)
              setShowModal(true)
            }}
            className="btn btn-primary py-4 px-8 text-lg flex items-center"
          >
            <Plus className="h-6 w-6 mr-2" />
            Add New Income
          </button>
        </div>
      </div>

      {/* Income List */}
      <div className="card">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Income History</h3>

        {incomes.length === 0 ? (
          <div className="text-center py-16">
            <DollarSign className="h-20 w-20 text-gray-300 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No income recorded yet</h3>
            <p className="text-gray-500 mb-6">Start tracking your earnings</p>
            <button
              onClick={() => setShowModal(true)}
              className="btn btn-primary px-8 py-3"
            >
              Add Your First Income
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {incomes.map((income) => (
              <div
                key={income.id}
                className="flex items-center justify-between p-5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className="text-4xl">
                    {getSourceIcon(income.source)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <p className="font-semibold text-gray-900 text-lg capitalize">
                        {income.source.replace('_', ' ')}
                      </p>
                      <span className={`badge ${getSourceColor(income.source)}`}>
                        {income.source}
                      </span>
                    </div>
                    {income.description && (
                      <p className="text-sm text-gray-600 mb-1">{income.description}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      {new Date(income.date).toLocaleDateString('en-KE', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <p className="text-2xl font-bold text-green-600">
                    +{formatCurrency(income.amount)}
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(income)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(income.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                {editingIncome ? 'Edit Income' : 'Add New Income'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingIncome(null)
                  setCalculatedSalary(null)
                }}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="form-group">
                <label className="label text-base font-semibold">Income Source *</label>
                <select
                  className="select text-base py-3"
                  value={formData.source}
                  onChange={(e) => {
                    setFormData({ ...formData, source: e.target.value })
                    if (e.target.value !== 'salary') {
                      setFormData(prev => ({ ...prev, is_gross: false, gross_salary: '' }))
                      setCalculatedSalary(null)
                    }
                  }}
                  required
                >
                  {INCOME_SOURCES.map((source) => (
                    <option key={source} value={source}>
                      {getSourceIcon(source)} {source.replace('_', ' ').charAt(0).toUpperCase() + source.replace('_', ' ').slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Salary Options */}
              {formData.source === 'salary' && !editingIncome && (
                <div className="p-6 bg-blue-50 rounded-xl border-2 border-blue-200">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_gross}
                      onChange={(e) => setFormData({ ...formData, is_gross: e.target.checked })}
                      className="h-5 w-5 text-kenya-green focus:ring-kenya-green border-gray-300 rounded"
                    />
                    <div>
                      <span className="text-base font-semibold text-gray-900">
                        <Calculator className="inline h-5 w-5 mr-2" />
                        I have my gross salary (before deductions)
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        We'll automatically calculate PAYE, NSSF, SHIF, and Housing Levy
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* Gross Salary Input */}
              {formData.is_gross && (
                <>
                  <div className="form-group">
                    <label className="label text-base font-semibold">Gross Salary (KES) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input text-lg py-4"
                      placeholder="100,000"
                      value={formData.gross_salary}
                      onChange={(e) => setFormData({ ...formData, gross_salary: e.target.value })}
                      required
                    />
                  </div>

                  {/* Deduction Breakdown */}
                  {calculatedSalary && (
                    <div className="p-6 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border-2 border-green-200">
                      <h4 className="font-bold text-gray-900 mb-4 flex items-center">
                        <FileText className="h-5 w-5 mr-2" />
                        Salary Breakdown
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-600">Gross Salary</span>
                          <span className="font-bold text-gray-900">{formatCurrency(calculatedSalary.grossSalary)}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-gray-600">NSSF</span>
                          <span className="text-red-600">-{formatCurrency(calculatedSalary.nssf)}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-gray-600">Housing Levy</span>
                          <span className="text-red-600">-{formatCurrency(calculatedSalary.housingLevy)}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-gray-600">SHIF</span>
                          <span className="text-red-600">-{formatCurrency(calculatedSalary.shif)}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-gray-600">PAYE</span>
                          <span className="text-red-600">-{formatCurrency(calculatedSalary.paye)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-t-2 border-gray-300 mt-2">
                          <span className="font-bold text-gray-900">Net Salary</span>
                          <span className="font-bold text-green-600 text-lg">{formatCurrency(calculatedSalary.netSalary)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Net Amount Input (for non-salary or if not using gross) */}
              {!formData.is_gross && (
                <div className="form-group">
                  <label className="label text-base font-semibold">
                    {formData.source === 'salary' ? 'Net Amount (After Deductions)' : 'Amount'} (KES) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input text-lg py-4"
                    placeholder="73,060"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="label text-base font-semibold">Description</label>
                <input
                  type="text"
                  className="input text-base py-3"
                  placeholder="Monthly salary, Freelance project, etc."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="label text-base font-semibold">Date *</label>
                <input
                  type="date"
                  className="input text-base py-3"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="flex space-x-4 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingIncome(null)
                    setCalculatedSalary(null)
                  }}
                  className="flex-1 btn btn-secondary py-4 text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn btn-primary py-4 text-base"
                >
                  {editingIncome ? 'Update Income' : 'Add Income'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}