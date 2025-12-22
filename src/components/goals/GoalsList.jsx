import GoalCard from "./GoalCard";

export default function GoalsList({ goals, onAddMoney, onEdit, onDelete }) {
  if (!goals || goals.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 text-lg">
          No goals yet. Create one to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {goals.map((goal) => (
        <GoalCard
          key={goal.id}
          goal={goal}
          onAddMoney={() => onAddMoney?.(goal)}
          onEdit={() => onEdit?.(goal)}
          onDelete={() => onDelete?.(goal.id)}
        />
      ))}
    </div>
  );
}
