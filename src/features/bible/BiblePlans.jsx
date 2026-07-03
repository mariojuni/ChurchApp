import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Plus, BookOpen, Edit, Trash2, Calendar, Clock, MoreVertical } from 'lucide-react';
import BiblePlanFormModal from './BiblePlanFormModal';

const CHURCH_ID = 'YmEc6C69Xz4DKRQaQZBV';

export default function BiblePlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  
  // Action menu state
  const [activeMenuId, setActiveMenuId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'churches', CHURCH_ID, 'bible_plans'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPlans(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddClick = () => {
    setEditingPlan(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (plan) => {
    setEditingPlan(plan);
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleDeleteClick = async (id, title) => {
    setActiveMenuId(null);
    if (window.confirm(`Are you sure you want to delete the plan "${title}"?`)) {
      try {
        await deleteDoc(doc(db, 'churches', CHURCH_ID, 'bible_plans', id));
      } catch (error) {
        console.error("Error deleting document: ", error);
        alert("Failed to delete plan.");
      }
    }
  };

  const toggleMenu = (id) => {
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const dateObj = new Date(dateStr + 'T00:00:00'); 
    return dateObj.toLocaleDateString(undefined, options);
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full uppercase">Active</span>;
      case 'draft':
        return <span className="bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1 rounded-full uppercase">Draft</span>;
      case 'completed':
        return <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full uppercase">Completed</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1 rounded-full uppercase">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-church-navy">Bible Reading Plans</h1>
          <p className="text-sm text-church-slate mt-1">Manage guided scripture reading plans for members.</p>
        </div>
        <button 
          onClick={handleAddClick}
          className="flex items-center px-5 py-2.5 bg-church-green text-white rounded-full shadow-md text-sm font-medium hover:bg-church-green/90 transition-opacity"
        >
          <Plus size={18} className="mr-2" />
          Create Plan
        </button>
      </div>
      
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-church-slate">Loading reading plans...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 p-12 flex flex-col items-center justify-center flex-1">
          <div className="w-20 h-20 bg-church-green/10 rounded-full flex items-center justify-center mb-6">
            <BookOpen size={32} className="text-church-green" />
          </div>
          <h3 className="text-xl font-bold text-church-navy mb-2">No reading plans active</h3>
          <p className="text-church-slate text-center max-w-sm mb-6">Draft a new Bible reading plan to share with the church.</p>
          <button 
            onClick={handleAddClick}
            className="px-6 py-3 bg-white border border-gray-300 text-church-navy rounded-full text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
          >
            Create Plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {plans.map(plan => (
            <div key={plan.id} className="bg-white rounded-3xl overflow-hidden shadow-church-soft border border-gray-100 flex flex-col relative group transition-all hover:shadow-md">
              
              {/* Header Banner */}
              <div className="h-28 bg-church-green/10 relative border-b border-gray-100 flex items-center justify-center">
                <BookOpen size={48} className="text-church-green/30" />
                
                {/* Actions Dropdown */}
                <div className="absolute top-4 right-4 relative">
                  <button 
                    onClick={() => toggleMenu(plan.id)}
                    className="p-2 text-gray-500 hover:text-church-navy bg-white/80 hover:bg-white rounded-full transition-colors backdrop-blur-sm shadow-sm border border-gray-100"
                  >
                    <MoreVertical size={18} />
                  </button>
                  
                  {activeMenuId === plan.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                      <div className="absolute right-0 top-10 w-36 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1">
                        <button 
                          onClick={() => handleEditClick(plan)}
                          className="w-full flex items-center px-4 py-2 text-sm text-church-navy hover:bg-gray-50"
                        >
                          <Edit size={14} className="mr-2" /> Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(plan.id, plan.title)}
                          className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={14} className="mr-2" /> Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-bold text-church-navy line-clamp-2 pr-2">{plan.title}</h3>
                  {renderStatusBadge(plan.status)}
                </div>
                
                <p className="text-sm text-church-slate line-clamp-3 mb-6 flex-1">
                  {plan.description || 'No description provided.'}
                </p>

                <div className="flex flex-col space-y-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  
                  <div className="flex justify-between items-center">
                    {plan.durationDays > 0 && (
                      <div className="flex items-center text-sm font-medium text-church-navy">
                        <Clock size={16} className="text-church-green mr-2" />
                        {plan.durationDays} Days Total
                      </div>
                    )}
                    
                    <div className="text-xs font-bold text-church-green bg-church-green/10 px-2 py-1 rounded-md">
                      {plan.readings?.length || 0} Readings Loaded
                    </div>
                  </div>
                  
                  {(plan.startDate || plan.endDate) && (
                    <div className="flex items-center text-sm font-medium text-church-slate">
                      <Calendar size={16} className="text-gray-400 mr-2 shrink-0" />
                      <span className="truncate">
                        {plan.startDate ? formatDate(plan.startDate) : 'TBD'}
                        {plan.endDate && ` - ${formatDate(plan.endDate)}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <BiblePlanFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        plan={editingPlan}
      />
    </div>
  );
}
