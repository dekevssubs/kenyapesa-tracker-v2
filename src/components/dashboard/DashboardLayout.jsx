import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useNotifications } from '../../hooks/useNotifications'
import NotificationPanel from '../NotificationPanel'
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
  PiggyBank,
  Smartphone,
  Briefcase
} from 'lucide-react'

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const notificationRef = useRef(null)
  const userMenuRef = useRef(null)
  const { user, signOut } = useAuth()
  const { theme, toggleTheme, isDark } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const {
    notifications,
    unreadCount,
    totalCount,
    urgentOnly,
    loading: notificationsLoading,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
    toggleUrgentOnly
  } = useNotifications()

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

  // Handle click outside notification panel
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationPanelOpen(false)
      }
    }

    if (notificationPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [notificationPanelOpen])

  // Handle click outside user menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false)
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, color: 'text-blue-500' },
    { name: 'Portfolio', href: '/portfolio', icon: Briefcase, color: 'text-emerald-500' },
    { name: 'Accounts', href: '/accounts', icon: Wallet, color: 'text-teal-500' },
    { name: 'Account History', href: '/account-history', icon: History, color: 'text-slate-500' },
    { name: 'Goals', href: '/goals', icon: Target, color: 'text-orange-500' },
    { name: 'Income', href: '/income', icon: DollarSign, color: 'text-green-500' },
    { name: 'Expenses', href: '/expenses', icon: TrendingDown, color: 'text-red-500' },
    { name: 'Budget', href: '/budget', icon: CreditCard, color: 'text-cyan-500' },
    { name: 'Reports', href: '/reports', icon: BarChart3, color: 'text-indigo-500' },
    { name: 'Calculator', href: '/calculator', icon: Calculator, color: 'text-purple-500' },
    { name: 'M-Pesa Calculator', href: '/mpesa-calculator', icon: Smartphone, color: 'text-green-600' },
    { name: 'Subscriptions', href: '/subscriptions', icon: RefreshCw, color: 'text-pink-500' },
    { name: 'Lending', href: '/lending', icon: HandCoins, color: 'text-amber-500' },
    { name: 'Bill Reminders', href: '/bills', icon: Bell, color: 'text-violet-500' },
    { name: 'Settings', href: '/settings', icon: Settings, color: 'text-gray-500' },
    // Legacy routes - redirect to Portfolio
    // { name: 'Savings & Investments', href: '/savings-investments', icon: PiggyBank, color: 'text-emerald-600' },
    // { name: 'Net Worth', href: '/networth', icon: FileText, color: 'text-emerald-500' },
  ]

  const isActive = (path) => location.pathname === path

  const currentPage = navigation.find(item => isActive(item.href)) || { name: 'Dashboard' }

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
          </nav>
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

              {/* Notifications */}
              <div ref={notificationRef} className="relative">
                <button
                  onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
                  className={`
                    relative p-2.5 rounded-xl transition-all duration-200
                    ${notificationPanelOpen
                      ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                    }
                  `}
                  title="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-xs font-bold rounded-full">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Panel */}
                {notificationPanelOpen && (
                  <NotificationPanel
                    notifications={notifications}
                    unreadCount={unreadCount}
                    totalCount={totalCount}
                    urgentOnly={urgentOnly}
                    onToggleUrgentOnly={toggleUrgentOnly}
                    onClose={() => setNotificationPanelOpen(false)}
                    onMarkAsRead={markAsRead}
                    onMarkAllAsRead={markAllAsRead}
                    onClearNotification={clearNotification}
                    onClearAll={clearAll}
                  />
                )}
              </div>

              {/* Theme toggle - always visible */}
              <button
                onClick={toggleTheme}
                className="flex p-2.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all duration-200 relative"
                aria-label="Toggle theme"
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDark ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>

              {/* User Menu Dropdown */}
              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={`
                    flex items-center space-x-2 p-1.5 rounded-xl transition-all duration-200
                    ${userMenuOpen
                      ? 'bg-[var(--bg-tertiary)]'
                      : 'hover:bg-[var(--bg-tertiary)]'
                    }
                  `}
                  title="User menu"
                >
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold shadow-md">
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="hidden sm:block text-left min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate max-w-[120px]">
                      {user?.user_metadata?.full_name?.split(' ')[0] || 'User'}
                    </p>
                  </div>
                </button>

                {/* User Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-slideIn">
                    {/* User Info Header */}
                    <div className="p-4 bg-gradient-to-br from-primary-500 to-primary-600">
                      <div className="flex items-center space-x-3">
                        <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-lg shadow-md">
                          {user?.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold truncate">
                            {user?.user_metadata?.full_name || 'User'}
                          </p>
                          <p className="text-white/80 text-sm truncate">
                            {user?.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <button
                        onClick={() => {
                          navigate('/settings')
                          setUserMenuOpen(false)
                        }}
                        className="w-full flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Settings className="h-4 w-4 mr-3 text-gray-500 dark:text-gray-400" />
                        <span>Settings & Preferences</span>
                      </button>

                      <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />

                      <button
                        onClick={async () => {
                          setUserMenuOpen(false)
                          await handleLogout()
                        }}
                        className="w-full flex items-center px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
            <p>{new Date().getFullYear()} KenyaPesa Tracker. Built for Kenyan employees.</p>
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
