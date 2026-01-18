import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  LayoutDashboard,
  DollarSign,
  TrendingDown,
  Calculator,
  Target,
  Settings,
  BarChart3,
  Wallet,
  CreditCard,
  RefreshCw,
  HandCoins,
  History,
  Smartphone,
  Briefcase,
  X,
  Command,
  ArrowRight
} from 'lucide-react'

const pages = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, keywords: ['home', 'overview', 'main'] },
  { name: 'Portfolio', href: '/portfolio', icon: Briefcase, keywords: ['networth', 'assets', 'summary'] },
  { name: 'Accounts', href: '/accounts', icon: Wallet, keywords: ['bank', 'mpesa', 'wallet', 'money'] },
  { name: 'Account History', href: '/account-history', icon: History, keywords: ['transactions', 'ledger', 'log'] },
  { name: 'Income', href: '/income', icon: DollarSign, keywords: ['salary', 'earnings', 'money in'] },
  { name: 'Expenses', href: '/expenses', icon: TrendingDown, keywords: ['spending', 'costs', 'money out'] },
  { name: 'Budget', href: '/budget', icon: CreditCard, keywords: ['planning', 'limits', 'allocation'] },
  { name: 'Goals', href: '/goals', icon: Target, keywords: ['savings', 'targets', 'objectives'] },
  { name: 'Reports', href: '/reports', icon: BarChart3, keywords: ['analytics', 'charts', 'insights'] },
  { name: 'Calculator', href: '/calculator', icon: Calculator, keywords: ['tax', 'paye', 'nhif', 'nssf'] },
  { name: 'M-Pesa Calculator', href: '/mpesa-calculator', icon: Smartphone, keywords: ['fees', 'charges', 'send money'] },
  { name: 'Subscriptions & Bills', href: '/subscriptions', icon: RefreshCw, keywords: ['recurring', 'bills', 'monthly', 'reminders', 'due', 'payments'] },
  { name: 'Lending', href: '/lending', icon: HandCoins, keywords: ['loans', 'borrowed', 'lent', 'debt'] },
  { name: 'Settings', href: '/settings', icon: Settings, keywords: ['profile', 'preferences', 'account'] },
]

const quickActions = [
  { name: 'Add Expense', action: 'add-expense', icon: TrendingDown, keywords: ['new expense', 'record spending'] },
  { name: 'Add Income', action: 'add-income', icon: DollarSign, keywords: ['new income', 'record earnings'] },
  { name: 'Transfer Money', action: 'transfer', icon: ArrowRight, keywords: ['move money', 'between accounts'] },
]

export default function CommandPalette({ isOpen, onClose, onQuickAction }) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  // Filter results based on query
  const filteredPages = useMemo(() => {
    if (!query) return pages
    const lowerQuery = query.toLowerCase()
    return pages.filter(page =>
      page.name.toLowerCase().includes(lowerQuery) ||
      page.keywords.some(k => k.includes(lowerQuery))
    )
  }, [query])

  const filteredActions = useMemo(() => {
    if (!query) return quickActions
    const lowerQuery = query.toLowerCase()
    return quickActions.filter(action =>
      action.name.toLowerCase().includes(lowerQuery) ||
      action.keywords.some(k => k.includes(lowerQuery))
    )
  }, [query])

  const allResults = [...filteredActions, ...filteredPages]

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(i => Math.min(i + 1, allResults.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(i => Math.max(i - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (allResults[selectedIndex]) {
            handleSelect(allResults[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, allResults])

  const handleSelect = (item) => {
    if (item.href) {
      navigate(item.href)
    } else if (item.action && onQuickAction) {
      onQuickAction(item.action)
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative min-h-screen flex items-start justify-center pt-[15vh] px-4">
        <div className="relative w-full max-w-lg bg-[var(--bg-secondary)] rounded-2xl shadow-2xl border border-[var(--border-primary)] overflow-hidden animate-scale-in">
          {/* Search Input */}
          <div className="flex items-center px-4 border-b border-[var(--border-primary)]">
            <Search className="h-5 w-5 text-[var(--text-muted)]" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search pages or actions..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 px-3 py-4 bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
            />
            <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <kbd className="px-1.5 py-0.5 bg-[var(--bg-tertiary)] rounded text-[10px] font-mono">ESC</kbd>
            </div>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto py-2">
            {/* Quick Actions */}
            {filteredActions.length > 0 && (
              <div className="px-3 py-2">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Quick Actions
                </p>
                {filteredActions.map((action, index) => {
                  const Icon = action.icon
                  const isSelected = index === selectedIndex
                  return (
                    <button
                      key={action.action}
                      onClick={() => handleSelect(action)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left
                        transition-colors duration-150
                        ${isSelected
                          ? 'bg-primary-500 text-white'
                          : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                        }
                      `}
                    >
                      <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-white/20' : 'bg-[var(--bg-tertiary)]'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="font-medium">{action.name}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Pages */}
            {filteredPages.length > 0 && (
              <div className="px-3 py-2">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Pages
                </p>
                {filteredPages.map((page, index) => {
                  const Icon = page.icon
                  const adjustedIndex = filteredActions.length + index
                  const isSelected = adjustedIndex === selectedIndex
                  return (
                    <button
                      key={page.href}
                      onClick={() => handleSelect(page)}
                      onMouseEnter={() => setSelectedIndex(adjustedIndex)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left
                        transition-colors duration-150
                        ${isSelected
                          ? 'bg-primary-500 text-white'
                          : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                        }
                      `}
                    >
                      <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-white/20' : 'bg-[var(--bg-tertiary)]'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="font-medium">{page.name}</span>
                      {isSelected && (
                        <ArrowRight className="h-4 w-4 ml-auto opacity-70" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* No results */}
            {allResults.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-[var(--text-muted)]">No results for "{query}"</p>
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="px-4 py-3 border-t border-[var(--border-primary)] bg-[var(--bg-tertiary)]">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-[var(--bg-secondary)] rounded text-[10px] font-mono">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-[var(--bg-secondary)] rounded text-[10px] font-mono">↵</kbd>
                  Select
                </span>
              </div>
              <span className="flex items-center gap-1">
                <Command className="h-3 w-3" />
                <span>K to open</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
