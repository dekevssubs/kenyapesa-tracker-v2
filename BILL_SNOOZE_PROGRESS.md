# Bill Reminder Snooze - Implementation Progress

## Status: In Progress (70% Complete)

### ✅ Completed

1. **Database Schema** - `023_bill_reminders_snooze.sql`
   - Added `snoozed_until TIMESTAMPTZ` column
   - Added index for efficient querying
   - Auto-unsnooze logic (WHERE snoozed_until IS NULL OR snoozed_until <= NOW())

2. **UI State Management** - BillReminders.jsx
   - Added BellOff icon import
   - Added snooze modal state variables:
     - `showSnoozeModal`
     - `snoozingBill`
     - `snoozeOption` ('1day', '3days', '1week', 'custom')
     - `customSnoozeDate`

### ⏳ Remaining Tasks

1. **Snooze Handler Function**
   - Calculate snooze date based on option
   - Update bill_reminders.snoozed_until
   - Refresh bill list

2. **UI Components**
   - Add snooze button to each bill card
   - Create snooze modal with preset options
   - Show snoozed bills differently (optional)

3. **Testing**
   - Apply migration
   - Test snooze with different durations
   - Verify auto-unsnooze works

### Quick Implementation Guide

**Snooze Handler (add to BillReminders.jsx):**
```javascript
const handleSnoozeBill = async () => {
  if (!snoozingBill) return

  let snoozeUntil = new Date()

  switch (snoozeOption) {
    case '1day':
      snoozeUntil.setDate(snoozeUntil.getDate() + 1)
      break
    case '3days':
      snoozeUntil.setDate(snoozeUntil.getDate() + 3)
      break
    case '1week':
      snoozeUntil.setDate(snoozeUntil.getDate() + 7)
      break
    case 'custom':
      if (!customSnoozeDate) {
        toast.error('Please select a date')
        return
      }
      snoozeUntil = new Date(customSnoozeDate)
      break
  }

  try {
    const { error } = await supabase
      .from('bill_reminders')
      .update({ snoozed_until: snoozeUntil.toISOString() })
      .eq('id', snoozingBill.id)

    if (error) throw error

    toast.success(`Bill snoozed until ${snoozeUntil.toLocaleDateString()}`)
    setShowSnoozeModal(false)
    setSnoozingBill(null)
    setSnoozeOption('1day')
    setCustomSnoozeDate('')
    fetchBills()
  } catch (error) {
    toast.error(`Error: ${error.message}`)
  }
}
```

**Update fetchBills to filter snoozed (optional - can show all with badge):**
```javascript
const { data, error } = await supabase
  .from('bill_reminders')
  .select('*')
  .eq('user_id', user.id)
  .eq('is_active', true)
  .or('snoozed_until.is.null,snoozed_until.lte.now()')
  .order('due_date', { ascending: true })
```

**Snooze Button (add to bill card actions):**
```javascript
<button
  onClick={() => {
    setSnoozingBill(bill)
    setSnoozeOption('1day')
    setCustomSnoozeDate('')
    setShowSnoozeModal(true)
  }}
  className="btn btn-sm btn-ghost flex items-center"
>
  <BellOff className="h-4 w-4 mr-1" />
  Snooze
</button>
```

**Snooze Modal (add before closing tag):**
```javascript
{showSnoozeModal && snoozingBill && (
  <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
    <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold flex items-center">
          <BellOff className="h-5 w-5 mr-2" />
          Snooze Reminder
        </h3>
        <button onClick={() => setShowSnoozeModal(false)}>
          <X className="h-5 w-5" />
        </button>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Snooze "{snoozingBill.bill_name}" reminder until:
      </p>

      <div className="space-y-3 mb-6">
        {[
          { value: '1day', label: 'Tomorrow' },
          { value: '3days', label: 'In 3 days' },
          { value: '1week', label: 'In 1 week' },
          { value: 'custom', label: 'Custom date' }
        ].map(option => (
          <label key={option.value} className="flex items-center cursor-pointer">
            <input
              type="radio"
              value={option.value}
              checked={snoozeOption === option.value}
              onChange={(e) => setSnoozeOption(e.target.value)}
              className="mr-3"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>

      {snoozeOption === 'custom' && (
        <div className="mb-6">
          <label className="label">Select Date</label>
          <input
            type="date"
            className="input"
            value={customSnoozeDate}
            onChange={(e) => setCustomSnoozeDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
      )}

      <div className="flex space-x-3">
        <button
          onClick={() => setShowSnoozeModal(false)}
          className="flex-1 btn btn-secondary"
        >
          Cancel
        </button>
        <button
          onClick={handleSnoozeBill}
          className="flex-1 btn btn-primary"
        >
          Snooze
        </button>
      </div>
    </div>
  </div>
)}
```

### Files to Modify
- `supabase/migrations/023_bill_reminders_snooze.sql` ✅ Complete
- `src/pages/BillReminders.jsx` ⏳ Partially complete (state added, handler & UI pending)

### Estimated Time to Complete
**15-20 minutes** - Add handler function, snooze button, and modal

