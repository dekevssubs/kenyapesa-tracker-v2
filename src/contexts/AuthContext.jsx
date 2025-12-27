import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../utils/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  // Initialize auth state
  const initializeAuth = useCallback(async () => {
    try {
      // Set a timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.warn('Auth initialization timeout - proceeding without session')
        setLoading(false)
      }, 10000) // 10 second timeout

      const { data: { session }, error } = await supabase.auth.getSession()

      clearTimeout(timeoutId)

      if (error) {
        console.error('Error getting session:', error)
        setAuthError(error.message)
        setUser(null)
      } else {
        setUser(session?.user ?? null)
      }
    } catch (error) {
      console.error('Auth initialization error:', error)
      setAuthError(error.message)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAuthError(null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [initializeAuth])

  const signUp = async (email, password, fullName) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      })

      if (error) throw error

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            { 
              id: data.user.id, 
              full_name: fullName,
              currency: 'KES'
            }
          ])

        if (profileError) throw profileError
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const value = {
    user,
    loading,
    authError,
    signUp,
    signIn,
    signOut,
    refreshAuth: initializeAuth,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}