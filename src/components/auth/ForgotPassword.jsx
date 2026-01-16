import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import { useToast } from '../../contexts/ToastContext'
import { requestOTP, verifyOTP } from '../../services/emailService'
import { supabase } from '../../utils/supabase'
import {
  Mail,
  Lock,
  Sun,
  Moon,
  Eye,
  EyeOff,
  KeyRound,
  ArrowLeft,
  Loader2,
  CheckCircle,
  Shield
} from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Step state: 'email' -> 'otp' -> 'password' -> 'success'
  const [step, setStep] = useState('email')
  const [otpCode, setOtpCode] = useState('')
  const [otpSending, setOtpSending] = useState(false)
  const [otpExpiresIn, setOtpExpiresIn] = useState(0)
  const [otpVerified, setOtpVerified] = useState(false)

  const { toggleTheme, isDark } = useTheme()
  const { showToast } = useToast()
  const navigate = useNavigate()

  // Start OTP countdown timer
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

  const handleRequestOtp = async (e) => {
    e.preventDefault()

    if (!email) {
      setError('Please enter your email address')
      return
    }

    setError('')
    setOtpSending(true)

    try {
      await requestOTP(email, 'password_reset')
      setStep('otp')
      startOtpTimer(600)
      showToast?.('Code Sent', 'Check your email for the reset code', 'success')
    } catch (err) {
      setError(err.message || 'Failed to send reset code. Please try again.')
    } finally {
      setOtpSending(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()

    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter the 6-digit code')
      return
    }

    setError('')
    setLoading(true)

    try {
      await verifyOTP(email, otpCode, 'password_reset')
      setOtpVerified(true)
      setStep('password')
      showToast?.('Code Verified', 'You can now set a new password', 'success')
    } catch (err) {
      if (err.message?.includes('expired')) {
        setError('Code expired. Please request a new one.')
      } else if (err.message?.includes('attempts')) {
        setError('Too many attempts. Please request a new code.')
      } else {
        setError(err.message || 'Invalid code. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()

    if (!password || !confirmPassword) {
      setError('Please fill in all fields')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (!otpVerified) {
      setError('Please verify your email first')
      setStep('email')
      return
    }

    setError('')
    setLoading(true)

    try {
      // First sign in with magic link to create session
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false
        }
      })

      if (signInError) {
        // If magic link fails, try using password reset endpoint directly
        const { error: resetError } = await supabase.auth.updateUser({
          password: password
        })

        if (resetError) {
          throw new Error('Failed to reset password. Please try again.')
        }
      } else {
        // Update password after magic link sign in
        const { error: updateError } = await supabase.auth.updateUser({
          password: password
        })

        if (updateError) {
          throw new Error(updateError.message)
        }
      }

      setSuccess(true)
      showToast?.('Password Reset', 'Your password has been reset successfully!', 'success')

      // Sign out and redirect to login
      await supabase.auth.signOut()
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setOtpSending(true)
    setError('')
    try {
      await requestOTP(email, 'password_reset')
      startOtpTimer(600)
      showToast?.('Code Sent', 'New reset code sent to your email', 'success')
    } catch (err) {
      setError('Failed to resend code. Please try again.')
    } finally {
      setOtpSending(false)
    }
  }

  const handleBackToEmail = () => {
    setStep('email')
    setOtpCode('')
    setError('')
    setOtpVerified(false)
  }

  const getStepTitle = () => {
    switch (step) {
      case 'email':
        return 'Reset Password'
      case 'otp':
        return 'Verify Your Email'
      case 'password':
        return 'Set New Password'
      default:
        return 'Password Reset'
    }
  }

  const getStepDescription = () => {
    switch (step) {
      case 'email':
        return "Enter your email and we'll send you a reset code"
      case 'otp':
        return `Enter the 6-digit code sent to ${email}`
      case 'password':
        return 'Create a strong password for your account'
      default:
        return ''
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4 py-12">
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-6 right-6 z-50 p-3 rounded-xl bg-[var(--card-bg)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all duration-200 shadow-lg"
        aria-label="Toggle theme"
      >
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src="/logo-full.svg"
              alt="KenyaPesa"
              className="h-16 w-auto"
            />
          </div>
        </div>

        {/* Card */}
        <div className="bg-[var(--card-bg)] rounded-2xl shadow-xl border border-[var(--border-primary)] p-8 animate-fade-in-up">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
              <Shield className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              {getStepTitle()}
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {getStepDescription()}
            </p>
          </div>

          {/* Success message */}
          {success && (
            <div className="mb-6 p-5 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 animate-fade-in">
              <div className="flex items-center text-green-600 dark:text-green-400 mb-3">
                <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                <span className="font-semibold">Password reset successful!</span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400">
                Redirecting to login...
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm animate-fade-in">
              {error}
            </div>
          )}

          {/* Step 1: Email */}
          {step === 'email' && !success && (
            <form onSubmit={handleRequestOtp} className="space-y-5">
              <div className="form-group">
                <label htmlFor="email" className="label">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-[var(--text-muted)]" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="input pl-12"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={otpSending}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={otpSending}
                className="w-full btn-primary py-3.5 text-base flex items-center justify-center"
              >
                {otpSending ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  <>
                    Send Reset Code
                    <Mail className="ml-2 h-5 w-5" />
                  </>
                )}
              </button>

              <Link
                to="/login"
                className="w-full flex items-center justify-center text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mt-4"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to login
              </Link>
            </form>
          )}

          {/* Step 2: OTP Verification */}
          {step === 'otp' && !success && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="form-group">
                <label htmlFor="otpCode" className="label">
                  Verification Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-[var(--text-muted)]" />
                  </div>
                  <input
                    id="otpCode"
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    className="input pl-12 text-center text-2xl tracking-widest font-mono"
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    disabled={loading}
                    autoFocus
                  />
                </div>
                {otpExpiresIn > 0 && (
                  <p className="mt-2 text-xs text-[var(--text-muted)] text-center">
                    Code expires in {Math.floor(otpExpiresIn / 60)}:{String(otpExpiresIn % 60).padStart(2, '0')}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full btn-primary py-3.5 text-base flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify Code
                    <CheckCircle className="ml-2 h-5 w-5" />
                  </>
                )}
              </button>

              {/* Resend code */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={otpSending || otpExpiresIn > 540}
                  className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {otpSending ? 'Sending...' : "Didn't receive code? Resend"}
                </button>
              </div>

              <button
                type="button"
                onClick={handleBackToEmail}
                className="w-full flex items-center justify-center text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to email
              </button>
            </form>
          )}

          {/* Step 3: New Password */}
          {step === 'password' && !success && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="form-group">
                <label htmlFor="password" className="label">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-[var(--text-muted)]" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    className="input pl-12 pr-12"
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                  Must be at least 6 characters
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword" className="label">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-[var(--text-muted)]" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    className="input pl-12 pr-12"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3.5 text-base flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Resetting password...
                  </>
                ) : (
                  <>
                    Reset Password
                    <Lock className="ml-2 h-5 w-5" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            Remember your password?{' '}
            <Link
              to="/login"
              className="font-semibold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
