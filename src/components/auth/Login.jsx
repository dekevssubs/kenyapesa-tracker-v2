import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useToast } from '../../contexts/ToastContext'
import { requestOTP, verifyOTP } from '../../services/emailService'
import {
  Wallet,
  Mail,
  Lock,
  Sun,
  Moon,
  Eye,
  EyeOff,
  TrendingUp,
  PieChart,
  Target,
  Bell,
  Shield,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  ArrowLeft,
  Loader2
} from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // OTP Login State
  const [loginMode, setLoginMode] = useState('password') // 'password' | 'otp'
  const [otpStep, setOtpStep] = useState('email') // 'email' | 'code'
  const [otpCode, setOtpCode] = useState('')
  const [otpSending, setOtpSending] = useState(false)
  const [otpExpiresIn, setOtpExpiresIn] = useState(0)

  const { signIn } = useAuth()
  const { toggleTheme, isDark } = useTheme()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const handlePasswordLogin = async (e) => {
    e.preventDefault()

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    setError('')
    setLoading(true)

    const { error, data } = await signIn(email, password)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      const userName = data?.user?.user_metadata?.full_name?.split(' ')[0] || 'there'
      showToast('Welcome Back!', `Welcome back, ${userName}! Good to see you again.`, 'success', 5000)
      navigate('/dashboard')
    }
  }

  const handleRequestOTP = async (e) => {
    e.preventDefault()

    if (!email) {
      setError('Please enter your email address')
      return
    }

    setError('')
    setOtpSending(true)

    try {
      const result = await requestOTP(email, 'login')
      setOtpStep('code')
      setOtpExpiresIn(result.expiresIn || 600)
      showToast('OTP Sent', 'Check your email for the login code', 'success')

      // Start countdown
      const interval = setInterval(() => {
        setOtpExpiresIn((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.')
    } finally {
      setOtpSending(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()

    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter the 6-digit code')
      return
    }

    setError('')
    setLoading(true)

    try {
      const result = await verifyOTP(email, otpCode, 'login')

      if (result.redirectUrl) {
        // Redirect to the magic link for session creation
        window.location.href = result.redirectUrl
      } else {
        showToast('Success!', 'Login verified successfully', 'success')
        navigate('/dashboard')
      }
    } catch (err) {
      if (err.message?.includes('expired')) {
        setError('Code expired. Please request a new one.')
      } else if (err.message?.includes('attempts')) {
        setError('Too many attempts. Please request a new code.')
      } else {
        setError(err.message || 'Invalid code. Please try again.')
      }
      setLoading(false)
    }
  }

  const resetOTPFlow = () => {
    setOtpStep('email')
    setOtpCode('')
    setOtpExpiresIn(0)
    setError('')
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const features = [
    { icon: TrendingUp, title: 'Track Expenses', desc: 'See exactly where your money goes' },
    { icon: PieChart, title: 'Smart Budgets', desc: 'Set limits and get alerts' },
    { icon: Target, title: 'Savings Goals', desc: 'Build your financial future' },
    { icon: Bell, title: 'Bill Reminders', desc: 'Never miss a payment' },
  ]

  return (
    <div className="min-h-screen flex bg-[var(--bg-primary)] transition-colors duration-300">
      {/* Theme toggle - floating */}
      <button
        onClick={toggleTheme}
        className="fixed top-6 right-6 z-50 p-3 rounded-xl bg-[var(--card-bg)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all duration-200 shadow-lg"
        aria-label="Toggle theme"
      >
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      {/* Left side - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 relative overflow-hidden">
        {/* Background patterns */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-green-300/10 rounded-full blur-2xl" />
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 py-12 w-full">
          {/* Logo & Brand */}
          <div className="mb-12">
            <div className="flex items-center space-x-3 mb-6">
              <img
                src="/logo-full.svg"
                alt="KenyaPesa"
                className="h-14 w-auto drop-shadow-lg"
              />
            </div>

            {/* Tagline with thought bubble effect */}
            <div className="relative">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <p className="text-2xl xl:text-3xl font-bold text-white leading-relaxed">
                  "Where does all my money go?"
                </p>
                <p className="text-lg text-green-100 mt-3">
                  We've all been there. Now you can finally find out.
                </p>
              </div>
              {/* Thought bubble tail */}
              <div className="absolute -bottom-3 left-8 w-6 h-6 bg-white/10 rounded-full border border-white/20" />
              <div className="absolute -bottom-6 left-4 w-4 h-4 bg-white/10 rounded-full border border-white/20" />
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-4 mb-12">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10 hover:bg-white/15 transition-all duration-300 group"
              >
                <feature.icon className="h-8 w-8 text-green-200 mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                <p className="text-green-100 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* Trust indicators */}
          <div className="flex items-center space-x-6 text-green-100">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span className="text-sm">Bank-level Security</span>
            </div>
            <div className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5" />
              <span className="text-sm">M-Pesa Integration</span>
            </div>
          </div>

          {/* Kenya-specific value props */}
          <div className="mt-8 space-y-3">
            <div className="flex items-center space-x-3 text-green-50">
              <CheckCircle2 className="h-5 w-5 text-green-300 flex-shrink-0" />
              <span className="text-sm">Accurate PAYE, NSSF, SHIF & Housing Levy calculations</span>
            </div>
            <div className="flex items-center space-x-3 text-green-50">
              <CheckCircle2 className="h-5 w-5 text-green-300 flex-shrink-0" />
              <span className="text-sm">Parse M-Pesa messages automatically</span>
            </div>
            <div className="flex items-center space-x-3 text-green-50">
              <CheckCircle2 className="h-5 w-5 text-green-300 flex-shrink-0" />
              <span className="text-sm">Track loans, SACCOs, and chamas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center px-6 py-12 relative">
        {/* Background decoration for mobile */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none lg:hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-green-500/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="max-w-md w-full relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex justify-center mb-4">
              <img
                src="/logo-full.svg"
                alt="KenyaPesa"
                className="h-16 w-auto"
              />
            </div>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Track your money, build your future
            </p>
          </div>

          {/* Card */}
          <div className="bg-[var(--card-bg)] rounded-2xl shadow-xl border border-[var(--border-primary)] p-8 animate-fade-in-up">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">Welcome Back</h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Sign in to continue managing your finances
              </p>
            </div>

            {/* Login Mode Toggle */}
            <div className="flex bg-[var(--bg-tertiary)] rounded-xl p-1 mb-6">
              <button
                type="button"
                onClick={() => {
                  setLoginMode('password')
                  resetOTPFlow()
                  setError('')
                }}
                className={`flex-1 flex items-center justify-center py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                  loginMode === 'password'
                    ? 'bg-white dark:bg-gray-700 text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Lock className="h-4 w-4 mr-2" />
                Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMode('otp')
                  setError('')
                }}
                className={`flex-1 flex items-center justify-center py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                  loginMode === 'otp'
                    ? 'bg-white dark:bg-gray-700 text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <KeyRound className="h-4 w-4 mr-2" />
                Email Code
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm animate-fade-in">
                {error}
              </div>
            )}

            {/* Password Login Form */}
            {loginMode === 'password' && (
              <form onSubmit={handlePasswordLogin} className="space-y-5">
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
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="password" className="label">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-[var(--text-muted)]" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      className="input pl-12 pr-12"
                      placeholder="Enter your password"
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
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-3.5 text-base flex items-center justify-center group"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* OTP Login Form */}
            {loginMode === 'otp' && (
              <>
                {otpStep === 'email' && (
                  <form onSubmit={handleRequestOTP} className="space-y-5">
                    <div className="form-group">
                      <label htmlFor="otp-email" className="label">
                        Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-[var(--text-muted)]" />
                        </div>
                        <input
                          id="otp-email"
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

                    <p className="text-sm text-[var(--text-secondary)]">
                      We'll send a 6-digit code to your email that you can use to sign in.
                    </p>

                    <button
                      type="submit"
                      disabled={otpSending}
                      className="w-full btn-primary py-3.5 text-base flex items-center justify-center group"
                    >
                      {otpSending ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Sending code...
                        </>
                      ) : (
                        <>
                          Send Login Code
                          <Mail className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {otpStep === 'code' && (
                  <form onSubmit={handleVerifyOTP} className="space-y-5">
                    <button
                      type="button"
                      onClick={resetOTPFlow}
                      className="flex items-center text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-2"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Change email
                    </button>

                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Code sent to <strong>{email}</strong>
                      </p>
                    </div>

                    <div className="form-group">
                      <label htmlFor="otp-code" className="label">
                        Enter 6-digit Code
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <KeyRound className="h-5 w-5 text-[var(--text-muted)]" />
                        </div>
                        <input
                          id="otp-code"
                          name="code"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          required
                          className="input pl-12 text-center text-2xl tracking-[0.5em] font-mono"
                          placeholder="000000"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          disabled={loading}
                          autoFocus
                        />
                      </div>
                    </div>

                    {otpExpiresIn > 0 && (
                      <p className="text-sm text-center text-[var(--text-secondary)]">
                        Code expires in <span className="font-mono font-medium">{formatTime(otpExpiresIn)}</span>
                      </p>
                    )}

                    {otpExpiresIn === 0 && (
                      <button
                        type="button"
                        onClick={handleRequestOTP}
                        className="text-sm text-green-600 dark:text-green-400 hover:underline"
                      >
                        Resend code
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={loading || otpCode.length !== 6}
                      className="w-full btn-primary py-3.5 text-base flex items-center justify-center group"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          Verify & Sign In
                          <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </>
            )}

            {/* Sign up link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-[var(--text-secondary)]">
                Don't have an account?{' '}
                <Link
                  to="/signup"
                  className="font-semibold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
                >
                  Sign up for free
                </Link>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center space-y-2">
            <p className="text-xs text-[var(--text-muted)]">
              Your data is encrypted and securely stored
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Made with care for Kenyans, by Kenyans
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
