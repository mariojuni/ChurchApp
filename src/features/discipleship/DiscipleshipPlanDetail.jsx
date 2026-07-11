import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Plus, Edit, Trash2, CheckCircle, Circle, BookOpen, Clock } from 'lucide-react';
import { 
  getDiscipleshipPlan, 
  getDiscipleshipWeeks, 
  deleteDiscipleshipPlan, 
  deleteDiscipleshipWeek,
  publishAllWeeks
} from './discipleshipService';
import DiscipleshipWeekFormModal from './DiscipleshipWeekFormModal';
import DiscipleshipPlanFormModal from './DiscipleshipPlanFormModal';

export default function DiscipleshipPlanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const CHURCH_ID = userProfile?.churchId || 'YmEc6C69Xz4DKRQaQZBV';
  
  const [plan, setPlan] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isWeekModalOpen, setIsWeekModalOpen] = useState(false);
  const [editingWeek, setEditingWeek] = useState(null);

  const fetchData = async () => {
    if (!CHURCH_ID || !id) return;
    setLoading(true);
    try {
      const planData = await getDiscipleshipPlan(CHURCH_ID, id);
      if (!planData) {
        navigate('/admin/discipleship');
        return;
      }
      setPlan(planData);
      
      const weeksData = await getDiscipleshipWeeks(CHURCH_ID, id);
      setWeeks(weeksData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [CHURCH_ID, id]);

  const handleAddWeekClick = () => {
    setEditingWeek(null);
    setIsWeekModalOpen(true);
  };

  const handleEditWeekClick = (week) => {
    setEditingWeek(week);
    setIsWeekModalOpen(true);
  };

  const handleDeleteWeek = async (weekId) => {
    if (window.confirm('Are you sure you want to delete this week?')) {
      try {
        await deleteDiscipleshipWeek(CHURCH_ID, weekId);
        fetchData();
      } catch (err) {
        alert('Failed to delete week.');
      }
    }
  };

  const handlePublishAll = async () => {
    if (window.confirm('Publish all draft weeks? This will make them visible to users.')) {
      try {
        await publishAllWeeks(CHURCH_ID, id);
        fetchData();
      } catch (err) {
        console.error("Failed to publish all weeks", err);
        alert("Failed to publish all weeks. See console for details.");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="w-8 h-8 border-4 border-church-green border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!plan) return null;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/discipleship')} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-church-navy">{plan.title}</h1>
            {plan.subtitle && <p className="text-gray-500">{plan.subtitle}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsPlanModalOpen(true)} className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-xl hover:bg-gray-50 text-church-navy">
            Edit Plan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-church-soft p-6 border border-gray-100">
            <h3 className="font-bold text-church-navy mb-4 border-b border-gray-100 pb-2">Plan Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`font-bold ${plan.status === 'published' ? 'text-green-600' : 'text-yellow-600'}`}>
                  {plan.status.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Language</span>
                <span className="font-medium text-gray-900">{plan.language || 'English'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Category</span>
                <span className="font-medium text-gray-900">{plan.category || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Visibility</span>
                <span className="font-medium text-gray-900 capitalize">{plan.visibility?.replace(/_/g, ' ') || 'Church Members Only'}</span>
              </div>
              <div className="pt-3 border-t border-gray-100">
                <p className="text-gray-600">{plan.description}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-church-soft border border-gray-100 flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <h2 className="text-lg font-bold text-church-navy flex items-center">
                <BookOpen size={20} className="mr-2 text-church-green" />
                Weekly Lessons ({weeks.length})
              </h2>
              <div className="flex gap-2">
                {weeks.some(w => w.status !== 'published') && (
                  <button 
                    onClick={handlePublishAll} 
                    className="flex items-center text-sm bg-white border border-church-green text-church-green px-3 py-1.5 rounded-lg hover:bg-church-green/5"
                  >
                    Publish All
                  </button>
                )}
                <button onClick={handleAddWeekClick} className="flex items-center text-sm bg-church-green text-white px-3 py-1.5 rounded-lg hover:bg-church-green-dark">
                  <Plus size={16} className="mr-1" /> Add Week
                </button>
              </div>
            </div>

            <div className="p-0">
              {weeks.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <p>No weeks have been added to this plan yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {weeks.map((week) => (
                    <div key={week.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row gap-4">
                      <div className="flex-shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-church-green/10 text-church-green font-bold">
                        W{week.weekNumber}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-bold text-church-navy text-lg">{week.chapterTitle || `Week ${week.weekNumber}`}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded-md ${week.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {week.status}
                          </span>
                        </div>
                        <p className="text-sm text-church-green font-medium mb-2">{week.scriptureReference}</p>
                        <div className="flex items-center text-xs text-gray-500 gap-3">
                          {week.estimatedDurationMinutes && (
                            <span className="flex items-center"><Clock size={12} className="mr-1" /> {week.estimatedDurationMinutes} mins</span>
                          )}
                          {week.chapterNumber && (
                            <span className="flex items-center"><BookOpen size={12} className="mr-1" /> Chapter {week.chapterNumber}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-4 sm:mt-0">
                        <button onClick={() => handleEditWeekClick(week)} className="p-2 text-gray-400 hover:text-church-green hover:bg-church-green/10 rounded-lg">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => handleDeleteWeek(week.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isPlanModalOpen && (
        <DiscipleshipPlanFormModal
          isOpen={isPlanModalOpen}
          onClose={() => setIsPlanModalOpen(false)}
          plan={plan}
          onSave={fetchData}
        />
      )}

      {isWeekModalOpen && (
        <DiscipleshipWeekFormModal
          isOpen={isWeekModalOpen}
          onClose={() => setIsWeekModalOpen(false)}
          planId={id}
          week={editingWeek}
          nextWeekNumber={weeks.length > 0 ? Math.max(...weeks.map(w => w.weekNumber)) + 1 : 1}
          onSave={fetchData}
        />
      )}
    </div>
  );
}
