export default function GoalRecurringSetup({
  recurring = { enabled: false },
  onChange = () => {}
}) {
  const enabled = recurring?.enabled ?? false

  return (
    <div className="mt-4 border-t pt-4">
      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) =>
            onChange({
              ...recurring,
              enabled: e.target.checked
            })
          }
        />
        <span className="text-sm font-medium text-gray-700">
          Add recurring savings
        </span>
      </label>

      {enabled && (
        <div className="mt-4 space-y-3">
          <input
            type="number"
            placeholder="Recurring amount"
            value={recurring.amount}
            onChange={(e) =>
              onChange({
                ...recurring,
                amount: e.target.value
              })
            }
            className="w-full border rounded-lg px-4 py-2"
          />

          <select
            value={recurring.frequency}
            onChange={(e) =>
              onChange({
                ...recurring,
                frequency: e.target.value
              })
            }
            className="w-full border rounded-lg px-4 py-2"
          >
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      )}
    </div>
  )
}
