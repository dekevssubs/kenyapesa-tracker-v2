import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import { useAuth } from "../contexts/AuthContext";
import GoalsList from "../components/goals/GoalsList";
import GoalFormModal from "../components/goals/GoalFormModal";

export default function Goals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [addMoneyGoal, setAddMoneyGoal] = useState(null);
  const [addMoneyAmount, setAddMoneyAmount] = useState("");

  const fetchGoals = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("savings_goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching goals:", error);
    }
    setGoals(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchGoals();
  }, [user]);

  const handleAddMoney = async (e) => {
    e.preventDefault();
    if (!addMoneyGoal || !addMoneyAmount) return;

    const newAmount = addMoneyGoal.current_amount + Number(addMoneyAmount);

    const { error } = await supabase
      .from("savings_goals")
      .update({ current_amount: newAmount })
      .eq("id", addMoneyGoal.id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error adding money:", error);
      alert("Failed to add money to goal");
    } else {
      setAddMoneyGoal(null);
      setAddMoneyAmount("");
      fetchGoals();
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this goal?")) return;

    const { error } = await supabase
      .from("savings_goals")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting goal:", error);
      alert("Failed to delete goal");
    } else {
      fetchGoals();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kenya-green"></div>
      </div>
    );
  }

  return (
    <>
      {/* Add Goal Button */}
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setShowModal(true)}
          className="bg-kenya-green text-white px-4 py-2 rounded-lg shadow hover:bg-green-700"
        >
          + New Goal
        </button>
      </div>

      {/* Goals List */}
      <GoalsList
        goals={goals}
        onAddMoney={(goal) => setAddMoneyGoal(goal)}
        onEdit={(goal) => setEditingGoal(goal)}
        onDelete={(id) => handleDelete(id)}
      />

      {/* Add New Goal Modal */}
      {showModal && (
        <GoalFormModal
          user={user}
          onClose={() => setShowModal(false)}
          onSuccess={fetchGoals}
        />
      )}

      {/* Edit Goal Modal */}
      {editingGoal && (
        <GoalFormModal
          user={user}
          goal={editingGoal}
          onClose={() => setEditingGoal(null)}
          onSuccess={fetchGoals}
        />
      )}

      {/* Add Money Modal */}
      {addMoneyGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-4">
              Add Money to "{addMoneyGoal.goal_name}"
            </h2>
            <p className="text-gray-500 mb-4">
              Current: KES {addMoneyGoal.current_amount?.toLocaleString()} / KES {addMoneyGoal.target_amount?.toLocaleString()}
            </p>
            <form onSubmit={handleAddMoney} className="space-y-4">
              <input
                type="number"
                placeholder="Amount to add"
                value={addMoneyAmount}
                onChange={(e) => setAddMoneyAmount(e.target.value)}
                min="1"
                required
                className="w-full border rounded-lg px-4 py-2"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAddMoneyGoal(null);
                    setAddMoneyAmount("");
                  }}
                  className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-kenya-green text-white py-2 rounded-lg hover:bg-green-700"
                >
                  Add Money
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
