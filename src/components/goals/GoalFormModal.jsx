import { useState } from "react"
import { X } from "lucide-react"
import { supabase } from "../../utils/supabase"
import GoalRecurringSetup from "./GoalRecurringSetup"

export default function GoalFormModal({
  user,
  goal = null,
  onClose = () => {},
  onSuccess = () => {}
}) {
  const isEditing = !!goal

  const [name, setName] = useState(goal?.goal_name || "")
  const [targetAmount, setTargetAmount] = useState(goal?.target_amount?.toString() || "")
  const [currentAmount, setCurrentAmount] = useState(goal?.current_amount?.toString() || "")
  const [targetDate, setTargetDate] = useState(goal?.deadline || "")
  const [saving, setSaving] = useState(false)

  const [recurring, setRecurring] = useState({
    enabled: false,
    amount: "",
    frequency: "monthly"
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (saving) return

    setSaving(true)

    try {
      const goalData = {
        goal_name: name,
        target_amount: Number(targetAmount),
        current_amount: Number(currentAmount || 0),
        deadline: targetDate || null
      }

      let error

      if (isEditing) {
        const result = await supabase
          .from("savings_goals")
          .update(goalData)
          .eq("id", goal.id)
          .eq("user_id", user.id)
        error = result.error
      } else {
        const result = await supabase
          .from("savings_goals")
          .insert([{ ...goalData, user_id: user.id }])
        error = result.error
      }

      if (error) throw error

      onSuccess()
      onClose()
    } catch (err) {
      console.error("Error saving goal:", err)
      alert("Failed to save goal")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-semibold mb-6">{isEditing ? "Edit Goal" : "New Goal"}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Goal name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border rounded-lg px-4 py-2"
          />

          <input
            type="number"
            placeholder="Target amount"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            required
            className="w-full border rounded-lg px-4 py-2"
          />

          <input
            type="number"
            placeholder="Starting amount"
            value={currentAmount}
            onChange={(e) => setCurrentAmount(e.target.value)}
            className="w-full border rounded-lg px-4 py-2"
          />

          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            required
            className="w-full border rounded-lg px-4 py-2"
          />

          {/* ✅ SAFE recurring setup */}
          <GoalRecurringSetup
            recurring={recurring}
            onChange={setRecurring}
          />

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-kenya-green text-white py-2 rounded-lg disabled:opacity-50"
          >
            {saving ? "Saving..." : (isEditing ? "Update Goal" : "Save Goal")}
          </button>
        </form>
      </div>
    </div>
  )
}
