import { useEffect, useState, useRef } from 'react'
import Joyride, { ACTIONS, EVENTS, STATUS } from 'react-joyride'
import { useOnboarding } from '../../contexts/OnboardingContext'
import { useTheme } from '../../contexts/ThemeContext'
import { tourSteps, getAvailableSteps } from '../../content/onboarding/tourSteps'
import TourTooltip from './TourTooltip'
import WelcomeModal from './WelcomeModal'

const HIGHLIGHT_CLASS = 'joyride-target-highlight'

export default function OnboardingTour() {
  const { showTour, tourRunning, handleTourCallback, loading, showWelcomeModal } = useOnboarding()
  const { isDark } = useTheme()
  const [steps, setSteps] = useState([])
  const [mounted, setMounted] = useState(false)
  const currentTargetRef = useRef(null)

  // Wait for DOM to be ready before checking for steps
  useEffect(() => {
    if (showTour) {
      // Small delay to ensure DOM elements are rendered
      const timer = setTimeout(() => {
        const availableSteps = getAvailableSteps()
        const stepsToUse = availableSteps.length > 0 ? availableSteps : tourSteps
        setSteps(stepsToUse)
        setMounted(true)

        // Highlight the first step initially
        if (stepsToUse.length > 0 && stepsToUse[0].target) {
          setTimeout(() => {
            addHighlight(stepsToUse[0].target)
          }, 600)
        }
      }, 500)

      return () => clearTimeout(timer)
    } else {
      // Remove highlight when tour is closed
      removeHighlight()
    }
  }, [showTour])

  // Clean up highlight on unmount
  useEffect(() => {
    return () => removeHighlight()
  }, [])

  const removeHighlight = () => {
    if (currentTargetRef.current) {
      currentTargetRef.current.classList.remove(HIGHLIGHT_CLASS)
      currentTargetRef.current = null
    }
    // Also remove from any element that might have it
    document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach(el => {
      el.classList.remove(HIGHLIGHT_CLASS)
    })
  }

  const addHighlight = (target) => {
    removeHighlight()
    const element = document.querySelector(target)
    if (element) {
      element.classList.add(HIGHLIGHT_CLASS)
      currentTargetRef.current = element

      // Scroll element into view if it's in sidebar
      const sidebar = element.closest('aside') || element.closest('nav[data-tour="sidebar-nav"]')
      if (sidebar) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  // Handle Joyride callback
  const handleCallback = (data) => {
    const { action, index, status, type, step } = data

    // Add highlight to current step target on various events
    if (step?.target) {
      if (type === EVENTS.STEP_BEFORE || type === EVENTS.TOOLTIP || type === EVENTS.STEP_AFTER) {
        // Small delay to ensure element is in DOM
        setTimeout(() => {
          addHighlight(step.target)
        }, 100)
      }
    }

    // Remove highlight and finish when tour ends
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      removeHighlight()
      handleTourCallback({ status, type })
    }

    // Also handle when moving between steps
    if (action === ACTIONS.NEXT || action === ACTIONS.PREV) {
      // Highlight will be updated by the next STEP_BEFORE event
    }

    // Log for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Tour callback:', { action, index, status, type, target: step?.target })
    }
  }

  // Don't render anything while loading
  if (loading) return null

  return (
    <>
      {/* Welcome Modal */}
      <WelcomeModal />

      {/* Joyride Tour - only show when welcome modal is closed */}
      {showTour && mounted && steps.length > 0 && !showWelcomeModal && (
        <Joyride
          callback={handleCallback}
          continuous
          hideCloseButton
          run={tourRunning}
          scrollToFirstStep
          showProgress
          showSkipButton
          steps={steps}
          tooltipComponent={TourTooltip}
          disableOverlayClose
          disableCloseOnEsc
          styles={{
            options: {
              arrowColor: isDark ? '#1f2937' : '#ffffff',
              backgroundColor: isDark ? '#1f2937' : '#ffffff',
              overlayColor: 'rgba(0, 0, 0, 0.5)',
              primaryColor: '#16a34a',
              textColor: isDark ? '#f3f4f6' : '#1f2937',
              zIndex: 10000,
              spotlightShadow: '0 0 15px rgba(0, 0, 0, 0.5)'
            },
            spotlight: {
              borderRadius: 8
            },
            overlay: {
              backgroundColor: 'rgba(0, 0, 0, 0.5)'
            },
            beaconInner: {
              backgroundColor: '#16a34a'
            },
            beaconOuter: {
              backgroundColor: 'rgba(22, 163, 74, 0.2)',
              borderColor: '#16a34a'
            },
            tooltipContainer: {
              textAlign: 'left'
            },
            buttonNext: {
              backgroundColor: '#16a34a'
            },
            buttonBack: {
              color: '#6b7280'
            }
          }}
          spotlightPadding={8}
          scrollOffset={100}
          floaterProps={{
            disableAnimation: true,
            hideArrow: false,
            offset: 15,
            styles: {
              floater: {
                filter: 'drop-shadow(0 25px 25px rgba(0, 0, 0, 0.15))',
                zIndex: 10001
              }
            }
          }}
          locale={{
            back: 'Back',
            close: 'Close',
            last: 'Finish',
            next: 'Next',
            skip: 'Skip tour'
          }}
        />
      )}
    </>
  )
}
