import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, increment, where, serverTimestamp } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Search, CheckCircle, XCircle, FileImage, ExternalLink, Activity } from 'lucide-react';

export default function PendingVerification() {
  const { userProfile, currentUser } = useAuth();
  const CHURCH_ID = userProfile?.churchId || 'YmEc6C69Xz4DKRQaQZBV';
  
  const [pendingRecords, setPendingRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [usersMap, setUsersMap] = useState({});
  const [fundsMap, setFundsMap] = useState({});

  useEffect(() => {
    if (!CHURCH_ID) return;
    
    // Query only pending records to optimize read load
    const q = query(
      collection(db, 'givingRecords'), 
      where('churchId', '==', CHURCH_ID),
      where('status', '==', 'pending')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort by submitted date ascending (oldest first)
      docs.sort((a, b) => {
        const dateA = a.submittedAt?.toDate ? a.submittedAt.toDate() : new Date();
        const dateB = b.submittedAt?.toDate ? b.submittedAt.toDate() : new Date();
        return dateA - dateB;
      });
      setPendingRecords(docs);
      setLoading(false);
    }, (error) => {
      console.error("PendingVerification error:", error);
      setLoading(false);
    });

    const qUsers = query(collection(db, 'users'), where('churchId', '==', CHURCH_ID));
    const unsubscribeUsers = onSnapshot(qUsers, (snap) => {
      const map = {};
      snap.forEach(d => {
        const u = d.data();
        let name = '';
        if (u.firstName || u.lastName) {
          const f = (u.firstName || '').trim().split(/[\s-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
          const l = (u.lastName || '').trim().split(/[\s-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
          const m = u.middleName ? u.middleName.trim().charAt(0).toUpperCase() + '.' : '';
          name = [f, m, l].filter(Boolean).join(' ');
        }
        if (!name) name = u.name || u.displayName;
        map[d.id] = name || 'Anonymous';
      });
      setUsersMap(map);
    });

    const qFunds = query(collection(db, 'givingFunds'), where('churchId', '==', CHURCH_ID));
    const unsubscribeFunds = onSnapshot(qFunds, (snap) => {
      const map = {};
      snap.forEach(d => {
        map[d.id] = d.data().name;
      });
      setFundsMap(map);
    });

    return () => {
      unsubscribe();
      unsubscribeUsers();
      unsubscribeFunds();
    };
  }, [userProfile?.churchId]);

  const getDonorName = (record) => {
    return usersMap[record.userId] || record.donorName || record.userName || 'Anonymous';
  };

  const mapFundIdToName = (fundId, fundType) => {
    if (fundId && fundsMap[fundId]) return fundsMap[fundId];
    if (fundType) return fundType;
    if (!fundId) return 'Tithe';
    const lower = fundId.toLowerCase();
    if (lower.includes('tithe')) return 'Tithe';
    if (lower.includes('offering')) return 'Offering';
    if (lower.includes('building')) return 'Building Fund';
    if (lower.includes('mission')) return 'Missions';
    return 'Others';
  };

  const handleApprove = async (record) => {
    if (!window.confirm('Are you sure you want to approve this giving record?')) return;
    
    try {
      const recordRef = doc(db, 'givingRecords', record.id);
      const submittedDate = record.submittedAt?.toDate() || new Date();
      const dateString = submittedDate.toISOString().split('T')[0];

      await updateDoc(recordRef, {
        status: 'completed',
        approvedAt: serverTimestamp(),
        approvedBy: currentUser.uid,
        date: dateString,
        fundType: mapFundIdToName(record.fundId, record.fundType),
        updatedAt: serverTimestamp()
      });
      
      if (record.campaignId) {
        try {
          const campaignRef = doc(db, 'givingCampaigns', record.campaignId);
          await updateDoc(campaignRef, {
            raisedAmount: increment(record.amount || 0)
          });
        } catch (campaignErr) {
          console.error("Error updating campaign raised amount:", campaignErr);
        }
      }
    } catch (err) {
      console.error("Error approving submission", err);
      alert("Failed to approve submission.");
    }
  };

  const handleReject = async (record) => {
    const reason = window.prompt("Please enter a reason for rejecting this submission:");
    if (reason === null) return; 
    
    try {
      await updateDoc(doc(db, 'givingRecords', record.id), {
        status: 'rejected',
        rejectionReason: reason || 'Declined by admin',
        rejectedBy: currentUser.uid,
        rejectedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      if (record.proofOfPaymentUrl) {
        try {
          const imageRef = ref(storage, record.proofOfPaymentUrl);
          await deleteObject(imageRef);
        } catch (storageErr) {
          console.error("Error deleting image from storage:", storageErr);
        }
      }
    } catch (err) {
      console.error("Error rejecting giving record:", err);
      alert("Failed to reject record.");
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount || 0);
  };

  const filteredRecords = pendingRecords.filter(r => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const donorName = getDonorName(r).toLowerCase();
    const fundMatch = mapFundIdToName(r.fundId, r.fundType).toLowerCase().includes(search);
    return donorName.includes(search) || fundMatch;
  });

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading pending verifications...</div>;
  }

  return (
    <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-church-navy">Pending Verification</h2>
        
        <div className="relative w-64">
          <input
            type="text"
            placeholder="Search by name or fund..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-church-green/50"
          />
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date Submitted</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Submitted By</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Fund / Campaign</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Proof</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-church-slate flex flex-col items-center">
                  <CheckCircle size={32} className="mb-3 text-gray-300" />
                  <p>No pending submissions.</p>
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => {
                const submittedDate = record.submittedAt?.toDate ? record.submittedAt.toDate() : new Date();
                const donorName = getDonorName(record);
                return (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-medium text-church-navy">
                        {submittedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {submittedDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-3">
                          {donorName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-church-navy">{donorName}</p>
                          <p className="text-xs text-gray-500">App Submission</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-lg mr-2">
                          {mapFundIdToName(record.fundId, record.fundType)}
                        </span>
                        {record.campaignId && (
                          <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg">
                            Campaign
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-church-green bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                        {formatCurrency(record.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {record.proofOfPaymentUrl ? (
                        <a 
                          href={record.proofOfPaymentUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center text-sm text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors w-max"
                        >
                          <FileImage size={16} className="mr-1.5" />
                          View Receipt
                          <ExternalLink size={12} className="ml-1.5 opacity-50" />
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400 italic">No receipt</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => handleApprove(record)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-xl transition-colors"
                          title="Approve"
                        >
                          <CheckCircle size={20} />
                        </button>
                        <button 
                          onClick={() => handleReject(record)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          title="Reject"
                        >
                          <XCircle size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
