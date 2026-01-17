import { useState, useEffect } from 'react'
import { X, Bell, Calendar, DollarSign, FileText, AlertCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { RenewalReminderService } from '../../utils/renewalReminderService'
import { supabase } from '../../utils/supabase'

export default function CreateRenewalReminderModal({
  isOpen,
  onClose,
  onSuccess,
  prefillData = null // Optional prefill from expense
}) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    title: '',
    renewalDate: '',
    amountExpected: '',
    reminderDays: [5, 3, 2, 1],
    notes: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  // Available reminder day options
  const reminderDayOptions = [
    { value: 7, label: '7 days before' },
    { value: 5, label: '5 days before' },
    { value: 3, label: '3 days before' },
    { value: 2, label: '2 days before' },
    { value: 1, label: '1 day before' }
  ]

  // Prefill form when expense data is provided
  useEffect(() => {
    if (prefillData && isOpen) {
      // Calculate default renewal date (1 month from expense date or today)
      const baseDate = prefillData.date ? new Date(prefillData.date) : new Date()
      baseDate.setMonth(baseDate.getMonth() + 1)
      const defaultRenewalDate = baseDate.toISOString().split('T')[0]

      setFormData({
        title: prefillData.title || prefillData.description || '',
        renewalDate: defaultRenewalDate,
        amountExpected: prefillData.amount?.toString() || '',
        reminderDays: [5, 3, 2, 1],
        notes: ''
      })
    }
  }, [prefillData, isOpen])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        title: '',
        renewalDate: '',
        amountExpected: '',
        reminderDays: [5, 3, 2, 1],
        notes: ''
      })
      setErrors({})
    }
  }, [isOpen])

  const validateForm = () => {
    const newErrors = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }

    if (!formData.renewalDate) {
      newErrors.renewalDate = 'Renewal date is required'
    } else {
      const renewalDate = new Date(formData.renewalDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (renewalDate < today) {
        newErrors.renewalDate = 'Renewal date must be in the future'
      }
    }

    if (!formData.amountExpected || parseFloat(formData.amountExpected) <= 0) {
      newErrors.amountExpected = 'Valid amount is required'
    }

    if (formData.reminderDays.length === 0) {
      newErrors.reminderDays = 'Select at least one reminder day'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleReminderDayToggle = (day) => {
    setFormData(prev => {
      const days = prev.reminderDays.includes(day)
        ? prev.reminderDays.filter(d => d !== day)
        : [...prev.reminderDays, day].sort((a, b) => b - a)
      return { ...prev, reminderDays: days }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      const service = new RenewalReminderService(supabase, user.id)

      const result = await service.createRenewalReminder({
        title: formData.title.trim(),
        renewalDate: formData.renewalDate,
        amountExpected: parseFloat(formData.amountExpected),
        reminderDays: formData.reminderDays,
        notes: formData.notes.trim() || null,
        relatedExpenseId: prefillData?.expenseId || null,
        relatedRecurringId: prefillData?.recurringId || null
      })

      if (result.success) {
        toast.success('Renewal reminder created! You\'ll be reminded before it renews.')
        onSuccess?.(result.data)
        onClose()
      } else {
        toast.error(result.error || 'Failed to create reminder')
      }
    } catch (error) {
      console.error('Error creating renewal reminder:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-slideIn shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <Bell className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Remind Me to Cancel
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Get reminded before this subscription renews
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Subscription Name *
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Netflix, ChatGPT Pro"
                className={`input pl-10 ${errors.title ? 'border-red-500 dark:border-red-500' : ''}`}
              />
            </div>
            {errors.title && (
              <p className="mt-1 text-sm text-red-500 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Renewal Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Renewal Date *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={formData.renewalDate}
                onChange={(e) => setFormData({ ...formData, renewalDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className={`input pl-10 ${errors.renewalDate ? 'border-red-500 dark:border-red-500' : ''}`}
              />
            </div>
            {errors.renewalDate && (
              <p className="mt-1 text-sm text-red-500 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.renewalDate}
              </p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Expected Amount (KES) *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.amountExpected}
                onChange={(e) => setFormData({ ...formData, amountExpected: e.target.value })}
                placeholder="0.00"
                className={`input pl-10 ${errors.amountExpected ? 'border-red-500 dark:border-red-500' : ''}`}
              />
            </div>
            {errors.amountExpected && (
              <p className="mt-1 text-sm text-red-500 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.amountExpected}
              </p>
            )}
          </div>

          {/* Reminder Days */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Remind me... *
            </label>
            <div className="flex flex-wrap gap-2">
              {reminderDayOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleReminderDayToggle(option.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.reminderDays.includes(option.value)
                      ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-2 border-red-400 dark:border-red-600'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-2 border-transparent hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {errors.reminderDays && (
              <p className="mt-1 text-sm text-red-500 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.reminderDays}
              </p>
            )}
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              You&apos;ll receive reminders on these days before the renewal date
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="How to cancel, login details reminder, etc."
              rows={2}
              className="input resize-none"
            />
          </div>

          {/* Info Box */}
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <strong>How it works:</strong> You&apos;ll be reminded before the renewal date.
              If you cancel the subscription, mark it as cancelled. If you forget and it renews,
              you can log it as an expense.
            </p>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn btn-secondary py-3"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 btn btn-primary py-3 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
            >
              {isSubmitting ? 'Creating...' : 'Set Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
