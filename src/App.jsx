import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardLayout from './components/dashboard/DashboardLayout'

// Auth pages
import Login from './components/auth/Login'
import Signup from './components/auth/Signup'

// Dashboard pages
import Dashboard from './pages/Dashboard'
import Income from './pages/Income'
import Expenses from './pages/Expenses'
import Calculator from './pages/Calculator'
import Goals from './pages/Goals'
import Reports from './pages/Reports'
import ComprehensiveReports from './pages/ComprehensiveReports'
import Budget from './pages/Budget'
import Settings from './pages/Settings'
import Subscriptions from './pages/Subscriptions'
import NetWorth from './pages/NetWorth'
import Lending from './pages/Lending'
import BillReminders from './pages/BillReminders'
import Accounts from './pages/Accounts'
import AccountHistory from './pages/AccountHistory'
import SavingsInvestments from './pages/SavingsInvestments'

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

            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Dashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/income"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Income />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/expenses"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Expenses />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/calculator"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Calculator />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/goals"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Goals />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Reports />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/comprehensive"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ComprehensiveReports />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/budget"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Budget />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Settings />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Subscriptions />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/networth"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <NetWorth />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/lending"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Lending />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/bills"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <BillReminders />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounts"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Accounts />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/account-history"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <AccountHistory />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/savings-investments"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SavingsInvestments />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* 404 redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </Router>
  )
}

export default App
