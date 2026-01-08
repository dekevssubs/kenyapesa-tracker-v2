/**
 * Centralized error handling utility
 * Provides consistent error handling across the application
 */

import { UI } from '../constants'

/**
 * Error types for categorization
 */
export const ERROR_TYPES = {
  NETWORK: 'network',
  AUTH: 'auth',
  VALIDATION: 'validation',
  NOT_FOUND: 'not_found',
  PERMISSION: 'permission',
  SERVER: 'server',
  UNKNOWN: 'unknown',
}

/**
 * User-friendly error messages
 */
const ERROR_MESSAGES = {
  [ERROR_TYPES.NETWORK]: 'Unable to connect. Please check your internet connection.',
  [ERROR_TYPES.AUTH]: 'Your session has expired. Please log in again.',
  [ERROR_TYPES.VALIDATION]: 'Please check your input and try again.',
  [ERROR_TYPES.NOT_FOUND]: 'The requested resource was not found.',
  [ERROR_TYPES.PERMISSION]: 'You do not have permission to perform this action.',
  [ERROR_TYPES.SERVER]: 'Something went wrong on our end. Please try again later.',
  [ERROR_TYPES.UNKNOWN]: 'An unexpected error occurred. Please try again.',
}

/**
 * Categorize an error based on its properties
 */
export function categorizeError(error) {
  // Network errors
  if (error.message?.includes('fetch') || error.message?.includes('network') || !navigator.onLine) {
    return ERROR_TYPES.NETWORK
  }

  // Supabase/API errors
  if (error.code) {
    switch (error.code) {
      case 'PGRST301':
      case '42501':
        return ERROR_TYPES.PERMISSION
      case '23505': // Unique violation
      case '23503': // Foreign key violation
        return ERROR_TYPES.VALIDATION
      case 'PGRST116': // Not found
        return ERROR_TYPES.NOT_FOUND
      case 'invalid_grant':
      case 'invalid_token':
        return ERROR_TYPES.AUTH
      default:
        if (error.code.startsWith('PGRST') || error.code.startsWith('42')) {
          return ERROR_TYPES.SERVER
        }
    }
  }

  // HTTP status based
  if (error.status) {
    if (error.status === 401 || error.status === 403) return ERROR_TYPES.AUTH
    if (error.status === 404) return ERROR_TYPES.NOT_FOUND
    if (error.status === 422 || error.status === 400) return ERROR_TYPES.VALIDATION
    if (error.status >= 500) return ERROR_TYPES.SERVER
  }

  return ERROR_TYPES.UNKNOWN
}

/**
 * Get a user-friendly message for an error
 */
export function getUserMessage(error, fallback) {
  const type = categorizeError(error)

  // Use error's own message if it's user-friendly
  if (error.message && !error.message.includes('Error:') && error.message.length < 100) {
    // Check if it's not a technical message
    const technicalPatterns = ['PGRST', 'fetch', 'undefined', 'null', 'TypeError']
    if (!technicalPatterns.some(p => error.message.includes(p))) {
      return error.message
    }
  }

  return fallback || ERROR_MESSAGES[type] || ERROR_MESSAGES[ERROR_TYPES.UNKNOWN]
}

/**
 * Log error for debugging (dev only or to service)
 */
export function logError(error, context = {}) {
  const errorInfo = {
    message: error.message,
    code: error.code,
    status: error.status,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    url: window.location.href,
  }

  // Always log in development
  if (import.meta.env.DEV) {
    console.error('Error logged:', errorInfo)
  }

  // TODO: Send to error reporting service in production
  // if (import.meta.env.PROD) {
  //   sendToErrorService(errorInfo)
  // }
}

/**
 * Handle an API/service error with consistent behavior
 * Returns { success: false, error: userMessage }
 */
export function handleServiceError(error, context = '', showLog = true) {
  if (showLog) {
    logError(error, { context })
  }

  const userMessage = getUserMessage(error, `Failed to ${context || 'complete action'}`)

  return {
    success: false,
    error: userMessage,
    errorType: categorizeError(error),
  }
}

/**
 * Wrapper for async operations with error handling
 * Usage: const result = await safeAsync(() => someAsyncFn(), 'load data')
 */
export async function safeAsync(asyncFn, context = '') {
  try {
    const result = await asyncFn()
    return { success: true, data: result }
  } catch (error) {
    return handleServiceError(error, context)
  }
}

/**
 * Create a toast-friendly error message
 */
export function toastError(error, prefix = '') {
  const message = getUserMessage(error)
  return prefix ? `${prefix}: ${message}` : message
}

/**
 * Check if error is a specific type
 */
export function isErrorType(error, type) {
  return categorizeError(error) === type
}

/**
 * Check if user should be redirected to login
 */
export function shouldRedirectToLogin(error) {
  return categorizeError(error) === ERROR_TYPES.AUTH
}
