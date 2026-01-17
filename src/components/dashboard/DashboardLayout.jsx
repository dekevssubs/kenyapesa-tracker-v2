import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useNotifications } from '../../hooks/useNotifications'
import NotificationPanel from '../NotificationPanel'
import CommandPalette from '../ui/CommandPalette'
import FloatingActionButton from '../ui/FloatingActionButton'
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
  Sun,
  Moon,
  Wallet,
  CreditCard,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Bell,
  HandCoins,
  History,
  Smartphone,
  Briefcase,
  Search,
  Command,
  PieChart,
  Wrench,
  MoreHorizontal
} from 'lucide-react'

// Navigation groups configuration
const navigationGroups = [
  {
    id: 'overview',
    label: 'Overview',
    icon: PieChart,
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, color: 'text-blue-500' },
      { name: 'Portfolio', href: '/portfolio', icon: Briefcase, color: 'text-emerald-500' },
    ]
  },
  {
    id: 'money',
    label: 'Money Flow',
    icon: DollarSign,
    items: [
      { name: 'Accounts', href: '/accounts', icon: Wallet, color: 'text-teal-500' },
      { name: 'Account History', href: '/account-history', icon: History, color: 'text-slate-500' },
      { name: 'Income', href: '/income', icon: DollarSign, color: 'text-green-500' },
      { name: 'Expenses', href: '/expenses', icon: TrendingDown, color: 'text-red-500' },
    ]
  },
  {
    id: 'planning',
    label: 'Planning',
    icon: Target,
    items: [
      { name: 'Budget', href: '/budget', icon: CreditCard, color: 'text-cyan-500' },
      { name: 'Goals', href: '/goals', icon: Target, color: 'text-orange-500' },
      { name: 'Reminders', href: '/reminders', icon: Bell, color: 'text-violet-500' },
      { name: 'Subscriptions', href: '/subscriptions', icon: RefreshCw, color: 'text-pink-500' },
    ]
  },
  {
    id: 'tools',
    label: 'Tools',
    icon: Wrench,
    items: [
      { name: 'Reports', href: '/reports', icon: BarChart3, color: 'text-indigo-500' },
      { name: 'Calculator', href: '/calculator', icon: Calculator, color: 'text-purple-500' },
      { name: 'M-Pesa Calculator', href: '/mpesa-calculator', icon: Smartphone, color: 'text-green-600' },
      { name: 'Lending', href: '/lending', icon: HandCoins, color: 'text-amber-500' },
    ]
  },
]

// Flat navigation for lookup
const allNavItems = navigationGroups.flatMap(g => g.items)

// Default expanded groups
const defaultExpanded = ['overview', 'money', 'planning', 'tools']

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState(() => {
    const saved = localStorage.getItem('sidebar-expanded-groups')
    return saved ? JSON.parse(saved) : defaultExpanded
  })
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

  // Global keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
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

  // Save expanded groups to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-expanded-groups', JSON.stringify(expandedGroups))
  }, [expandedGroups])

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

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    )
  }

  const isActive = (path) => location.pathname === path

  const currentPage = allNavItems.find(item => isActive(item.href)) ||
    (location.pathname === '/settings' ? { name: 'Settings' } : { name: 'Dashboard' })

  // Handle quick actions from FAB or command palette
  const handleQuickAction = (action) => {
    switch (action) {
      case 'expense':
      case 'add-expense':
        navigate('/expenses', { state: { openAddModal: true } })
        break
      case 'income':
      case 'add-income':
        navigate('/income', { state: { openAddModal: true } })
        break
      case 'transfer':
        navigate('/accounts', { state: { openTransferModal: true } })
        break
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] transition-colors duration-300">
      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onQuickAction={handleQuickAction}
      />

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
              <img
                src="/logo.svg"
                alt="KenyaPesa"
                className="h-10 w-10 group-hover:scale-105 transition-transform duration-300"
              />
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

          {/* Search trigger - Desktop sidebar */}
          <div className="px-3 pt-4 pb-2">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors text-sm"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left">Search...</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[var(--bg-secondary)] rounded text-[10px] font-mono">
                <Command className="h-3 w-3" />K
              </kbd>
            </button>
          </div>

          {/* Navigation - Scrollable */}
          <nav className="flex-1 px-3 py-2 space-y-2 overflow-y-auto scrollbar-hide">
            {navigationGroups.map((group) => {
              const GroupIcon = group.icon
              const isExpanded = expandedGroups.includes(group.id)
              const hasActiveItem = group.items.some(item => isActive(item.href))

              return (
                <div
                  key={group.id}
                  className="rounded-xl bg-[var(--bg-tertiary)]/50 dark:bg-white/[0.02] p-1.5"
                >
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className={`
                      w-full flex items-center justify-between px-2.5 py-2
                      text-[11px] font-semibold uppercase tracking-[0.1em]
                      transition-colors duration-200
                      ${hasActiveItem
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <GroupIcon className="h-3.5 w-3.5" />
                      <span>{group.label}</span>
                    </div>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />
                  </button>

                  {/* Divider */}
                  {isExpanded && (
                    <div className="h-px bg-[var(--border-primary)]/50 mx-2 mb-1" />
                  )}

                  {/* Group Items */}
                  <div className={`
                    overflow-hidden transition-all duration-200
                    ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
                  `}>
                    {group.items.map((item) => {
                      const Icon = item.icon
                      const active = isActive(item.href)
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={`
                            group flex items-center justify-between px-3 py-2.5 rounded-lg
                            text-sm font-medium transition-all duration-200
                            ${active
                              ? 'bg-gradient-to-r from-primary-500/90 to-primary-600 text-white shadow-md shadow-primary-500/20'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--text-primary)]'
                            }
                          `}
                        >
                          <div className="flex items-center">
                            <div className={`
                              p-1.5 rounded-lg mr-3 transition-colors duration-200
                              ${active
                                ? 'bg-white/20'
                                : 'bg-[var(--bg-secondary)]'
                              }
                            `}>
                              <Icon className={`h-4 w-4 ${active ? 'text-white' : 'text-[var(--text-muted)]'}`} />
                            </div>
                            <span>{item.name}</span>
                          </div>
                          {active && (
                            <ChevronRight className="h-4 w-4 opacity-70" />
                          )}
                        </Link>
                      )
                    })}
                  </div>
                </div>
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
              {/* Search button - Mobile */}
              <button
                onClick={() => setCommandPaletteOpen(true)}
                className="p-2.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all duration-200 lg:hidden"
                title="Search (Ctrl+K)"
              >
                <Search className="h-5 w-5" />
              </button>

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

      {/* Floating Action Button - Mobile */}
      <FloatingActionButton onAction={handleQuickAction} />

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[var(--bg-secondary)] border-t border-[var(--border-primary)] safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {/* Show first 4 items + More */}
          {[
            { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
            { name: 'Accounts', href: '/accounts', icon: Wallet },
            { name: 'Expenses', href: '/expenses', icon: TrendingDown },
            { name: 'Budget', href: '/budget', icon: CreditCard },
          ].map((item) => {
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
          {/* More button - opens sidebar */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-full text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors duration-200"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* Spacer for mobile bottom nav */}
      <div className="h-16 lg:hidden" />
    </div>
  )
}
