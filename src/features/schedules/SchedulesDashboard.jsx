import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Users, Shield, Plus, MoreVertical, Edit, Trash2, Copy } from 'lucide-react';
import AssignmentFormModal from './AssignmentFormModal';

export default function SchedulesDashboard() {
  const { userProfile } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Tabs: 'date', 'ministry', 'member'
  const [activeTab, setActiveTab] = useState('date');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);

  useEffect(() => {
    if (!userProfile?.churchId) return;
    
    const q = query(collection(db, 'ministryAssignments'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      docs = docs.filter(d => d.churchId === userProfile.churchId || (!d.churchId && userProfile.churchId === 'YmEc6C69Xz4DKRQaQZBV'));
      docs.sort((a, b) => new Date(a.eventDate || 0) - new Date(b.eventDate || 0));
      
      setAssignments(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile?.churchId]);

  const handleDelete = async (id) => {
    setActiveMenuId(null);
    if (window.confirm("Are you sure you want to delete this assignment?")) {
      try {
        await deleteDoc(doc(db, 'ministryAssignments', id));
      } catch (err) {
        console.error("Error deleting assignment", err);
      }
    }
  };

  const toggleMenu = (id) => {
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  // Grouping logic
  const groupedByDate = assignments.reduce((acc, a) => {
    const d = a.eventDate || 'Unknown Date';
    if (!acc[d]) acc[d] = [];
    acc[d].push(a);
    return acc;
  }, {});

  const groupedByMinistry = assignments.reduce((acc, a) => {
    const minName = a.ministryName || 'Unknown Ministry';
    if (!acc[minName]) acc[minName] = [];
    acc[minName].push(a);
    return acc;
  }, {});

  const groupedByMember = assignments.reduce((acc, a) => {
    const mem = a.memberName || 'Unknown Member';
    if (!acc[mem]) acc[mem] = [];
    acc[mem].push(a);
    return acc;
  }, {});

  if (loading) return <div className="p-8 text-center text-gray-500">Loading schedules...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-church-navy">Ministry Scheduling</h1>
          <p className="text-church-slate mt-1">Manage all event assignments, roles, and volunteers.</p>
        </div>
        <button 
          onClick={() => { setEditingAssignment(null); setIsModalOpen(true); }}
          className="flex items-center px-5 py-2.5 bg-church-green text-white rounded-full shadow-md text-sm font-bold hover:bg-church-green/90 transition-opacity"
        >
          <Plus size={18} className="mr-2" />
          Create Assignment
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-100 px-6 pt-4 space-x-6">
          <button 
            onClick={() => setActiveTab('date')}
            className={`pb-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'date' ? 'border-church-green text-church-green' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            By Date
          </button>
          <button 
            onClick={() => setActiveTab('ministry')}
            className={`pb-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'ministry' ? 'border-church-green text-church-green' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            By Ministry
          </button>
          <button 
            onClick={() => setActiveTab('member')}
            className={`pb-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'member' ? 'border-church-green text-church-green' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            By Member
          </button>
        </div>

        <div className="p-6">
          {assignments.length === 0 ? (
            <div className="py-16 text-center">
              <Calendar size={40} className="mx-auto text-gray-300 mb-4" />
              <p className="text-church-navy font-bold text-lg">No assignments found</p>
              <p className="text-church-slate text-sm">Click "Create Assignment" to schedule volunteers for upcoming events.</p>
            </div>
          ) : (
            <>
              {activeTab === 'date' && (
                <div className="space-y-6">
                  {Object.entries(groupedByDate).sort(([a], [b]) => new Date(a) - new Date(b)).map(([dateStr, dateAssignments]) => (
                    <div key={dateStr} className="border border-gray-200 rounded-2xl overflow-hidden">
                      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                        <h3 className="font-bold text-church-navy">{new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
                      </div>
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {dateAssignments.map(a => (
                          <div key={a.id} className="p-4 border border-gray-100 rounded-xl hover:shadow-md transition-shadow relative">
                            <h4 className="font-bold text-church-navy mb-1 pr-8">{a.eventName}</h4>
                            <p className="text-xs text-church-green font-bold mb-2">{a.ministryName} • {a.roleName}</p>
                            <div className="flex items-center text-sm text-church-slate">
                              <Users size={14} className="mr-1.5" /> {a.memberName}
                            </div>
                            {a.callTime && <p className="text-xs text-gray-500 mt-2">Call: {a.callTime}</p>}
                            <span className={`inline-block mt-3 text-[10px] uppercase font-bold px-2 py-0.5 rounded ${a.status === 'Confirmed' ? 'bg-green-100 text-green-700' : (a.status === 'Declined' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700')}`}>
                              {a.status}
                            </span>
                            
                            <div className="absolute top-4 right-4">
                              <button onClick={() => toggleMenu(a.id)} className="text-gray-400 hover:text-church-navy"><MoreVertical size={16} /></button>
                              {activeMenuId === a.id && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                                  <div className="absolute right-0 top-6 w-32 bg-white border border-gray-100 shadow-lg rounded-xl z-20 py-1 text-left">
                                    <button onClick={() => { setActiveMenuId(null); setEditingAssignment(a); setIsModalOpen(true); }} className="w-full text-left px-4 py-2 text-sm text-church-navy hover:bg-gray-50 flex items-center">
                                      <Edit size={14} className="mr-2" /> Edit
                                    </button>
                                    <button onClick={() => handleDelete(a.id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center">
                                      <Trash2 size={14} className="mr-2" /> Delete
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'ministry' && (
                <div className="space-y-6">
                  {Object.entries(groupedByMinistry).map(([ministryName, minAssignments]) => (
                    <div key={ministryName} className="border border-gray-200 rounded-2xl overflow-hidden">
                      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                        <h3 className="font-bold text-church-navy flex items-center"><Shield size={18} className="mr-2 text-church-green" /> {ministryName}</h3>
                      </div>
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {minAssignments.map(a => (
                          <div key={a.id} className="p-4 border border-gray-100 rounded-xl">
                            <p className="text-xs text-gray-500 mb-1">{a.eventDate}</p>
                            <h4 className="font-bold text-church-navy mb-2">{a.eventName}</h4>
                            <p className="text-sm font-bold text-church-green">{a.roleName}</p>
                            <p className="text-sm text-church-slate">{a.memberName}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'member' && (
                <div className="space-y-6">
                  {Object.entries(groupedByMember).map(([memberName, memAssignments]) => (
                    <div key={memberName} className="border border-gray-200 rounded-2xl overflow-hidden">
                      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                        <h3 className="font-bold text-church-navy flex items-center"><Users size={18} className="mr-2 text-church-green" /> {memberName}</h3>
                      </div>
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {memAssignments.map(a => (
                          <div key={a.id} className="p-4 border border-gray-100 rounded-xl">
                            <p className="text-xs text-gray-500 mb-1">{a.eventDate}</p>
                            <h4 className="font-bold text-church-navy mb-2">{a.eventName}</h4>
                            <p className="text-sm font-bold text-church-green">{a.ministryName} • {a.roleName}</p>
                            <span className={`inline-block mt-2 text-[10px] uppercase font-bold px-2 py-0.5 rounded ${a.status === 'Confirmed' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                              {a.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <AssignmentFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        existingAssignment={editingAssignment} 
      />
    </div>
  );
}
