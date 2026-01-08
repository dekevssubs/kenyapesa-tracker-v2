import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import PrivateRoute from './components/PrivateRoute'

// Auth pages
import Login from './components/auth/Login'
import Signup from './components/auth/Signup'

// Dashboard pages
import Dashboard from './pages/Dashboard'
import Income from './pages/Income'
import Expenses from './pages/Expenses'
import Calculator from './pages/Calculator'
import Goals from './pages/Goals'
import ComprehensiveReports from './pages/ComprehensiveReports'
import Budget from './pages/Budget'
import Settings from './pages/Settings'
import Subscriptions from './pages/Subscriptions'
import Lending from './pages/Lending'
import BillReminders from './pages/BillReminders'
import Accounts from './pages/Accounts'
import AccountHistory from './pages/AccountHistory'
import MpesaCalculator from './pages/MpesaCalculator'
import Portfolio from './pages/Portfolio'

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

              {/* Protected routes - using PrivateRoute wrapper */}
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/income" element={<PrivateRoute><Income /></PrivateRoute>} />
              <Route path="/expenses" element={<PrivateRoute><Expenses /></PrivateRoute>} />
              <Route path="/calculator" element={<PrivateRoute><Calculator /></PrivateRoute>} />
              <Route path="/goals" element={<PrivateRoute><Goals /></PrivateRoute>} />
              <Route path="/reports" element={<PrivateRoute><ComprehensiveReports /></PrivateRoute>} />
              <Route path="/budget" element={<PrivateRoute><Budget /></PrivateRoute>} />
              <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
              <Route path="/subscriptions" element={<PrivateRoute><Subscriptions /></PrivateRoute>} />
              <Route path="/lending" element={<PrivateRoute><Lending /></PrivateRoute>} />
              <Route path="/bills" element={<PrivateRoute><BillReminders /></PrivateRoute>} />
              <Route path="/accounts" element={<PrivateRoute><Accounts /></PrivateRoute>} />
              <Route path="/account-history" element={<PrivateRoute><AccountHistory /></PrivateRoute>} />
              <Route path="/mpesa-calculator" element={<PrivateRoute><MpesaCalculator /></PrivateRoute>} />
              <Route path="/portfolio" element={<PrivateRoute><Portfolio /></PrivateRoute>} />

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
