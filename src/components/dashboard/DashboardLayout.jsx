import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import {
  LayoutDashboard,
  DollarSign,
  TrendingDown,
  Calculator,
  Target,
  Settings,
  LogOut,
  Menu,
  X,
  BarChart3,
  FileText,
  Sun,
  Moon,
  Wallet,
  CreditCard,
  RefreshCw,
  ChevronRight,
  Bell,
  HandCoins,
  History,
  PiggyBank
} from 'lucide-react'

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const { user, signOut } = useAuth()
  const { theme, toggleTheme, isDark } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  // Handle scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, color: 'text-blue-500' },
    { name: 'Accounts', href: '/accounts', icon: Wallet, color: 'text-teal-500' },
    { name: 'Account History', href: '/account-history', icon: History, color: 'text-slate-500' },
    { name: 'Savings & Investments', href: '/savings-investments', icon: PiggyBank, color: 'text-emerald-600' },
    { name: 'Income', href: '/income', icon: DollarSign, color: 'text-green-500' },
    { name: 'Expenses', href: '/expenses', icon: TrendingDown, color: 'text-red-500' },
    { name: 'Calculator', href: '/calculator', icon: Calculator, color: 'text-purple-500' },
    { name: 'Goals', href: '/goals', icon: Target, color: 'text-orange-500' },
    { name: 'Budget', href: '/budget', icon: CreditCard, color: 'text-cyan-500' },
    { name: 'Reports', href: '/reports', icon: BarChart3, color: 'text-indigo-500' },
    { name: 'Comprehensive Reports', href: '/reports/comprehensive', icon: FileText, color: 'text-blue-600' },
    { name: 'Subscriptions', href: '/subscriptions', icon: RefreshCw, color: 'text-pink-500' },
    { name: 'Net Worth', href: '/networth', icon: FileText, color: 'text-emerald-500' },
    { name: 'Lending', href: '/lending', icon: HandCoins, color: 'text-amber-500' },
    { name: 'Bill Reminders', href: '/bills', icon: Bell, color: 'text-violet-500' },
  ]

  const bottomNav = [
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  const isActive = (path) => location.pathname === path

  const currentPage = navigation.find(item => isActive(item.href)) ||
                      bottomNav.find(item => isActive(item.href)) ||
                      { name: 'Dashboard' }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] transition-colors duration-300">
      {/* Mobile sidebar backdrop */}
      <div
        className={`
          fixed inset-0 z-40 lg:hidden
          bg-black/60 backdrop-blur-sm
          transition-opacity duration-300
          ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          w-72 bg-[var(--sidebar-bg)]
          border-r border-[var(--sidebar-border)]
          transform transition-all duration-300 ease-out
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo Header */}
          <div className="flex items-center justify-between h-16 px-5 border-b border-[var(--border-primary)] flex-shrink-0">
            <Link to="/dashboard" className="flex items-center space-x-3 group">
              <div className="relative">
                <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-2.5 shadow-md group-hover:shadow-glow transition-shadow duration-300">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-[var(--sidebar-bg)]" />
              </div>
              <div>
                <span className="text-lg font-bold text-[var(--text-primary)]">KenyaPesa</span>
                <span className="block text-xs text-[var(--text-muted)] -mt-0.5">Finance Tracker</span>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation - Scrollable */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide">
            <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Main Menu
            </p>
            {navigation.map((item, index) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    group flex items-center justify-between px-3 py-2.5 rounded-xl
                    text-sm font-medium transition-all duration-200
                    animate-fade-in-up
                    ${active
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--text-primary)]'
                    }
                  `}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="flex items-center">
                    <div className={`
                      p-1.5 rounded-lg mr-3 transition-colors duration-200
                      ${active
                        ? 'bg-white/20'
                        : `bg-[var(--bg-tertiary)] ${item.color}`
                      }
                    `}>
                      <Icon className={`h-4 w-4 ${active ? 'text-white' : ''}`} />
                    </div>
                    <span>{item.name}</span>
                  </div>
                  {active && (
                    <ChevronRight className="h-4 w-4 opacity-70" />
                  )}
                </Link>
              )
            })}

            {/* Divider */}
            <div className="my-4 mx-3 h-px bg-[var(--border-primary)]" />

            <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Preferences
            </p>
            {bottomNav.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    group flex items-center px-3 py-2.5 rounded-xl
                    text-sm font-medium transition-all duration-200
                    ${active
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--text-primary)]'
                    }
                  `}
                >
                  <div className={`
                    p-1.5 rounded-lg mr-3 transition-colors duration-200
                    ${active ? 'bg-white/20' : 'bg-[var(--bg-tertiary)]'}
                  `}>
                    <Icon className={`h-4 w-4 ${active ? 'text-white' : 'text-[var(--text-secondary)]'}`} />
                  </div>
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* User Section - Fixed at Bottom */}
          <div className="p-4 border-t border-[var(--border-primary)] flex-shrink-0 space-y-3">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-tertiary)]">
              <div className="flex items-center">
                {isDark ? (
                  <Moon className="h-4 w-4 text-[var(--text-secondary)] mr-2" />
                ) : (
                  <Sun className="h-4 w-4 text-[var(--text-secondary)] mr-2" />
                )}
                <span className="text-sm font-medium text-[var(--text-secondary)]">
                  {isDark ? 'Dark' : 'Light'} Mode
                </span>
              </div>
              <button
                onClick={toggleTheme}
                className={`
                  relative w-12 h-6 rounded-full transition-colors duration-300
                  ${isDark ? 'bg-primary-600' : 'bg-secondary-300'}
                `}
                aria-label="Toggle theme"
              >
                <span
                  className={`
                    absolute top-1 w-4 h-4 rounded-full bg-white shadow-md
                    transition-transform duration-300 ease-out
                    ${isDark ? 'translate-x-7' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>

            {/* User Info */}
            <div className="flex items-center p-3 rounded-xl bg-[var(--bg-tertiary)]">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold shadow-md">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
              </div>
              <div className="ml-3 overflow-hidden flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                  {user?.user_metadata?.full_name || 'User'}
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:ml-72 min-h-screen flex flex-col transition-all duration-300">
        {/* Top Header Bar */}
        <header
          className={`
            sticky top-0 z-30 transition-all duration-300
            ${isScrolled
              ? 'bg-[var(--bg-secondary)]/80 backdrop-blur-xl shadow-soft border-b border-[var(--border-primary)]'
              : 'bg-transparent'
            }
          `}
        >
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all duration-200 active:scale-95"
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* Page title */}
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
                  {currentPage.name}
                </h1>
                <p className="hidden sm:block text-xs text-[var(--text-muted)]">
                  Welcome back, {user?.user_metadata?.full_name?.split(' ')[0] || 'there'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Date display - hidden on mobile */}
              <div className="hidden md:flex items-center px-4 py-2 rounded-xl bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)]">
                <span className="font-medium">
                  {new Date().toLocaleDateString('en-KE', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>

              {/* Notifications - placeholder */}
              <button className="relative p-2.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all duration-200">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              {/* Theme toggle - desktop */}
              <button
                onClick={toggleTheme}
                className="hidden sm:flex p-2.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all duration-200"
                aria-label="Toggle theme"
              >
                {isDark ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>

              {/* User avatar - mobile */}
              <button
                onClick={() => navigate('/settings')}
                className="lg:hidden h-9 w-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold shadow-md"
              >
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto animate-fade-in-up">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-auto py-4 px-4 sm:px-6 lg:px-8 border-t border-[var(--border-primary)]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--text-muted)] gap-2">
            <p>2024 KenyaPesa Tracker. Built for Kenyan employees.</p>
            <p className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              All systems operational
            </p>
          </div>
        </footer>
      </div>

      {/* Mobile Bottom Navigation - Optional enhancement */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[var(--bg-secondary)] border-t border-[var(--border-primary)] safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {navigation.slice(0, 5).map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex flex-col items-center justify-center flex-1 h-full
                  transition-colors duration-200
                  ${active
                    ? 'text-primary-500'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }
                `}
              >
                <Icon className={`h-5 w-5 ${active ? 'animate-bounce-soft' : ''}`} />
                <span className="text-[10px] mt-1 font-medium">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Spacer for mobile bottom nav */}
      <div className="h-16 lg:hidden" />
    </div>
  )
}
