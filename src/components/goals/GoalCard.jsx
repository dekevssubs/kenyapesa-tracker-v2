import { Plus, Edit2, Trash2, Calendar } from 'lucide-react'
import { formatCurrency } from '../../utils/calculations'
import {
  getProgress,
  getDaysRemaining
} from './goals.helpers'

export default function GoalCard({ goal, onAddMoney, onEdit, onDelete }) {
  const progress = getProgress(goal.current_amount, goal.target_amount)
  const daysRemaining = getDaysRemaining(goal.deadline)

  return (
    <div className="bg-white rounded-2xl border p-6 shadow-sm hover:shadow-md transition">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold">{goal.goal_name}</h3>

          {goal.deadline && (
            <div className="flex items-center text-sm text-gray-500 mt-1">
              <Calendar className="h-4 w-4 mr-2" />
              {daysRemaining > 0
                ? `${daysRemaining} days remaining`
                : daysRemaining === 0
                ? 'Due today'
                : `${Math.abs(daysRemaining)} days overdue`}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onAddMoney(goal)}
            className="p-2 rounded-lg hover:bg-gray-100"
            title="Add money"
          >
            <Plus size={18} />
          </button>

          <button
            onClick={() => onEdit(goal)}
            className="p-2 rounded-lg hover:bg-gray-100"
            title="Edit goal"
          >
            <Edit2 size={18} />
          </button>

          <button
            onClick={() => onDelete(goal.id)}
            className="p-2 rounded-lg hover:bg-red-50 text-red-500"
            title="Delete goal"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-5">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500">Progress</span>
          <span className="font-semibold">{progress.toFixed(1)}%</span>
        </div>

        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Amounts */}
      <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
        <div>
          <p className="text-sm text-gray-500">Saved</p>
          <p className="text-lg font-bold text-green-600">
            {formatCurrency(goal.current_amount)}
          </p>
        </div>

        <div className="text-right">
          <p className="text-sm text-gray-500">Target</p>
          <p className="text-lg font-bold">
            {formatCurrency(goal.target_amount)}
          </p>
        </div>
      </div>
    </div>
  )
}
