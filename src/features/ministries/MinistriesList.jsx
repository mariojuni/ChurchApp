import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { Search, Plus, MoreVertical, Edit, Archive, Users, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MinistryFormModal from './MinistryFormModal';
import MinistryApplicationsList from './MinistryApplicationsList';
import { useAuth } from '../../context/AuthContext';
import ModernDropdown from '../../components/ui/ModernDropdown';

export default function MinistriesList() {
  const [ministries, setMinistries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Active');
  const [activeTab, setActiveTab] = useState('ministries');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedMinistry, setSelectedMinistry] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);

  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const CHURCH_ID = userProfile?.churchId || 'YmEc6C69Xz4DKRQaQZBV';

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    if (!userProfile) return;
    if (!CHURCH_ID) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'ministries'), 
      where('churchId', '==', CHURCH_ID)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      docs.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      
      setMinistries(docs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching ministries:", error);
      alert(`Error fetching ministries: ${error.message}`);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userProfile?.churchId]);

  const filteredMinistries = ministries.filter(m => {
    const searchMatch = m.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    const statusMatch = filterStatus === 'All' ? true : m.status === filterStatus;
    return searchMatch && statusMatch;
  });

  const handleAddClick = () => {
    setSelectedMinistry(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (e, ministry) => {
    e.stopPropagation();
    setSelectedMinistry(ministry);
    setIsFormOpen(true);
    setActiveMenuId(null);
  };

  const handleArchiveClick = async (e, ministry) => {
    e.stopPropagation();
    setActiveMenuId(null);
    if (window.confirm(`Are you sure you want to archive ${ministry.name}?`)) {
      try {
        await updateDoc(doc(db, 'ministries', ministry.id), {
          status: 'Archived',
          updatedAt: new Date()
        });
      } catch (error) {
        console.error(error);
      }
    }
  };

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-church-navy">Ministries</h1>
          <p className="text-sm text-church-slate mt-1">Organize volunteer teams and review membership applications.</p>
        </div>
        
        {activeTab === 'ministries' && (
          <button 
            onClick={handleAddClick}
            className="flex items-center px-5 py-2.5 bg-church-green text-white rounded-full shadow-md text-sm font-bold hover:bg-church-green/90 transition-opacity self-start md:self-auto"
          >
            <Plus size={18} className="mr-2" />
            Create Ministry
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 flex space-x-8">
        <button
          onClick={() => setActiveTab('ministries')}
          className={`pb-3 text-sm font-bold transition-colors border-b-2 ${
            activeTab === 'ministries'
              ? 'border-church-green text-church-green'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          All Ministries
        </button>
        <button
          onClick={() => setActiveTab('applications')}
          className={`pb-3 text-sm font-bold transition-colors border-b-2 ${
            activeTab === 'applications'
              ? 'border-church-green text-church-green'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          Applications
        </button>
      </div>

      {activeTab === 'applications' ? (
        <MinistryApplicationsList />
      ) : (
        <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 overflow-hidden flex flex-col relative min-h-[400px]">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
            <div className="flex items-center space-x-4 flex-1">
              <div className="relative w-80">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-church-green"
                  placeholder="Search ministries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex items-center border border-gray-300 rounded-full bg-white px-1 py-1 shadow-sm">
                <span className="text-xs font-bold text-gray-400 pl-3 pr-2 uppercase">Status:</span>
                <ModernDropdown
                  value={filterStatus}
                  onChange={(val) => setFilterStatus(val)}
                  options={[
                    { value: 'Active', label: 'Active' },
                    { value: 'Archived', label: 'Archived' },
                    { value: 'All', label: 'All Ministries' }
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center text-church-slate py-12">Loading ministries...</div>
            ) : filteredMinistries.length === 0 ? (
              <div className="text-center py-16">
                <div className="flex justify-center text-gray-300 mb-4"><Shield size={40} /></div>
                <p className="text-church-navy font-bold text-lg">No ministries found</p>
                <p className="text-church-slate text-sm">Create a new ministry to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMinistries.map(ministry => (
                  <div 
                    key={ministry.id} 
                    onClick={() => navigate(`/admin/ministries/${ministry.id}`)}
                    className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-church-green/30 transition-all cursor-pointer relative group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-church-green/10 rounded-xl flex items-center justify-center text-church-green">
                        <Shield size={24} />
                      </div>
                      
                      <button 
                        onClick={(e) => toggleMenu(e, ministry.id)}
                        className="text-gray-400 hover:text-church-navy p-2 -mr-2 -mt-2 rounded-lg hover:bg-gray-100 transition-colors z-10"
                      >
                        <MoreVertical size={20} />
                      </button>

                      {activeMenuId === ministry.id && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }} />
                          <div className="absolute right-6 top-10 mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-100 z-30 py-1 text-left">
                            <button onClick={(e) => handleEditClick(e, ministry)} className="w-full flex items-center px-4 py-2 text-sm font-medium text-church-navy hover:bg-gray-50">
                              <Edit size={16} className="mr-2" /> Edit Details
                            </button>
                            {ministry.status !== 'Archived' && (
                              <button onClick={(e) => handleArchiveClick(e, ministry)} className="w-full flex items-center px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 border-t border-gray-50 mt-1">
                                <Archive size={16} className="mr-2" /> Archive
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-church-navy group-hover:text-church-green transition-colors">{ministry.name}</h3>
                    <p className="text-sm text-church-slate mt-1 line-clamp-2 min-h-[40px]">{ministry.description || 'No description provided.'}</p>
                    
                    <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
                      <div className="flex items-center text-sm font-medium text-church-slate">
                        <Users size={16} className="mr-2 text-gray-400" />
                        {ministry.members?.length || 0} Members
                      </div>
                      
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${ministry.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {ministry.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <MinistryFormModal 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        ministry={selectedMinistry}
      />
    </div>
  );
}
