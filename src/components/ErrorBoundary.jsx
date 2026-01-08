import { Component } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

/**
 * ErrorBoundary - Catches JavaScript errors in child components
 * Displays a fallback UI instead of crashing the whole app
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    // TODO: Send to error reporting service (e.g., Sentry)
    // logErrorToService(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.href = '/dashboard'
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center">
            {/* Icon */}
            <div className="mx-auto w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
              Something went wrong
            </h2>

            {/* Description */}
            <p className="text-[var(--text-secondary)] mb-6">
              {this.props.message || "We're sorry, but something unexpected happened. Please try again."}
            </p>

            {/* Error details in dev mode */}
            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 p-4 bg-[var(--bg-tertiary)] rounded-xl text-left overflow-auto max-h-32">
                <p className="text-xs font-mono text-red-500 break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="btn btn-primary flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                className="btn btn-secondary flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Go Home
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Wrapper for smaller sections that shouldn't crash the whole page
 */
export function SectionErrorBoundary({ children, sectionName = 'section' }) {
  return (
    <ErrorBoundary
      message={`Failed to load ${sectionName}. This section encountered an error.`}
      fallback={
        <div className="p-6 bg-[var(--bg-tertiary)] rounded-xl text-center">
          <AlertTriangle className="h-6 w-6 text-amber-500 mx-auto mb-2" />
          <p className="text-sm text-[var(--text-secondary)]">
            Failed to load {sectionName}
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
