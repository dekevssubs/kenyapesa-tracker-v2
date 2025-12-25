import { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../utils/supabase'
import { BudgetAlertService } from '../utils/budgetAlertService'

/**
 * Custom hook for budget alert monitoring
 * Automatically checks budgets on mount and periodically
 */
export function useBudgetAlerts() {
  const { user } = useAuth()
  const { showToast } = useToast()

  useEffect(() => {
    if (!user || !showToast) return

    // Initial check on mount
    checkBudgets()

    // Re-check every 5 minutes (300000ms)
    const interval = setInterval(() => {
      checkBudgets()
    }, 300000)

    return () => clearInterval(interval)
  }, [user, showToast])

  const checkBudgets = async () => {
    try {
      const service = new BudgetAlertService(supabase, user.id, showToast)
      await service.checkAllBudgets()
    } catch (error) {
      console.error('Error checking budgets:', error)
    }
  }

  return { checkBudgets }
}
