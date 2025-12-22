export const getProgress = (current, target) =>
  Math.min((current / target) * 100, 100)

export const getDaysRemaining = (deadline) => {
  if (!deadline) return null
  const today = new Date().setHours(0,0,0,0)
  const target = new Date(deadline).setHours(0,0,0,0)
  return Math.ceil((target - today) / 86400000)
}

export const getProgressColor = (progress, daysRemaining) => {
  if (daysRemaining < 0) return 'bg-red-600'
  if (progress >= 100) return 'bg-green-500'
  if (progress >= 75) return 'bg-blue-500'
  if (progress >= 50) return 'bg-yellow-500'
  return 'bg-gray-400'
}
