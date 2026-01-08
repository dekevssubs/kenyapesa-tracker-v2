import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import PrivateRoute from './components/PrivateRoute'
import { PageSkeleton, CompactPageSkeleton } from './components/ui/Skeleton'

// Auth pages - loaded eagerly (small, needed immediately)
import Login from './components/auth/Login'
import Signup from './components/auth/Signup'

// Dashboard pages - lazy loaded for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Income = lazy(() => import('./pages/Income'))
const Expenses = lazy(() => import('./pages/Expenses'))
const Calculator = lazy(() => import('./pages/Calculator'))
const Goals = lazy(() => import('./pages/Goals'))
const ComprehensiveReports = lazy(() => import('./pages/ComprehensiveReports'))
const Budget = lazy(() => import('./pages/Budget'))
const Settings = lazy(() => import('./pages/Settings'))
const Subscriptions = lazy(() => import('./pages/Subscriptions'))
const Lending = lazy(() => import('./pages/Lending'))
const BillReminders = lazy(() => import('./pages/BillReminders'))
const Accounts = lazy(() => import('./pages/Accounts'))
const AccountHistory = lazy(() => import('./pages/AccountHistory'))
const MpesaCalculator = lazy(() => import('./pages/MpesaCalculator'))
const Portfolio = lazy(() => import('./pages/Portfolio'))

// Suspense wrapper for private routes with skeleton fallback
function LazyPrivateRoute({ children, skeleton = 'full' }) {
  const FallbackSkeleton = skeleton === 'compact' ? CompactPageSkeleton : PageSkeleton
  return (
    <PrivateRoute>
      <Suspense fallback={<FallbackSkeleton />}>
        {children}
      </Suspense>
    </PrivateRoute>
  )
}

function App() {
  return (
    <Router>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* Protected routes with lazy loading */}
              <Route path="/dashboard" element={<LazyPrivateRoute><Dashboard /></LazyPrivateRoute>} />
              <Route path="/income" element={<LazyPrivateRoute><Income /></LazyPrivateRoute>} />
              <Route path="/expenses" element={<LazyPrivateRoute><Expenses /></LazyPrivateRoute>} />
              <Route path="/calculator" element={<LazyPrivateRoute skeleton="compact"><Calculator /></LazyPrivateRoute>} />
              <Route path="/goals" element={<LazyPrivateRoute><Goals /></LazyPrivateRoute>} />
              <Route path="/reports" element={<LazyPrivateRoute><ComprehensiveReports /></LazyPrivateRoute>} />
              <Route path="/budget" element={<LazyPrivateRoute><Budget /></LazyPrivateRoute>} />
              <Route path="/settings" element={<LazyPrivateRoute skeleton="compact"><Settings /></LazyPrivateRoute>} />
              <Route path="/subscriptions" element={<LazyPrivateRoute><Subscriptions /></LazyPrivateRoute>} />
              <Route path="/lending" element={<LazyPrivateRoute><Lending /></LazyPrivateRoute>} />
              <Route path="/bills" element={<LazyPrivateRoute><BillReminders /></LazyPrivateRoute>} />
              <Route path="/accounts" element={<LazyPrivateRoute><Accounts /></LazyPrivateRoute>} />
              <Route path="/account-history" element={<LazyPrivateRoute><AccountHistory /></LazyPrivateRoute>} />
              <Route path="/mpesa-calculator" element={<LazyPrivateRoute skeleton="compact"><MpesaCalculator /></LazyPrivateRoute>} />
              <Route path="/portfolio" element={<LazyPrivateRoute><Portfolio /></LazyPrivateRoute>} />

              {/* Legacy redirects */}
              <Route path="/networth" element={<Navigate to="/portfolio" replace />} />
              <Route path="/savings-investments" element={<Navigate to="/portfolio" replace />} />

              {/* Default routes */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </Router>
  )
}

export default App
