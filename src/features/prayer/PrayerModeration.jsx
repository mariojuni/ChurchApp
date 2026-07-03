import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Plus, HeartHandshake, CheckCircle, XCircle, Trash2, Edit, Check, Shield } from 'lucide-react';
import PrayerRequestModal from './PrayerRequestModal';

const CHURCH_ID = 'casubiduan';

export default function PrayerModeration() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'churches', CHURCH_ID, 'prayer_requests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRequests(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddClick = () => {
    setEditingRequest(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (request) => {
    setEditingRequest(request);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (id) => {
    if (window.confirm('Are you sure you want to delete this prayer request?')) {
      try {
        await deleteDoc(doc(db, 'churches', CHURCH_ID, 'prayer_requests', id));
      } catch (error) {
        console.error("Error deleting document: ", error);
        alert("Failed to delete request.");
      }
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, 'churches', CHURCH_ID, 'prayer_requests', id), {
        status: newStatus
      });
    } catch (error) {
      console.error("Error updating status: ", error);
      alert("Failed to update status.");
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    // Handle Firestore Timestamp
    const dateObj = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const options = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
    return dateObj.toLocaleDateString(undefined, options);
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-md uppercase">Approved</span>;
      case 'pending':
        return <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2.5 py-1 rounded-md uppercase animate-pulse">Pending Review</span>;
      case 'answered':
        return <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-md uppercase">Answered!</span>;
      case 'rejected':
        return <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-md uppercase">Rejected</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2.5 py-1 rounded-md uppercase">{status}</span>;
    }
  };

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
      
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-church-slate">Loading prayer requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 p-12 flex flex-col items-center justify-center flex-1">
          <div className="w-20 h-20 bg-church-green/10 rounded-full flex items-center justify-center mb-6">
            <HeartHandshake size={32} className="text-church-green" />
          </div>
          <h3 className="text-xl font-bold text-church-navy mb-2">All caught up</h3>
          <p className="text-church-slate text-center max-w-sm mb-6">No prayer requests to review right now.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(request => (
            <div key={request.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col sm:flex-row gap-4 hover:shadow-md transition-shadow">
              
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-church-navy">{request.requesterName}</span>
                    <span className="text-xs text-gray-400">{formatDate(request.createdAt)}</span>
                    {request.visibility === 'pastors_only' && (
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

                <div className="mt-auto flex items-center space-x-2 pt-3 border-t border-gray-100">
                  <button onClick={() => handleEditClick(request)} className="text-gray-400 hover:text-church-navy p-1 transition-colors">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDeleteClick(request.id)} className="text-gray-400 hover:text-red-600 p-1 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Status and Actions Sidebar */}
              <div className="sm:w-48 shrink-0 flex flex-col space-y-3 sm:border-l sm:border-gray-100 sm:pl-4">
                <div className="hidden sm:block mb-2">
                  {renderStatusBadge(request.status)}
                </div>

                {request.status === 'pending' && (
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

                {request.status === 'approved' && (
                  <button 
                    onClick={() => handleUpdateStatus(request.id, 'answered')}
                    className="w-full flex items-center justify-center px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-bold transition-colors"
                  >
                    <Check size={16} className="mr-2" /> Mark Answered
                  </button>
                )}
                
                {(request.status === 'rejected' || request.status === 'answered') && (
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
      />
    </div>
  );
}
