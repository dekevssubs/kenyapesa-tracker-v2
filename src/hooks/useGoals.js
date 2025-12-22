import { useState, useCallback } from 'react'
import { supabase } from '../utils/supabase'

export function useGoals(user) {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchGoals = useCallback(async () => {
    if (!user) return

    setLoading(true)

    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!error) setGoals(data || [])
    setLoading(false)
  }, [user])

  return {
    goals,
    loading,
    fetchGoals
  }
}
