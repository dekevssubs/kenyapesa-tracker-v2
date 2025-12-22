import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { Settings as SettingsIcon, User, DollarSign, AlertCircle, Trash2, Download, CheckCircle, Mail, Phone, Calendar } from 'lucide-react'

export default function Settings() {
  const { user, signOut } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  const [profile, setProfile] = useState({
    full_name: '',
    phone_number: '',
    monthly_salary: '',
    currency: 'KES'
  })

  useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user])

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error

      if (data) {
        setProfile({
          full_name: data.full_name || '',
          phone_number: data.phone_number || '',
          monthly_salary: data.monthly_salary || '',
          currency: data.currency || 'KES'
        })
      }
      setLoading(false)
    } catch (error) {
      console.error('Error fetching profile:', error)
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          phone_number: profile.phone_number,
          monthly_salary: profile.monthly_salary ? parseFloat(profile.monthly_salary) : 0,
          currency: profile.currency
        })
        .eq('id', user.id)

      if (error) throw error

      setMessage({ type: 'success', text: '✓ Profile updated successfully!' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage({ type: 'error', text: '✗ Error updating profile. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const handleExportData = async () => {
    try {
      const [incomeRes, expensesRes, deductionsRes, goalsRes] = await Promise.all([
        supabase.from('income').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('expenses').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('deductions').select('*').eq('user_id', user.id).order('month', { ascending: false }),
        supabase.from('savings_goals').select('*').eq('user_id', user.id)
      ])

      const exportData = {
        profile: profile,
        income: incomeRes.data || [],
        expenses: expensesRes.data || [],
        deductions: deductionsRes.data || [],
        savings_goals: goalsRes.data || [],
        exported_at: new Date().toISOString()
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kenyapesa-data-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)

      setMessage({ type: 'success', text: '✓ Data exported successfully!' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      console.error('Error exporting data:', error)
      setMessage({ type: 'error', text: '✗ Error exporting data. Please try again.' })
    }
  }

  const handleDeleteAccount = async () => {
    const confirmation = prompt(
      'This will permanently delete your account and all data. Type "DELETE" to confirm:'
    )

    if (confirmation !== 'DELETE') {
      return
    }

    try {
      await Promise.all([
        supabase.from('income').delete().eq('user_id', user.id),
        supabase.from('expenses').delete().eq('user_id', user.id),
        supabase.from('deductions').delete().eq('user_id', user.id),
        supabase.from('budgets').delete().eq('user_id', user.id),
        supabase.from('savings_goals').delete().eq('user_id', user.id),
        supabase.from('profiles').delete().eq('id', user.id)
      ])

      await signOut()
      alert('Account deleted successfully')
    } catch (error) {
      console.error('Error deleting account:', error)
      setMessage({ type: 'error', text: '✗ Error deleting account. Please try again.' })
    }
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
      <div className="bg-gradient-to-r from-kenya-green to-green-700 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center space-x-4">
          <div className="bg-white bg-opacity-20 rounded-xl p-4">
            <SettingsIcon className="h-10 w-10 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">Settings</h2>
            <p className="text-green-100 mt-1">Manage your account and preferences</p>
          </div>
        </div>
      </div>

      {/* Message Alert */}
      {message.text && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'} animate-slideIn`}>
          {message.text}
        </div>
      )}

      {/* Profile Information - FIXED SPACING */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-8 pb-6 border-b border-gray-200">
          <div className="bg-kenya-green bg-opacity-10 rounded-xl p-3">
            <User className="h-6 w-6 text-kenya-green" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">Profile Information</h3>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-6">
          {/* Full Name - BETTER SPACING */}
          <div className="space-y-3">
            <label className="block text-base font-semibold text-gray-700">
              Full Name
            </label>
            <input
              type="text"
              className="input text-base py-3.5"
              placeholder="John Kamau"
              value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              required
            />
          </div>

          {/* Email - Read Only - BETTER SPACING */}
          <div className="space-y-3">
            <label className="block text-base font-semibold text-gray-700 flex items-center">
              <Mail className="h-4 w-4 mr-2 text-gray-500" />
              Email Address
            </label>
            <input
              type="email"
              className="input text-base py-3.5 bg-gray-100 cursor-not-allowed"
              value={user?.email}
              disabled
            />
            <p className="text-sm text-gray-500 mt-2">Email cannot be changed</p>
          </div>

          {/* Phone Number - BETTER SPACING */}
          <div className="space-y-3">
            <label className="block text-base font-semibold text-gray-700 flex items-center">
              <Phone className="h-4 w-4 mr-2 text-gray-500" />
              Phone Number
            </label>
            <input
              type="tel"
              className="input text-base py-3.5"
              placeholder="+254 712 345 678"
              value={profile.phone_number}
              onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
            />
          </div>

          {/* Salary and Currency - BETTER SPACING */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="block text-base font-semibold text-gray-700 flex items-center">
                <DollarSign className="h-4 w-4 mr-2 text-gray-500" />
                Monthly Salary (Gross)
              </label>
              <input
                type="number"
                className="input text-base py-3.5"
                placeholder="100,000"
                value={profile.monthly_salary}
                onChange={(e) => setProfile({ ...profile, monthly_salary: e.target.value })}
              />
              <p className="text-sm text-gray-500">Used for quick calculations</p>
            </div>

            <div className="space-y-3">
              <label className="block text-base font-semibold text-gray-700">
                Currency
              </label>
              <select
                className="select text-base py-3.5"
                value={profile.currency}
                onChange={(e) => setProfile({ ...profile, currency: e.target.value })}
              >
                <option value="KES">KES - Kenyan Shilling</option>
                <option value="USD">USD - US Dollar</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="EUR">EUR - Euro</option>
              </select>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary py-4 px-8 text-base w-full md:w-auto flex items-center justify-center"
            >
              {saving ? (
                <>
                  <span className="spinner mr-2"></span>
                  Updating Profile...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Update Profile
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Account Statistics - BETTER LAYOUT */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-8 pb-6 border-b border-gray-200">
          <div className="bg-blue-500 bg-opacity-10 rounded-xl p-3">
            <Calendar className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">Account Statistics</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200">
            <p className="text-3xl font-bold text-blue-600 mb-3">
              {new Date(user.created_at).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })}
            </p>
            <p className="text-sm text-gray-600 font-medium">Member Since</p>
          </div>

          <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border border-green-200">
            <p className="text-3xl font-bold text-green-600 mb-3">{profile.currency}</p>
            <p className="text-sm text-gray-600 font-medium">Currency</p>
          </div>

          <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border border-purple-200">
            <p className="text-3xl font-bold text-purple-600 mb-3">Active</p>
            <p className="text-sm text-gray-600 font-medium">Status</p>
          </div>

          <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl border border-orange-200">
            <p className="text-3xl font-bold text-orange-600 mb-3">Free</p>
            <p className="text-sm text-gray-600 font-medium">Plan</p>
          </div>
        </div>
      </div>

      {/* Data Management - BETTER SPACING */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-8 pb-6 border-b border-gray-200">
          <div className="bg-orange-500 bg-opacity-10 rounded-xl p-3">
            <AlertCircle className="h-6 w-6 text-orange-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">Data Management</h3>
        </div>

        <div className="space-y-6">
          {/* Export Data - BETTER PADDING */}
          <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border-2 border-blue-200">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <h4 className="text-lg font-bold text-gray-900 mb-3">Export Your Data</h4>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Download all your financial data including income, expenses, deductions, and savings goals in JSON format for your records.
                </p>
              </div>
              <button
                onClick={handleExportData}
                className="btn btn-secondary flex items-center flex-shrink-0 whitespace-nowrap"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </button>
            </div>
          </div>

          {/* Delete Account - BETTER PADDING */}
          <div className="p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl border-2 border-red-200">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <h4 className="text-lg font-bold text-red-900 mb-3">Delete Account</h4>
                <p className="text-sm text-red-700 leading-relaxed">
                  Permanently delete your account and all associated data. This action cannot be undone and you will lose all your financial records.
                </p>
              </div>
              <button
                onClick={handleDeleteAccount}
                className="btn btn-danger flex items-center flex-shrink-0 whitespace-nowrap"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* App Information - BETTER LAYOUT */}
      <div className="card bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-6">About KenyaPesa Tracker</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-300">
              <span className="text-sm font-medium text-gray-600">Version</span>
              <span className="text-sm font-bold text-gray-900">1.0.0 (MVP)</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-300">
              <span className="text-sm font-medium text-gray-600">Last Updated</span>
              <span className="text-sm font-bold text-gray-900">December 2024</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-300">
              <span className="text-sm font-medium text-gray-600">Built For</span>
              <span className="text-sm font-bold text-gray-900">Kenyan Employees</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-300">
              <span className="text-sm font-medium text-gray-600">Tax Year</span>
              <span className="text-sm font-bold text-gray-900">2024/2025</span>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t-2 border-gray-300 text-center">
          <p className="text-gray-600 font-medium">Built with ❤️ for Kenyan employees</p>
        </div>
      </div>
    </div>
  )
}