import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { RecurringExpenseService } from '../utils/recurringExpenseService'

/**
 * Custom hook for recurring expense automation
 * Checks for due recurring expenses and creates pending entries
 */
export function useRecurringExpenses() {
  const { user } = useAuth()
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    // Initial check on mount
    checkRecurringExpenses()

    // Re-check daily (86400000ms = 24 hours)
    const interval = setInterval(() => {
      checkRecurringExpenses()
    }, 86400000)

    return () => clearInterval(interval)
  }, [user])

  const checkRecurringExpenses = async () => {
    try {
      const service = new RecurringExpenseService(supabase, user.id)

      // Check and create pending expenses
      await service.checkAndCreatePendingExpenses()

      // Get count of pending expenses
      const count = await service.getPendingCount()
      setPendingCount(count)
      setLoading(false)
    } catch (error) {
      console.error('Error checking recurring expenses:', error)
      setLoading(false)
    }
  }

  const refreshPendingCount = async () => {
    try {
      const service = new RecurringExpenseService(supabase, user.id)
      const count = await service.getPendingCount()
      setPendingCount(count)
    } catch (error) {
      console.error('Error refreshing pending count:', error)
    }
  }

  return {
    pendingCount,
    loading,
    checkRecurringExpenses,
    refreshPendingCount
  }
}
