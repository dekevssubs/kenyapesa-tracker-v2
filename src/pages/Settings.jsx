import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../utils/supabase'
import { requestOTP, verifyOTP } from '../services/emailService'
import { Settings as SettingsIcon, User, DollarSign, AlertCircle, Trash2, Download, Mail, Phone, Calendar, CheckCircle, Bell, Lock, Eye, EyeOff, KeyRound, Loader2, Shield, HelpCircle, RotateCcw } from 'lucide-react'
import { useOnboarding } from '../contexts/OnboardingContext'
import EmailPreferences from '../components/settings/EmailPreferences'

export default function Settings() {
  const { user, signOut } = useAuth()
  const { showToast } = useToast()
  const { restartTour, onboardingStatus } = useOnboarding()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const [profile, setProfile] = useState({
    full_name: '',
    phone_number: '',
    monthly_salary: '',
    currency: 'KES'
  })

  // Password change state
  const [passwordStep, setPasswordStep] = useState('idle') // 'idle' | 'otp' | 'password'
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpSending, setOtpSending] = useState(false)
  const [otpExpiresIn, setOtpExpiresIn] = useState(0)
  const [passwordChanging, setPasswordChanging] = useState(false)
  const [passwordError, setPasswordError] = useState('')

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

  // Password change handlers
  const startOtpTimer = (seconds = 600) => {
    setOtpExpiresIn(seconds)
    const timer = setInterval(() => {
      setOtpExpiresIn(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleStartPasswordChange = async () => {
    setPasswordError('')
    setOtpSending(true)

    try {
      await requestOTP(user.email, 'password_reset')
      setPasswordStep('otp')
      startOtpTimer(600)
      showToast?.('Code Sent', 'Verification code sent to your email', 'success')
    } catch (err) {
      setPasswordError(err.message || 'Failed to send verification code')
    } finally {
      setOtpSending(false)
    }
  }

  const handleVerifyPasswordOtp = async (e) => {
    e.preventDefault()

    if (!otpCode || otpCode.length !== 6) {
      setPasswordError('Please enter the 6-digit code')
      return
    }

    setPasswordError('')
    setPasswordChanging(true)

    try {
      await verifyOTP(user.email, otpCode, 'password_reset')
      setPasswordStep('password')
      showToast?.('Verified', 'You can now set a new password', 'success')
    } catch (err) {
      setPasswordError(err.message || 'Invalid code. Please try again.')
    } finally {
      setPasswordChanging(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()

    if (!newPassword || !confirmNewPassword) {
      setPasswordError('Please fill in all fields')
      return
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }

    setPasswordError('')
    setPasswordChanging(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      showToast?.('Success', 'Password changed successfully!', 'success')
      handleCancelPasswordChange()
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password')
    } finally {
      setPasswordChanging(false)
    }
  }

  const handleResendPasswordOtp = async () => {
    setOtpSending(true)
    setPasswordError('')
    try {
      await requestOTP(user.email, 'password_reset')
      startOtpTimer(600)
      showToast?.('Code Sent', 'New verification code sent', 'success')
    } catch (err) {
      setPasswordError('Failed to resend code')
    } finally {
      setOtpSending(false)
    }
  }

  const handleCancelPasswordChange = () => {
    setPasswordStep('idle')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmNewPassword('')
    setOtpCode('')
    setPasswordError('')
    setOtpExpiresIn(0)
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
        <div className="flex items-center space-x-3 mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="bg-kenya-green bg-opacity-10 dark:bg-opacity-20 rounded-xl p-3">
            <User className="h-6 w-6 text-kenya-green" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Profile Information</h3>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-6">
          {/* Full Name - BETTER SPACING */}
          <div className="space-y-3">
            <label className="block text-base font-semibold text-gray-700 dark:text-gray-300">
              Full Name
            </label>
            <input
              type="text"
              className="input text-base py-3.5 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              placeholder="John Kamau"
              value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              required
            />
          </div>

          {/* Email - Read Only - BETTER SPACING */}
          <div className="space-y-3">
            <label className="block text-base font-semibold text-gray-700 dark:text-gray-300 flex items-center">
              <Mail className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
              Email Address
            </label>
            <input
              type="email"
              className="input text-base py-3.5 bg-gray-100 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-300 cursor-not-allowed"
              value={user?.email}
              disabled
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Email cannot be changed</p>
          </div>

          {/* Phone Number - BETTER SPACING */}
          <div className="space-y-3">
            <label className="block text-base font-semibold text-gray-700 dark:text-gray-300 flex items-center">
              <Phone className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
              Phone Number
            </label>
            <input
              type="tel"
              className="input text-base py-3.5 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              placeholder="+254 712 345 678"
              value={profile.phone_number}
              onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
            />
          </div>

          {/* Salary and Currency - BETTER SPACING */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="block text-base font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                <DollarSign className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                Monthly Salary (Gross)
              </label>
              <input
                type="number"
                className="input text-base py-3.5 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                placeholder="100,000"
                value={profile.monthly_salary}
                onChange={(e) => setProfile({ ...profile, monthly_salary: e.target.value })}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">Used for quick calculations</p>
            </div>

            <div className="space-y-3">
              <label className="block text-base font-semibold text-gray-700 dark:text-gray-300">
                Currency
              </label>
              <select
                className="select text-base py-3.5 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
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

      {/* Email Notifications */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="bg-purple-500 bg-opacity-10 dark:bg-opacity-20 rounded-xl p-3">
            <Bell className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Email Notifications</h3>
        </div>

        <EmailPreferences />
      </div>

      {/* Security - Password Change */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="bg-red-500 bg-opacity-10 dark:bg-opacity-20 rounded-xl p-3">
            <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Security</h3>
        </div>

        {/* Password Error */}
        {passwordError && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
            {passwordError}
          </div>
        )}

        {/* Idle State - Show Change Password Button */}
        {passwordStep === 'idle' && (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Change your password to keep your account secure. You'll need to verify your email with a code first.
            </p>
            <button
              onClick={handleStartPasswordChange}
              disabled={otpSending}
              className="btn btn-secondary py-3 px-6 flex items-center"
            >
              {otpSending ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Sending verification code...
                </>
              ) : (
                <>
                  <Lock className="h-5 w-5 mr-2" />
                  Change Password
                </>
              )}
            </button>
          </div>
        )}

        {/* OTP Verification Step */}
        {passwordStep === 'otp' && (
          <form onSubmit={handleVerifyPasswordOtp} className="space-y-6">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                <KeyRound className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Verify Your Identity</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Enter the 6-digit code sent to {user?.email}
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-base font-semibold text-gray-700 dark:text-gray-300">
                Verification Code
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  className="input pl-12 text-center text-2xl tracking-widest font-mono"
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={passwordChanging}
                  autoFocus
                />
              </div>
              {otpExpiresIn > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Code expires in {Math.floor(otpExpiresIn / 60)}:{String(otpExpiresIn % 60).padStart(2, '0')}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={passwordChanging || otpCode.length !== 6}
                className="btn btn-primary py-3 px-6 flex-1 flex items-center justify-center"
              >
                {passwordChanging ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Verify Code
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCancelPasswordChange}
                className="btn btn-secondary py-3 px-6"
              >
                Cancel
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResendPasswordOtp}
                disabled={otpSending || otpExpiresIn > 540}
                className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 disabled:opacity-50"
              >
                {otpSending ? 'Sending...' : "Didn't receive code? Resend"}
              </button>
            </div>
          </form>
        )}

        {/* New Password Step */}
        {passwordStep === 'password' && (
          <form onSubmit={handleChangePassword} className="space-y-6">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                <Lock className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Set New Password</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Create a strong password for your account
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-base font-semibold text-gray-700 dark:text-gray-300">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  className="input pl-12 pr-12"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={passwordChanging}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Must be at least 6 characters
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-base font-semibold text-gray-700 dark:text-gray-300">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showConfirmNewPassword ? 'text' : 'password'}
                  className="input pl-12 pr-12"
                  placeholder="Confirm new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  disabled={passwordChanging}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showConfirmNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={passwordChanging}
                className="btn btn-primary py-3 px-6 flex-1 flex items-center justify-center"
              >
                {passwordChanging ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Changing password...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Change Password
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCancelPasswordChange}
                className="btn btn-secondary py-3 px-6"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Account Statistics - BETTER LAYOUT */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="bg-blue-500 bg-opacity-10 dark:bg-opacity-20 rounded-xl p-3">
            <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Account Statistics</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-2xl border border-blue-200 dark:border-blue-700">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-3">
              {new Date(user.created_at).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Member Since</p>
          </div>

          <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-2xl border border-green-200 dark:border-green-700">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400 mb-3">{profile.currency}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Currency</p>
          </div>

          <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-2xl border border-purple-200 dark:border-purple-700">
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-3">Active</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Status</p>
          </div>

          <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 rounded-2xl border border-orange-200 dark:border-orange-700">
            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-3">Free</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Plan</p>
          </div>
        </div>
      </div>

      {/* Data Management - BETTER SPACING */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="bg-orange-500 bg-opacity-10 dark:bg-opacity-20 rounded-xl p-3">
            <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Data Management</h3>
        </div>

        <div className="space-y-6">
          {/* Export Data - BETTER PADDING */}
          <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-2xl border-2 border-blue-200 dark:border-blue-700">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">Export Your Data</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
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
          <div className="p-6 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 rounded-2xl border-2 border-red-200 dark:border-red-700">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <h4 className="text-lg font-bold text-red-900 dark:text-red-300 mb-3">Delete Account</h4>
                <p className="text-sm text-red-700 dark:text-red-400 leading-relaxed">
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

      {/* Help & Support */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="bg-blue-500 bg-opacity-10 dark:bg-opacity-20 rounded-xl p-3">
            <HelpCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Help & Support</h3>
        </div>

        <div className="space-y-6">
          {/* Restart Tour */}
          <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-2xl border-2 border-blue-200 dark:border-blue-700">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">Interactive Tour</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {onboardingStatus.completed
                    ? 'You completed the onboarding tour. Want to see it again? Restart the tour to learn about all the features.'
                    : 'Take a guided tour of all the features KenyaPesa Tracker has to offer.'}
                </p>
                {onboardingStatus.completedAt && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    Completed on {new Date(onboardingStatus.completedAt).toLocaleDateString('en-KE', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                )}
              </div>
              <button
                onClick={restartTour}
                className="btn btn-secondary flex items-center flex-shrink-0 whitespace-nowrap"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {onboardingStatus.completed ? 'Restart Tour' : 'Start Tour'}
              </button>
            </div>
          </div>

          {/* Help Center Link */}
          <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-2xl border-2 border-green-200 dark:border-green-700">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">Help Center</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  Find guides, tutorials, and answers to frequently asked questions about using KenyaPesa Tracker.
                </p>
              </div>
              <a
                href="/help"
                className="btn btn-primary flex items-center flex-shrink-0 whitespace-nowrap"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Visit Help Center
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* App Information - BETTER LAYOUT */}
      <div className="card bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-2 border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">About KenyaPesa Tracker</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-300 dark:border-gray-600">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Version</span>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">1.0.0 (MVP)</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-300 dark:border-gray-600">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Updated</span>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">January 2026</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-300 dark:border-gray-600">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Built For</span>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Kenyan Employees</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-300 dark:border-gray-600">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Tax Year</span>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">2024/2025</span>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t-2 border-gray-300 dark:border-gray-600 text-center">
          <p className="text-gray-600 dark:text-gray-400 font-medium">Built with ❤️ for Kenyan employees</p>
        </div>
      </div>
    </div>
  )
}