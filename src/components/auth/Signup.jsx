import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import {
  Wallet,
  Mail,
  Lock,
  User,
  Sun,
  Moon,
  Eye,
  EyeOff,
  CheckCircle,
  Sparkles,
  Zap,
  BarChart3,
  PiggyBank,
  ArrowRight
} from 'lucide-react'

export default function Signup() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const { signUp } = useAuth()
  const { toggleTheme, isDark } = useTheme()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!fullName || !email || !password || !confirmPassword) {
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

    setError('')
    setLoading(true)

    const { error } = await signUp(email, password, fullName)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
      setTimeout(() => {
        navigate('/dashboard')
      }, 2000)
    }
  }

  const benefits = [
    { icon: BarChart3, text: 'Visualize your spending patterns' },
    { icon: PiggyBank, text: 'Set and track savings goals' },
    { icon: Zap, text: 'Instant M-Pesa message parsing' },
    { icon: Sparkles, text: 'Smart budget recommendations' },
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
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 bg-gradient-to-br from-emerald-600 via-green-700 to-teal-800 relative overflow-hidden">
        {/* Background patterns */}
        <div className="absolute inset-0">
          <div className="absolute top-32 right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-32 left-20 w-80 h-80 bg-teal-400/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-emerald-300/10 rounded-full blur-2xl" />
          {/* Dot pattern overlay */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 py-12 w-full">
          {/* Logo & Brand */}
          <div className="mb-10">
            <div className="flex items-center space-x-3 mb-8">
              <img
                src="/KenyaPesa-Logo.png"
                alt="KenyaPesa"
                className="h-16 w-auto drop-shadow-lg"
              />
            </div>

            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
              Take control of <br />
              <span className="text-emerald-200">your finances</span>
            </h1>
            <p className="text-xl text-green-100">
              Join thousands of Kenyans who've stopped wondering where their money goes.
            </p>
          </div>

          {/* Benefits list */}
          <div className="space-y-4 mb-12">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-center space-x-4 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10"
              >
                <div className="bg-white/20 rounded-lg p-2">
                  <benefit.icon className="h-6 w-6 text-white" />
                </div>
                <span className="text-white font-medium">{benefit.text}</span>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center space-x-4">
              <div className="flex -space-x-3">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 border-2 border-white/50 flex items-center justify-center text-white text-sm font-bold"
                  >
                    {['JK', 'AM', 'WN', 'PO'][i]}
                  </div>
                ))}
              </div>
              <div>
                <p className="text-white font-semibold">Join 2,000+ users</p>
                <p className="text-green-200 text-sm">Managing KES 50M+ monthly</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Signup Form */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center px-6 py-12 relative overflow-y-auto">
        {/* Background decoration for mobile */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none lg:hidden">
          <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 w-80 h-80 rounded-full bg-green-500/10 blur-3xl" />
        </div>

        <div className="max-w-md w-full relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex justify-center mb-4">
              <img
                src="/KenyaPesa-Logo.png"
                alt="KenyaPesa"
                className="h-20 w-auto"
              />
            </div>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Start your financial journey today
            </p>
          </div>

          {/* Card */}
          <div className="bg-[var(--card-bg)] rounded-2xl shadow-xl border border-[var(--border-primary)] p-8 animate-fade-in-up">
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">Create Account</h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                It's free and takes less than a minute
              </p>
            </div>

            {/* Success message */}
            {success && (
              <div className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 text-sm flex items-center animate-fade-in">
                <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                Account created successfully! Redirecting...
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm animate-fade-in">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-group">
                <label htmlFor="fullName" className="label">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-[var(--text-muted)]" />
                  </div>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    className="input pl-12"
                    placeholder="John Kamau"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

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
                    autoComplete="new-password"
                    required
                    className="input pl-12 pr-12"
                    placeholder="Create a password"
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
                  Confirm Password
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
                    placeholder="Confirm your password"
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
                disabled={loading || success}
                className="w-full btn-primary py-3.5 text-base flex items-center justify-center mt-6 group"
              >
                {loading ? (
                  <>
                    <span className="spinner-sm mr-2" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Sign in link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-[var(--text-secondary)]">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center space-y-2">
            <p className="text-xs text-[var(--text-muted)]">
              By signing up, you agree to our Terms of Service
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
