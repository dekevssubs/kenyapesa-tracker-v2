import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import DashboardLayout from './dashboard/DashboardLayout'

/**
 * PrivateRoute - Combines authentication check with dashboard layout
 * Use this for all authenticated pages to reduce boilerplate
 */
export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-[var(--text-secondary)]">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  )
}
