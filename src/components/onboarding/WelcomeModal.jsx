import { X, Rocket, ArrowRight, SkipForward } from 'lucide-react'
import { useOnboarding } from '../../contexts/OnboardingContext'

export default function WelcomeModal() {
  const { showWelcomeModal, startTour, skipOnboarding } = useOnboarding()

  if (!showWelcomeModal) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-slideIn">
        {/* Close button */}
        <button
          onClick={skipOnboarding}
          className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 p-8 text-white">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-white/20 rounded-2xl p-4">
              <Rocket className="h-12 w-12" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center">
            Welcome to KenyaPesa Tracker!
          </h2>
          <p className="text-primary-100 text-center mt-2">
            Your personal finance companion for Kenya
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300 text-center">
              Let us show you around! Take a quick tour to discover all the features that will help you manage your finances.
            </p>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-green-600 dark:text-green-400">✓</span>
                <span className="text-gray-700 dark:text-gray-300">Track Income</span>
              </div>
              <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <span className="text-red-600 dark:text-red-400">✓</span>
                <span className="text-gray-700 dark:text-gray-300">Log Expenses</span>
              </div>
              <div className="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="text-blue-600 dark:text-blue-400">✓</span>
                <span className="text-gray-700 dark:text-gray-300">Set Budgets</span>
              </div>
              <div className="flex items-center space-x-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <span className="text-purple-600 dark:text-purple-400">✓</span>
                <span className="text-gray-700 dark:text-gray-300">Savings Goals</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={startTour}
              className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors"
            >
              <span>Start Tour</span>
              <ArrowRight className="h-5 w-5" />
            </button>
            <button
              onClick={skipOnboarding}
              className="flex items-center justify-center space-x-2 px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium rounded-xl transition-colors"
            >
              <SkipForward className="h-5 w-5" />
              <span>Skip for now</span>
            </button>
          </div>

          <p className="text-xs text-center text-gray-500 dark:text-gray-500">
            You can restart this tour anytime from Settings
          </p>
        </div>
      </div>
    </div>
  )
}
