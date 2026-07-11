import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Calendar, BookOpen, Clock, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDiscipleshipPlans, deleteDiscipleshipPlan } from './discipleshipService';
import DiscipleshipPlanFormModal from './DiscipleshipPlanFormModal';
import DiscipleshipImportModal from './DiscipleshipImportModal';

export default function DiscipleshipPlans() {
  const { userProfile } = useAuth();
  const CHURCH_ID = userProfile?.churchId || 'YmEc6C69Xz4DKRQaQZBV';
  
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  const fetchPlans = async () => {
    if (!CHURCH_ID) return;
    setLoading(true);
    try {
      const data = await getDiscipleshipPlans(CHURCH_ID);
      setPlans(data);
    } catch (error) {
      console.error("Error fetching discipleship plans:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [CHURCH_ID]);

  const handleAddClick = () => {
    setEditingPlan(null);
    setIsFormModalOpen(true);
  };

  const handleImportClick = () => {
    setIsImportModalOpen(true);
  };

  const handleEditClick = (plan) => {
    setEditingPlan(plan);
    setIsFormModalOpen(true);
  };

  const handleDeleteClick = async (id, title) => {
    if (window.confirm(`Are you sure you want to delete the plan "${title}"? This will also delete all associated weeks.`)) {
      try {
        await deleteDiscipleshipPlan(CHURCH_ID, id);
        fetchPlans(); // refresh
      } catch (error) {
        console.error("Error deleting plan:", error);
        alert("Failed to delete plan.");
      }
    }
  };

  if (!activeChurchId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Please select a church to view discipleship plans.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-church-navy">Discipleship Plans</h1>
          <p className="text-gray-500 mt-1">Manage weekly discipleship study plans</p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-2">
          <button
            onClick={handleImportClick}
            className="flex items-center bg-white border border-gray-300 text-church-navy px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors font-medium shadow-sm"
          >
            <Upload size={18} className="mr-2" />
            Import JSON
          </button>
          <button
            onClick={handleAddClick}
            className="flex items-center bg-church-green text-white px-4 py-2 rounded-xl hover:bg-church-green-dark transition-colors font-medium shadow-sm"
          >
            <Plus size={18} className="mr-2" />
            New Plan
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-church-green border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-church-soft p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen size={32} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-church-navy mb-2">No Discipleship Plans</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Create a new weekly study plan to help members grow in their faith.
          </p>
          <button
            onClick={handleAddClick}
            className="inline-flex items-center bg-church-green text-white px-6 py-2.5 rounded-xl hover:bg-church-green-dark transition-colors font-medium shadow-sm"
          >
            <Plus size={18} className="mr-2" />
            Create First Plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-2xl shadow-church-soft overflow-hidden border border-gray-100 flex flex-col">
              {plan.coverImageUrl ? (
                <div className="h-40 w-full relative">
                  <img src={plan.coverImageUrl} alt={plan.title} className="w-full h-full object-cover" />
                  <div className="absolute top-3 right-3 flex flex-col gap-2">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                      plan.status === 'published' ? 'bg-green-100 text-green-700' :
                      plan.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {plan.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-40 w-full bg-gradient-to-br from-church-green/20 to-blue-50 relative flex items-center justify-center">
                  <BookOpen size={48} className="text-church-green/40" />
                  <div className="absolute top-3 right-3 flex flex-col gap-2">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                      plan.status === 'published' ? 'bg-green-100 text-green-700' :
                      plan.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {plan.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-lg font-bold text-church-navy mb-1 line-clamp-1">{plan.title}</h3>
                {plan.subtitle && <p className="text-sm text-gray-500 mb-3 line-clamp-1">{plan.subtitle}</p>}
                
                <p className="text-sm text-gray-600 line-clamp-2 mb-4 flex-1">
                  {plan.description || 'No description provided.'}
                </p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="flex items-center text-xs font-medium text-gray-500 bg-gray-50 px-2.5 py-1 rounded-md">
                    <Calendar size={14} className="mr-1.5" />
                    {plan.totalWeeks || 0} Weeks
                  </span>
                  {plan.category && (
                    <span className="flex items-center text-xs font-medium text-gray-500 bg-gray-50 px-2.5 py-1 rounded-md">
                      {plan.category}
                    </span>
                  )}
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t border-gray-100 mt-auto">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditClick(plan)}
                      className="p-2 text-gray-400 hover:text-church-green hover:bg-church-green/10 rounded-lg transition-colors"
                      title="Edit Plan"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(plan.id, plan.title)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Plan"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  {/* Later this will be a link to details page */}
                  <a href={`/admin/discipleship/${plan.id}`} className="text-sm font-bold text-church-green hover:text-church-green-dark">
                    Manage Weeks →
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isFormModalOpen && (
        <DiscipleshipPlanFormModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          plan={editingPlan}
          onSave={fetchPlans}
        />
      )}
      
      {isImportModalOpen && (
        <DiscipleshipImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImportSuccess={fetchPlans}
        />
      )}
    </div>
  );
}
