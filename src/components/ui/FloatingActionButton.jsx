import { useState, useEffect, useRef } from 'react'
import { Plus, X, TrendingDown, DollarSign, ArrowRightLeft } from 'lucide-react'

const actions = [
  { id: 'expense', label: 'Add Expense', icon: TrendingDown, color: 'bg-red-500' },
  { id: 'income', label: 'Add Income', icon: DollarSign, color: 'bg-green-500' },
  { id: 'transfer', label: 'Transfer', icon: ArrowRightLeft, color: 'bg-blue-500' },
]

export default function FloatingActionButton({ onAction, className = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const fabRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (fabRef.current && !fabRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Close on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (isOpen) setIsOpen(false)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isOpen])

  const handleAction = (actionId) => {
    setIsOpen(false)
    onAction?.(actionId)
  }

  return (
    <div
      ref={fabRef}
      className={`fixed right-4 bottom-20 z-50 lg:hidden ${className}`}
    >
      {/* Action buttons */}
      <div className={`
        absolute bottom-16 right-0 flex flex-col-reverse gap-3
        transition-all duration-300 origin-bottom-right
        ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
      `}>
        {actions.map((action, index) => {
          const Icon = action.icon
          return (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              className={`
                flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-full
                bg-[var(--bg-secondary)] shadow-lg border border-[var(--border-primary)]
                text-[var(--text-primary)] font-medium text-sm
                transition-all duration-200 hover:scale-105 active:scale-95
                animate-fade-in-up
              `}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <span>{action.label}</span>
              <div className={`p-2 rounded-full ${action.color}`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
            </button>
          )
        })}
      </div>

      {/* Main FAB button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-14 h-14 rounded-full shadow-lg
          bg-gradient-to-br from-primary-500 to-primary-600
          flex items-center justify-center
          transition-all duration-300 hover:shadow-glow active:scale-95
          ${isOpen ? 'rotate-45' : 'rotate-0'}
        `}
        aria-label={isOpen ? 'Close menu' : 'Quick actions'}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <Plus className="h-6 w-6 text-white" />
        )}
      </button>
    </div>
  )
}
