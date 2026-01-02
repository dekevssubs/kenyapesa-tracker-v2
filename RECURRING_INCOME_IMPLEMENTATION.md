# Recurring Income Implementation Plan

## Overview

Implement recurring income support to allow users to:
- Set up income templates that recur on a schedule (salary, freelance, etc.)
- Automatically or manually create income entries from templates
- Manage recurring income (edit, pause, delete)

## Database Schema (COMPLETED ✅)

Created `022_recurring_income.sql` migration with:

### Table: `recurring_income`

```sql
- id (UUID, PK)
- user_id (UUID, FK to auth.users)
- source (VARCHAR: salary, side_hustle, investment, bonus, gift, other)
- source_name (TEXT: employer name, client, etc.)
- amount (DECIMAL: recurring amount)
- description (TEXT)
- account_id (UUID, FK to accounts)
- frequency (VARCHAR: weekly, biweekly, monthly, quarterly, yearly)
- start_date (DATE)
- end_date (DATE, optional)
- next_date (DATE: next expected income)
- auto_create (BOOLEAN: auto-create income entries)
- auto_create_days_before (INTEGER: 0-30 days)
- last_auto_created_at (TIMESTAMPTZ)
- is_gross (BOOLEAN: for salary deductions)
- gross_salary (DECIMAL)
- statutory_deductions (DECIMAL)
- tax_amount (DECIMAL)
- is_active (BOOLEAN)
- created_at, updated_at (TIMESTAMPTZ)
```

### Indexes Created

- user_id
- next_date
- is_active
- user_id + is_active + next_date (composite)
- user_id + is_active + auto_create + next_date (for auto-creation queries)

### RLS Policies

- Users can only see/edit their own recurring income

---

## UI Implementation

### 1. Add View Toggle (Tabs)

**Location:** Top of Income page, after summary stats

```jsx
const [activeView, setActiveView] = useState('all') // 'all' | 'recurring'

<div className="flex space-x-2 mb-4">
  <button
    onClick={() => setActiveView('all')}
    className={`px-4 py-2 rounded-lg ${
      activeView === 'all'
        ? 'bg-blue-500 text-white'
        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
    }`}
  >
    All Income
  </button>
  <button
    onClick={() => setActiveView('recurring')}
    className={`px-4 py-2 rounded-lg ${
      activeView === 'recurring'
        ? 'bg-blue-500 text-white'
        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
    }`}
  >
    Recurring Income
  </button>
</div>
```

---

### 2. Recurring Income State Management

**Add to useState hooks:**

```jsx
const [recurringIncomes, setRecurringIncomes] = useState([])
const [showRecurringModal, setShowRecurringModal] = useState(false)
const [editingRecurring, setEditingRecurring] = useState(null)
const [recurringFormData, setRecurringFormData] = useState({
  source: 'salary',
  source_name: '',
  amount: '',
  description: '',
  account_id: '',
  frequency: 'monthly',
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  auto_create: false,
  auto_create_days_before: 0,
  is_gross: false,
  gross_salary: '',
  statutory_deductions: '',
  tax_amount: ''
})
```

---

### 3. Fetch Recurring Income

**Add to useEffect or create new function:**

```jsx
const fetchRecurringIncome = async () => {
  try {
    const { data, error } = await supabase
      .from('recurring_income')
      .select(`
        *,
        account:accounts(name, account_type)
      `)
      .eq('user_id', user.id)
      .order('next_date', { ascending: true })

    if (error) throw error
    setRecurringIncomes(data || [])
  } catch (error) {
    console.error('Error fetching recurring income:', error)
  }
}

// Call in useEffect
useEffect(() => {
  if (user) {
    fetchIncomes()
    fetchAccounts()
    fetchRecurringIncome() // ADD THIS
  }
}, [user])
```

---

### 4. Recurring Income List UI

**Render when `activeView === 'recurring'`:**

```jsx
{activeView === 'recurring' && (
  <div className="space-y-4">
    {/* Header */}
    <div className="flex justify-between items-center">
      <h3 className="text-lg font-semibold">Recurring Income Templates</h3>
      <button
        onClick={() => {
          setEditingRecurring(null)
          setRecurringFormData({
            source: 'salary',
            source_name: '',
            amount: '',
            description: '',
            account_id: accounts.find(a => a.is_primary)?.id || '',
            frequency: 'monthly',
            start_date: new Date().toISOString().split('T')[0],
            end_date: '',
            auto_create: false,
            auto_create_days_before: 0,
            is_gross: false,
            gross_salary: '',
            statutory_deductions: '',
            tax_amount: ''
          })
          setShowRecurringModal(true)
        }}
        className="btn btn-primary"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Recurring Income
      </button>
    </div>

    {/* Recurring Income Cards */}
    {recurringIncomes.length === 0 ? (
      <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">
          No recurring income set up yet.
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
          Add salary, freelance, or other regular income to track automatically.
        </p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recurringIncomes.map(recurring => (
          <RecurringIncomeCard
            key={recurring.id}
            recurring={recurring}
            onEdit={handleEditRecurring}
            onDelete={handleDeleteRecurring}
            onCreate={handleCreateFromTemplate}
            onToggleActive={handleToggleRecurringActive}
          />
        ))}
      </div>
    )}
  </div>
)}
```

