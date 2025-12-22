import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { DollarSign, Mail, Lock, Sun, Moon, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { signIn } = useAuth()
  const { toggleTheme, isDark } = useTheme()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    setError('')
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent-blue/10 blur-3xl" />
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-3 rounded-xl bg-[var(--card-bg)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all duration-200 shadow-soft"
        aria-label="Toggle theme"
      >
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <div className="max-w-md w-full relative z-10">
        {/* Card */}
        <div className="bg-[var(--card-bg)] rounded-2xl shadow-xl border border-[var(--border-primary)] p-8 animate-fade-in-up">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-4 shadow-lg">
                  <DollarSign className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-[var(--card-bg)] animate-pulse" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Welcome Back</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Sign in to your KenyaPesa account
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm animate-fade-in">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
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
              className="w-full btn-primary py-3.5 text-base flex items-center justify-center"
            >
              {loading ? (
                <>
                  <span className="spinner-sm mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Sign up link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="font-semibold text-primary-500 hover:text-primary-600 transition-colors"
              >
                Sign up for free
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            Built for Kenyan employees
          </p>
        </div>
      </div>
    </div>
  )
}
