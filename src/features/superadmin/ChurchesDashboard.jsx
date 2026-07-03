import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Plus, Building, MoreVertical, Edit, Power, Users } from 'lucide-react';
import ChurchFormModal from './ChurchFormModal';

export default function ChurchesDashboard() {
  const [churches, setChurches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedChurch, setSelectedChurch] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'churches'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChurches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleToggleStatus = async (church) => {
    setActiveMenuId(null);
    const newStatus = church.status === 'Active' ? 'Disabled' : 'Active';
    if (window.confirm(`Are you sure you want to mark ${church.name} as ${newStatus}?`)) {
      await updateDoc(doc(db, 'churches', church.id), { status: newStatus });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-church-navy">Tenants / Churches</h1>
          <p className="text-sm text-church-slate mt-1">Super Admin dashboard for managing church instances.</p>
        </div>
        <button 
          onClick={() => { setSelectedChurch(null); setIsFormOpen(true); }}
          className="flex items-center px-5 py-2.5 bg-church-green text-white rounded-full shadow-md text-sm font-bold"
        >
          <Plus size={18} className="mr-2" />
          Add Church
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="text-church-slate p-4">Loading churches...</div>
        ) : churches.map(church => (
          <div key={church.id} className="bg-white p-6 rounded-3xl shadow-church-soft border border-gray-100 flex flex-col relative group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Building size={24} />
              </div>
              <div className="relative">
                <button onClick={() => setActiveMenuId(activeMenuId === church.id ? null : church.id)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
                  <MoreVertical size={18} />
                </button>
                {activeMenuId === church.id && (
                  <div className="absolute right-0 top-10 mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1 text-left">
                    <button onClick={() => { setSelectedChurch(church); setIsFormOpen(true); setActiveMenuId(null); }} className="w-full flex items-center px-4 py-2 text-sm text-church-navy hover:bg-gray-50">
                      <Edit size={16} className="mr-2" /> Edit Details
                    </button>
                    <button onClick={() => handleToggleStatus(church)} className={`w-full flex items-center px-4 py-2 text-sm ${church.status === 'Active' ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                      <Power size={16} className="mr-2" /> {church.status === 'Active' ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-church-navy">{church.name}</h3>
            <p className="text-xs text-church-slate mt-1 line-clamp-1">{church.address}</p>
            
            <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
              <span className={`px-2 py-1 rounded-md text-xs font-bold ${church.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {church.status || 'Active'}
              </span>
              <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                ID: {church.id}
              </div>
            </div>
          </div>
        ))}
      </div>

      <ChurchFormModal 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        church={selectedChurch} 
      />
    </div>
  );
}