---

### 5. Recurring Income Card Component

**Add as a component within Income.jsx or separate file:**

```jsx
function RecurringIncomeCard({ recurring, onEdit, onDelete, onCreate, onToggleActive }) {
  const isOverdue = new Date(recurring.next_date) < new Date()
  const Icon = getIncomeIcon(recurring.source)

  return (
    <div className={`card p-4 ${!recurring.is_active ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <Icon className="h-5 w-5 text-blue-500 mr-2" />
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
              {recurring.source_name || formatSource(recurring.source)}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {recurring.frequency}
            </p>
          </div>
        </div>
        {!recurring.is_active && (
          <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
            Paused
          </span>
        )}
      </div>

      {/* Amount */}
      <p className="text-2xl font-bold text-green-600 dark:text-green-400 mb-3">
        {formatCurrency(recurring.amount)}
      </p>

      {/* Next Date */}
      <div className="flex items-center text-sm mb-3">
        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
        <span className={isOverdue ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}>
          Next: {new Date(recurring.next_date).toLocaleDateString()}
        </span>
      </div>

      {/* Account */}
      <div className="flex items-center text-sm mb-4">
        <Wallet className="h-4 w-4 mr-2 text-gray-400" />
        <span className="text-gray-600 dark:text-gray-400">
          {recurring.account?.name}
        </span>
      </div>

      {/* Auto-create badge */}
      {recurring.auto_create && (
        <div className="flex items-center text-xs text-blue-600 dark:text-blue-400 mb-3">
          <CheckCircle className="h-3 w-3 mr-1" />
          Auto-create enabled
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onCreate(recurring)}
          className="btn btn-sm btn-primary"
          disabled={!recurring.is_active}
        >
          Create Now
        </button>
        <button
          onClick={() => onEdit(recurring)}
          className="btn btn-sm btn-secondary"
        >
          Edit
        </button>
      </div>

      {/* More Actions */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        <button
          onClick={() => onToggleActive(recurring)}
          className="btn btn-sm btn-ghost"
        >
          {recurring.is_active ? 'Pause' : 'Resume'}
        </button>
        <button
          onClick={() => onDelete(recurring)}
          className="btn btn-sm btn-ghost text-red-500"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
```

---

### 6. Recurring Income Modal

**Add modal for creating/editing recurring income:**

Similar structure to existing income modal but with additional fields:
- Frequency dropdown (weekly, biweekly, monthly, quarterly, yearly)
- Start date
- End date (optional)
- Auto-create checkbox
- Auto-create days before (if auto-create enabled)

```jsx
{showRecurringModal && (
  <div className="modal-overlay">
    <div className="modal-content">
      <div className="modal-header">
        <h3>{editingRecurring ? 'Edit Recurring Income' : 'Add Recurring Income'}</h3>
        <button onClick={() => setShowRecurringModal(false)}>
          <X className="h-6 w-6" />
        </button>
      </div>

      <form onSubmit={handleRecurringSubmit}>
        {/* Source */}
        <div>
          <label>Income Type</label>
          <select
            value={recurringFormData.source}
            onChange={(e) => setRecurringFormData({...recurringFormData, source: e.target.value})}
            required
          >
            <option value="salary">Salary</option>
            <option value="side_hustle">Side Hustle</option>
            <option value="investment">Investment</option>
            <option value="bonus">Bonus</option>
            <option value="gift">Gift</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Source Name */}
        <div>
          <label>Source Name (Employer, Client, etc.)</label>
          <input
            type="text"
            value={recurringFormData.source_name}
            onChange={(e) => setRecurringFormData({...recurringFormData, source_name: e.target.value})}
            placeholder="e.g., ABC Company, Freelance Client"
          />
        </div>

        {/* Amount */}
        <div>
          <label>Amount</label>
          <input
            type="number"
            step="0.01"
            value={recurringFormData.amount}
            onChange={(e) => setRecurringFormData({...recurringFormData, amount: e.target.value})}
            required
          />
        </div>

        {/* Frequency */}
        <div>
          <label>Frequency</label>
          <select
            value={recurringFormData.frequency}
            onChange={(e) => setRecurringFormData({...recurringFormData, frequency: e.target.value})}
            required
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label>Start Date</label>
          <input
            type="date"
            value={recurringFormData.start_date}
            onChange={(e) => setRecurringFormData({...recurringFormData, start_date: e.target.value})}
            required
          />
        </div>

        {/* End Date (Optional) */}
        <div>
          <label>End Date (Optional)</label>
          <input
            type="date"
            value={recurringFormData.end_date}
            onChange={(e) => setRecurringFormData({...recurringFormData, end_date: e.target.value})}
          />
        </div>

        {/* Account */}
        <div>
          <label>Account</label>
          <select
            value={recurringFormData.account_id}
            onChange={(e) => setRecurringFormData({...recurringFormData, account_id: e.target.value})}
            required
          >
            <option value="">Select account...</option>
            {accounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.account_type})
              </option>
            ))}
          </select>
        </div>

        {/* Auto-create */}
        <div>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={recurringFormData.auto_create}
              onChange={(e) => setRecurringFormData({...recurringFormData, auto_create: e.target.checked})}
              className="mr-2"
            />
            Automatically create income entry
          </label>
          {recurringFormData.auto_create && (
            <div className="mt-2">
              <label className="text-sm">Create how many days before?</label>
              <input
                type="number"
                min="0"
                max="30"
                value={recurringFormData.auto_create_days_before}
                onChange={(e) => setRecurringFormData({...recurringFormData, auto_create_days_before: parseInt(e.target.value)})}
                className="input w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                0 = on the day, 1 = day before, etc.
              </p>
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label>Description (Optional)</label>
          <textarea
            value={recurringFormData.description}
            onChange={(e) => setRecurringFormData({...recurringFormData, description: e.target.value})}
            rows="3"
          />
        </div>

        {/* Submit buttons */}
        <div className="flex justify-end space-x-2 mt-4">
          <button
            type="button"
            onClick={() => setShowRecurringModal(false)}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
          >
            {editingRecurring ? 'Update' : 'Create'} Recurring Income
          </button>
        </div>
      </form>
    </div>
  </div>
)}
```

---

## Service Methods (incomeService.js)

Add to `src/utils/incomeService.js`:

### 1. Get All Recurring Income

```javascript
async getAllRecurringIncome() {
  try {
    const { data, error } = await this.supabase
      .from('recurring_income')
      .select(`
        *,
        account:accounts(id, name, account_type)
      `)
      .eq('user_id', this.userId)
      .order('next_date', { ascending: true })

    if (error) throw error

    return {
      success: true,
      recurringIncomes: data || []
    }
  } catch (error) {
    console.error('Error fetching recurring income:', error)
    return {
      success: false,
      error: error.message,
      recurringIncomes: []
    }
  }
}
```

### 2. Create Recurring Income

```javascript
async createRecurringIncome(recurringData) {
  try {
    const { data, error } = await this.supabase
      .from('recurring_income')
      .insert({
        user_id: this.userId,
        ...recurringData,
        next_date: this.calculateNextDate(recurringData.start_date, recurringData.frequency)
      })
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      recurringIncome: data
    }
  } catch (error) {
    console.error('Error creating recurring income:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
```

### 3. Update Recurring Income

```javascript
async updateRecurringIncome(id, updates) {
  try {
    const { data, error } = await this.supabase
      .from('recurring_income')
      .update(updates)
      .eq('id', id)
      .eq('user_id', this.userId)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      recurringIncome: data
    }
  } catch (error) {
    console.error('Error updating recurring income:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
```

### 4. Delete Recurring Income

```javascript
async deleteRecurringIncome(id) {
  try {
    const { error } = await this.supabase
      .from('recurring_income')
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error deleting recurring income:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
```

### 5. Create Income from Template

```javascript
async createIncomeFromRecurring(recurringId) {
  try {
    // Get recurring income template
    const { data: recurring, error: fetchError } = await this.supabase
      .from('recurring_income')
      .select('*')
      .eq('id', recurringId)
      .eq('user_id', this.userId)
      .single()

    if (fetchError) throw fetchError

    // Create income entry
    const result = await this.recordIncome({
      amount: recurring.amount,
      source: recurring.source,
      source_name: recurring.source_name,
      description: recurring.description || `Recurring ${recurring.source}`,
      date: new Date().toISOString().split('T')[0],
      account_id: recurring.account_id,
      is_gross: recurring.is_gross,
      gross_salary: recurring.gross_salary,
      statutory_deductions: recurring.statutory_deductions,
      tax_amount: recurring.tax_amount
    })

    if (!result.success) throw new Error(result.error)

    // Update next_date in recurring_income
    const nextDate = this.calculateNextDate(recurring.next_date, recurring.frequency)
    await this.supabase
      .from('recurring_income')
      .update({
        next_date: nextDate,
        last_auto_created_at: new Date().toISOString()
      })
      .eq('id', recurringId)

    return {
      success: true,
      incomeId: result.incomeId
    }
  } catch (error) {
    console.error('Error creating income from recurring:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
```

### 6. Calculate Next Date Helper

```javascript
calculateNextDate(currentDate, frequency) {
  const date = new Date(currentDate)

  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7)
      break
    case 'biweekly':
      date.setDate(date.getDate() + 14)
      break
    case 'monthly':
      date.setMonth(date.getMonth() + 1)
      break
    case 'quarterly':
      date.setMonth(date.getMonth() + 3)
      break
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1)
      break
  }

  return date.toISOString().split('T')[0]
}
```

### 7. Toggle Active Status

```javascript
async toggleRecurringActive(id, isActive) {
  try {
    const { error } = await this.supabase
      .from('recurring_income')
      .update({ is_active: !isActive })
      .eq('id', id)
      .eq('user_id', this.userId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error toggling recurring income:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
```

---

## Event Handlers (Income.jsx)

Add these handlers to Income.jsx:

```javascript
const handleRecurringSubmit = async (e) => {
  e.preventDefault()

  const incomeService = new IncomeService(supabase, user.id)

  if (editingRecurring) {
    // Update existing recurring income
    const result = await incomeService.updateRecurringIncome(
      editingRecurring.id,
      recurringFormData
    )

    if (result.success) {
      toast.success('Recurring income updated successfully')
      setShowRecurringModal(false)
      fetchRecurringIncome()
    } else {
      toast.error(result.error)
    }
  } else {
    // Create new recurring income
    const result = await incomeService.createRecurringIncome(recurringFormData)

    if (result.success) {
      toast.success('Recurring income created successfully')
      setShowRecurringModal(false)
      fetchRecurringIncome()
    } else {
      toast.error(result.error)
    }
  }
}

const handleEditRecurring = (recurring) => {
  setEditingRecurring(recurring)
  setRecurringFormData({
    source: recurring.source,
    source_name: recurring.source_name || '',
    amount: recurring.amount.toString(),
    description: recurring.description || '',
    account_id: recurring.account_id,
    frequency: recurring.frequency,
    start_date: recurring.start_date,
    end_date: recurring.end_date || '',
    auto_create: recurring.auto_create,
    auto_create_days_before: recurring.auto_create_days_before || 0,
    is_gross: recurring.is_gross || false,
    gross_salary: recurring.gross_salary?.toString() || '',
    statutory_deductions: recurring.statutory_deductions?.toString() || '',
    tax_amount: recurring.tax_amount?.toString() || ''
  })
  setShowRecurringModal(true)
}

const handleDeleteRecurring = async (recurring) => {
  if (!confirm(`Delete recurring income "${recurring.source_name || recurring.source}"?`)) {
    return
  }

  const incomeService = new IncomeService(supabase, user.id)
  const result = await incomeService.deleteRecurringIncome(recurring.id)

  if (result.success) {
    toast.success('Recurring income deleted')
    fetchRecurringIncome()
  } else {
    toast.error(result.error)
  }
}

const handleCreateFromTemplate = async (recurring) => {
  const incomeService = new IncomeService(supabase, user.id)
  const result = await incomeService.createIncomeFromRecurring(recurring.id)

  if (result.success) {
    toast.success('Income created from template')
    fetchIncomes()
    fetchRecurringIncome()
  } else {
    toast.error(result.error)
  }
}

const handleToggleRecurringActive = async (recurring) => {
  const incomeService = new IncomeService(supabase, user.id)
  const result = await incomeService.toggleRecurringActive(recurring.id, recurring.is_active)

  if (result.success) {
    toast.success(recurring.is_active ? 'Recurring income paused' : 'Recurring income resumed')
    fetchRecurringIncome()
  } else {
    toast.error(result.error)
  }
}
```

---

## Testing Checklist

- [ ] Migration applies successfully
- [ ] Can create recurring income template
- [ ] Can view list of recurring income
- [ ] Can edit recurring income
- [ ] Can delete recurring income
- [ ] Can toggle active/paused status
- [ ] Can manually create income from template
- [ ] Next date calculates correctly for all frequencies
- [ ] Auto-create flag saves correctly
- [ ] Salary with deductions works in recurring template
- [ ] Recurring income shows on correct tab
- [ ] UI is responsive and user-friendly

---

## Future Enhancements (Optional)

1. **Auto-Creation Background Job**
   - Cron job or Supabase function to auto-create income entries
   - Check `auto_create = true` and `next_date <= CURRENT_DATE`
   - Create income and update `next_date`

2. **Notification Before Income Due**
   - Send reminder X days before recurring income is expected
   - "Your monthly salary is due in 3 days"

3. **Income History from Recurring**
   - Show which income entries were created from which template
   - Add `recurring_income_id` FK to `income` table

4. **Smart Date Suggestions**
   - "Your last 3 salaries were on the 25th - set as recurring?"

---

**Status:** Schema complete, UI implementation pending
**Next Step:** Add UI components to Income.jsx
