import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { Plus, HeartHandshake, CheckCircle, XCircle, Trash2, Edit, Check, Shield, Search, Filter } from 'lucide-react';
import PrayerRequestModal from './PrayerRequestModal';
import { useAuth } from '../../context/AuthContext';
import { canModeratePrayerRequests } from '../../utils/permissions';

export default function PrayerModeration() {
  const { userProfile, currentUser } = useAuth();
  const churchId = userProfile?.churchId;
  const isModerator = canModeratePrayerRequests(userProfile);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);

  useEffect(() => {
    if (!churchId) {
      setRequests([]);
      setLoading(false);
      return;
    }
    
    // We only filter by churchId and orderBy createdAt to avoid needing many composite indexes right now.
    // Client-side filtering handles the rest, which is fine for typical prayer request volumes per church.
    let q;
    if (categoryFilter === 'all') {
      q = query(collection(db, 'churches', churchId, 'prayer_requests'), orderBy('createdAt', 'desc'));
    } else {
      // NOTE: Filtering by category while ordering by createdAt requires a composite index in Firestore.
      // If it fails, we will need to create the index.
      q = query(collection(db, 'churches', churchId, 'prayer_requests'), where('category', '==', categoryFilter), orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRequests(docs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching prayer requests: ", error);
      // If the index error happens, it will log here. 
      // For immediate fallback without index: 
      // just query orderBy('createdAt', 'desc') and filter category locally.
      setLoading(false);
    });

    return () => unsubscribe();
  }, [churchId, categoryFilter]);

  const handleAddClick = () => {
    setEditingRequest(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (request) => {
    setEditingRequest(request);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (id) => {
    if (!isModerator) return;
    if (window.confirm('Are you sure you want to delete this prayer request?')) {
      try {
        await deleteDoc(doc(db, 'churches', churchId, 'prayer_requests', id));
      } catch (error) {
        console.error("Error deleting document: ", error);
        alert("Failed to delete request.");
      }
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    if (!isModerator) return;
    try {
      await updateDoc(doc(db, 'churches', churchId, 'prayer_requests', id), {
        status: newStatus
      });
    } catch (error) {
      console.error("Error updating status: ", error);
      alert("Failed to update status.");
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    const dateObj = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const options = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
    return dateObj.toLocaleDateString(undefined, options);
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-md uppercase">Approved</span>;
      case 'pending':
        return <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2.5 py-1 rounded-md uppercase animate-pulse">Pending</span>;
      case 'answered':
        return <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-md uppercase">Answered</span>;
      case 'rejected':
        return <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-md uppercase">Rejected</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2.5 py-1 rounded-md uppercase">{status}</span>;
    }
  };

  const renderCategoryBadge = (category) => {
    const cat = category || 'other';
    const labels = {
      healing: 'Healing',
      family: 'Family',
      spiritual_growth: 'Spiritual Growth',
      provision: 'Provision',
      thanksgiving: 'Thanksgiving',
      other: 'Other'
    };
    const colors = {
      healing: 'bg-blue-50 text-blue-600 border-blue-100',
      family: 'bg-pink-50 text-pink-600 border-pink-100',
      spiritual_growth: 'bg-purple-50 text-purple-600 border-purple-100',
      provision: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      thanksgiving: 'bg-orange-50 text-orange-600 border-orange-100',
      other: 'bg-gray-50 text-gray-600 border-gray-200'
    };
    
    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${colors[cat] || colors.other}`}>
        {labels[cat] || labels.other}
      </span>
    );
  };

  const filteredRequests = requests.filter(req => {
    // 1. Role-based visibility check
    // "finance_admin, ministry_leader, secretary, and viewer cannot see leaders_only prayer requests unless they created the request"
    if (req.visibility === 'leaders_only' && !isModerator) {
      if (req.createdBy !== currentUser?.uid) {
        return false;
      }
    }

    // 2. Search filter
    const searchMatch = !searchTerm || 
      req.requesterName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      req.requestText?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!searchMatch) return false;

    // 3. Status filter
    if (statusFilter !== 'all' && req.status !== statusFilter) return false;

    // 4. Visibility filter
    if (visibilityFilter !== 'all' && req.visibility !== visibilityFilter) return false;

    // 5. Date filter
    if (dateFilter !== 'all' && req.createdAt) {
      const reqDate = req.createdAt.toDate ? req.createdAt.toDate() : new Date(req.createdAt);
      const now = new Date();
      const diffTime = Math.abs(now - reqDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (dateFilter === 'today' && diffDays > 1) return false;
      if (dateFilter === 'week' && diffDays > 7) return false;
      if (dateFilter === 'month' && diffDays > 30) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 flex flex-col h-full max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-church-navy">Prayer Wall</h1>
          <p className="text-sm text-church-slate mt-1">Review, approve, or mark prayer requests as answered.</p>
        </div>
        <button 
          onClick={handleAddClick}
          className="flex items-center px-5 py-2.5 bg-church-green text-white rounded-full shadow-md text-sm font-medium hover:bg-church-green/90 transition-opacity"
        >
          <Plus size={18} className="mr-2" />
          Add Request
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-church-green"
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center border border-gray-300 rounded-full bg-white px-1 py-1 shadow-sm">
            <span className="text-xs font-bold text-gray-400 pl-3 pr-2 uppercase">Status:</span>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm font-bold text-church-navy bg-transparent focus:outline-none pr-3 py-1 cursor-pointer"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="answered">Answered</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="flex items-center border border-gray-300 rounded-full bg-white px-1 py-1 shadow-sm">
            <span className="text-xs font-bold text-gray-400 pl-3 pr-2 uppercase">Category:</span>
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-sm font-bold text-church-navy bg-transparent focus:outline-none pr-3 py-1 cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="healing">Healing</option>
              <option value="family">Family</option>
              <option value="spiritual_growth">Spiritual Growth</option>
              <option value="provision">Provision</option>
              <option value="thanksgiving">Thanksgiving</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex items-center border border-gray-300 rounded-full bg-white px-1 py-1 shadow-sm">
            <span className="text-xs font-bold text-gray-400 pl-3 pr-2 uppercase">Visibility:</span>
            <select 
              value={visibilityFilter}
              onChange={(e) => setVisibilityFilter(e.target.value)}
              className="text-sm font-bold text-church-navy bg-transparent focus:outline-none pr-3 py-1 cursor-pointer"
            >
              <option value="all">All</option>
              <option value="public">Public</option>
              <option value="leaders_only">Leaders Only</option>
            </select>
          </div>

          <div className="flex items-center border border-gray-300 rounded-full bg-white px-1 py-1 shadow-sm">
            <span className="text-xs font-bold text-gray-400 pl-3 pr-2 uppercase">Date:</span>
            <select 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="text-sm font-bold text-church-navy bg-transparent focus:outline-none pr-3 py-1 cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
            </select>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-church-slate">Loading prayer requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 p-12 flex flex-col items-center justify-center flex-1">
          <div className="w-20 h-20 bg-church-green/10 rounded-full flex items-center justify-center mb-6">
            <HeartHandshake size={32} className="text-church-green" />
          </div>
          <h3 className="text-xl font-bold text-church-navy mb-2">No prayer requests found</h3>
          <p className="text-church-slate text-center max-w-sm mb-6">
            {categoryFilter !== 'all' || statusFilter !== 'all' || searchTerm !== ''
              ? "No prayer requests found for this category or filter." 
              : "All caught up. No prayer requests to review right now."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map(request => (
            <div key={request.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col sm:flex-row gap-4 hover:shadow-md transition-shadow">
              
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-bold text-church-navy">{request.requesterName}</span>
                    <span className="text-xs text-gray-400">{formatDate(request.createdAt)}</span>
                    {renderCategoryBadge(request.category)}
                    {request.visibility === 'leaders_only' && (
                      <span className="flex items-center text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
                        <Shield size={12} className="mr-1" /> Pastors Only
                      </span>
                    )}
                  </div>
                  <div className="sm:hidden">
                    {renderStatusBadge(request.status)}
                  </div>
                </div>
                
                <p className="text-church-slate text-sm leading-relaxed whitespace-pre-wrap mb-4">
                  "{request.requestText}"
                </p>

                {isModerator && (
                  <div className="mt-auto flex items-center space-x-2 pt-3 border-t border-gray-100">
                    <button onClick={() => handleEditClick(request)} className="text-gray-400 hover:text-church-navy p-1 transition-colors">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDeleteClick(request.id)} className="text-gray-400 hover:text-red-600 p-1 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Status and Actions Sidebar */}
              <div className="sm:w-48 shrink-0 flex flex-col space-y-3 sm:border-l sm:border-gray-100 sm:pl-4">
                <div className="hidden sm:block mb-2">
                  {renderStatusBadge(request.status)}
                </div>

                {isModerator && request.status === 'pending' && (
                  <>
                    <button 
                      onClick={() => handleUpdateStatus(request.id, 'approved')}
                      className="w-full flex items-center justify-center px-3 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-bold transition-colors"
                    >
                      <CheckCircle size={16} className="mr-2" /> Approve
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus(request.id, 'rejected')}
                      className="w-full flex items-center justify-center px-3 py-2 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-bold transition-colors"
                    >
                      <XCircle size={16} className="mr-2" /> Reject
                    </button>
                  </>
                )}

                {isModerator && request.status === 'approved' && (
                  <button 
                    onClick={() => handleUpdateStatus(request.id, 'answered')}
                    className="w-full flex items-center justify-center px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-bold transition-colors"
                  >
                    <Check size={16} className="mr-2" /> Mark Answered
                  </button>
                )}
                
                {isModerator && (request.status === 'rejected' || request.status === 'answered') && (
                  <button 
                    onClick={() => handleUpdateStatus(request.id, 'pending')}
                    className="w-full flex items-center justify-center px-3 py-2 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 rounded-lg text-sm font-bold transition-colors"
                  >
                    Revert to Pending
                  </button>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      <PrayerRequestModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        request={editingRequest}
        churchId={churchId}
      />
    </div>
  );
}
