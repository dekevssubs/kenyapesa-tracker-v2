import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../utils/supabase'

const OnboardingContext = createContext({})

export const useOnboarding = () => {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  return context
}

export const OnboardingProvider = ({ children }) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const [tourRunning, setTourRunning] = useState(false)
  const [onboardingStatus, setOnboardingStatus] = useState({
    completed: false,
    completedAt: null,
    skipped: false
  })

  // Fetch onboarding status from database
  const fetchOnboardingStatus = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed, onboarding_completed_at, onboarding_skipped')
        .eq('id', user.id)
        .single()

      if (error) {
        // If columns don't exist yet, treat as new user
        if (error.code === 'PGRST116' || error.message?.includes('column')) {
          setOnboardingStatus({ completed: false, completedAt: null, skipped: false })
          setShowWelcomeModal(true)
        } else {
          console.error('Error fetching onboarding status:', error)
        }
        setLoading(false)
        return
      }

      if (data) {
        const status = {
          completed: data.onboarding_completed || false,
          completedAt: data.onboarding_completed_at,
          skipped: data.onboarding_skipped || false
        }
        setOnboardingStatus(status)

        // Show welcome modal for new users who haven't completed or skipped
        if (!status.completed && !status.skipped) {
          setShowWelcomeModal(true)
        }
      }
    } catch (err) {
      console.error('Error in fetchOnboardingStatus:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchOnboardingStatus()
  }, [fetchOnboardingStatus])

  // Start the tour
  const startTour = useCallback(() => {
    setShowWelcomeModal(false)
    setShowTour(true)
    setTourRunning(true)
  }, [])

  // Skip onboarding
  const skipOnboarding = useCallback(async () => {
    setShowWelcomeModal(false)
    setShowTour(false)
    setTourRunning(false)

    if (!user) return

    try {
      await supabase
        .from('profiles')
        .update({
          onboarding_skipped: true
        })
        .eq('id', user.id)

      setOnboardingStatus(prev => ({ ...prev, skipped: true }))
    } catch (err) {
      console.error('Error saving skip status:', err)
    }
  }, [user])

  // Complete the tour
  const completeTour = useCallback(async () => {
    setShowTour(false)
    setTourRunning(false)

    if (!user) return

    try {
      const completedAt = new Date().toISOString()
      await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          onboarding_completed_at: completedAt,
          onboarding_skipped: false
        })
        .eq('id', user.id)

      setOnboardingStatus({
        completed: true,
        completedAt,
        skipped: false
      })
    } catch (err) {
      console.error('Error completing tour:', err)
    }
  }, [user])

  // Restart the tour (from settings)
  const restartTour = useCallback(async () => {
    if (!user) return

    try {
      await supabase
        .from('profiles')
        .update({
          onboarding_completed: false,
          onboarding_completed_at: null,
          onboarding_skipped: false
        })
        .eq('id', user.id)

      setOnboardingStatus({
        completed: false,
        completedAt: null,
        skipped: false
      })

      // Close welcome modal and start tour directly
      setShowWelcomeModal(false)
      setShowTour(true)
      setTourRunning(true)
    } catch (err) {
      console.error('Error restarting tour:', err)
    }
  }, [user])

  // Handle tour callback
  const handleTourCallback = useCallback((data) => {
    const { status, type } = data

    if (status === 'finished') {
      completeTour()
    } else if (status === 'skipped') {
      skipOnboarding()
    } else if (type === 'tour:end') {
      setTourRunning(false)
    }
  }, [completeTour, skipOnboarding])

  const value = {
    loading,
    showWelcomeModal,
    setShowWelcomeModal,
    showTour,
    setShowTour,
    tourRunning,
    setTourRunning,
    onboardingStatus,
    startTour,
    skipOnboarding,
    completeTour,
    restartTour,
    handleTourCallback
  }

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  )
}

export default OnboardingContext
