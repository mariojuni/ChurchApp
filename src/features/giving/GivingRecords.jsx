import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, where, setDoc, updateDoc, increment, getDocs } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Plus, CreditCard, Edit, Trash2, TrendingUp, Search, Calendar, FileText, CheckCircle, XCircle, FileImage, ExternalLink } from 'lucide-react';
import GivingFormModal from './GivingFormModal';

export default function GivingRecords() {
  const { userProfile, currentUser } = useAuth();
  const CHURCH_ID = userProfile?.churchId || 'YmEc6C69Xz4DKRQaQZBV';
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Tabs state
  const [activeTab, setActiveTab] = useState('ledger');
  const [pendingRecords, setPendingRecords] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  useEffect(() => {
    if (!CHURCH_ID) return;
    const q = query(
      collection(db, 'givingRecords'), 
      where('churchId', '==', CHURCH_ID),
      where('status', 'in', ['completed', 'approved'])
    );
    const unsubscribeLedger = onSnapshot(q, (snapshot) => {
      let docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort in memory (descending by date)
      docs.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setRecords(docs);
      setLoading(false);
    }, (error) => {
      console.error("Ledger error:", error);
      setLoading(false);
    });

    // Fetch Pending App Submissions
    const qPending = query(
      collection(db, 'givingRecords'),
      where('churchId', '==', CHURCH_ID),
      where('status', '==', 'pending')
    );
    const unsubscribePending = onSnapshot(qPending, (snapshot) => {
      let docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      docs.sort((a, b) => {
        const timeA = a.submittedAt?.seconds || 0;
        const timeB = b.submittedAt?.seconds || 0;
        return timeB - timeA;
      });
      setPendingRecords(docs);
    }, (error) => {
      console.error("Pending records error:", error);
    });

    // Fetch Users to map names
    const fetchUsers = async () => {
      try {
        const qUsers = query(collection(db, 'users'), where('churchId', '==', CHURCH_ID));
        const unsubscribeUsers = onSnapshot(qUsers, (snap) => {
          const map = {};
          snap.forEach(d => {
            map[d.id] = d.data().name || 'Anonymous';
          });
          setUsersMap(map);
        }, (error) => {
          console.error("Users map error:", error);
        });
        return unsubscribeUsers;
      } catch (err) {
        console.error("Error fetching users map:", err);
      }
    };
    let unsubscribeUsers;
    fetchUsers().then(unsub => unsubscribeUsers = unsub);

    return () => {
      unsubscribeLedger();
      unsubscribePending();
      if (unsubscribeUsers) unsubscribeUsers();
    };
  }, [userProfile?.churchId]);

  const handleAddClick = () => {
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (record) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (id) => {
    if (window.confirm('Are you sure you want to delete this giving record? This cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'givingRecords', id));
      } catch (error) {
        console.error("Error deleting document: ", error);
        alert("Failed to delete record.");
      }
    }
  };

  const mapFundIdToName = (fundId) => {
    if (!fundId) return 'Tithe';
    const lower = fundId.toLowerCase();
    if (lower.includes('tithe')) return 'Tithe';
    if (lower.includes('offering')) return 'Offering';
    if (lower.includes('building')) return 'Building Fund';
    if (lower.includes('mission')) return 'Missions';
    return 'Others';
  };

  const handleApproveSubmission = async (record) => {
    if (!window.confirm('Are you sure you want to approve this giving record? This will mark it as completed.')) return;
    
    try {
      const recordRef = doc(db, 'givingRecords', record.id);
      
      const submittedDate = record.submittedAt?.toDate() || new Date();
      const dateString = submittedDate.toISOString().split('T')[0];
      const donorName = usersMap[record.userId] || 'Anonymous';

      // Update existing app submission with ledger fields
      await updateDoc(recordRef, {
        status: 'completed',
        approvedAt: new Date(),
        approvedBy: currentUser.uid,
        donorName: donorName,
        date: dateString,
        fundType: mapFundIdToName(record.fundId),
        method: record.paymentMethod || 'Cash',
        notes: record.note || '',
        proofUrl: record.proofOfPaymentUrl || ''
      });
      
      // If linked to a campaign, increment the raised amount
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
      alert('Giving record approved successfully!');
    } catch (err) {
      console.error("Error approving submission", err);
      alert("Failed to approve submission.");
    }
  };

  const handleMigrateData = async () => {
    if (!window.confirm("Are you sure you want to migrate legacy giving data to givingRecords?")) return;
    setLoading(true);
    try {
      const givingRef = collection(db, 'giving');
      const snap = await getDocs(query(givingRef, where('churchId', '==', CHURCH_ID)));
      
      let migratedCount = 0;
      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const newRef = doc(collection(db, 'givingRecords'));
        await setDoc(newRef, {
          ...data,
          status: 'completed',
          migratedAt: new Date()
        });
        // Optional: delete from old collection after migrating
        // await deleteDoc(doc(db, 'giving', docSnap.id));
        migratedCount++;
      }
      alert(`Migrated ${migratedCount} legacy records to givingRecords!`);
    } catch (err) {
      console.error("Migration error:", err);
      alert("Error migrating data.");
    }
    setLoading(false);
  };

  const handleRejectSubmission = async (record) => {
    const reason = window.prompt("Please enter a reason for rejecting this giving submission:");
    if (reason === null) return; // User cancelled
    
    try {
      await updateDoc(doc(db, 'givingRecords', record.id), {
        status: 'rejected',
        rejectionReason: reason || 'Declined by admin',
        reviewedBy: currentUser.uid,
        reviewedAt: new Date()
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

  // Calculations for KPIs
  const totalGiving = useMemo(() => {
    return records.reduce((sum, r) => sum + (r.amount || 0), 0);
  }, [records]);
  
  const currentMonthTotal = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    return records.reduce((sum, r) => {
      if (!r.date) return sum;
      const rDate = new Date(r.date + 'T00:00:00');
      if (rDate.getMonth() === currentMonth && rDate.getFullYear() === currentYear) {
        return sum + (r.amount || 0);
      }
      return sum;
    }, 0);
  }, [records]);

  // Filter records
  const filteredRecords = records.filter(r => {
    const search = searchTerm.toLowerCase();
    if (!search) return true;
    const donorMatch = (r.donorName || '').toLowerCase().includes(search);
    const fundMatch = (r.fundType || '').toLowerCase().includes(search);
    return donorMatch || fundMatch;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount || 0);
  };
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const dateObj = new Date(dateStr + 'T00:00:00'); 
    return dateObj.toLocaleDateString(undefined, options);
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-church-navy">Giving Records</h1>
          <p className="text-sm text-church-slate mt-1">Manage tithes, offerings, and donations.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleMigrateData}
            className="flex items-center px-4 py-2.5 bg-yellow-500 text-white rounded-full shadow-md text-sm font-medium hover:bg-yellow-600 transition-opacity"
          >
            Migrate Legacy Data
          </button>
          <button 
            onClick={handleAddClick}
            className="flex items-center px-5 py-2.5 bg-church-green text-white rounded-full shadow-md text-sm font-medium hover:bg-church-green/90 transition-opacity"
          >
            <Plus size={18} className="mr-2" />
            Add Record
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow-church-soft border border-gray-100 flex items-center">
          <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 mr-4">
            <TrendingUp size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-church-slate">Total Giving (All Time)</p>
            <p className="text-2xl font-bold text-church-navy">{formatCurrency(totalGiving)}</p>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-church-soft border border-gray-100 flex items-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mr-4">
            <Calendar size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-church-slate">This Month</p>
            <p className="text-2xl font-bold text-church-navy">{formatCurrency(currentMonthTotal)}</p>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-church-soft border border-gray-100 flex items-center">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 mr-4">
            <FileText size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-church-slate">Total Records</p>
            <p className="text-2xl font-bold text-church-navy">{records.length}</p>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`py-3 px-6 text-sm font-medium transition-colors border-b-2 ${activeTab === 'ledger' ? 'border-church-green text-church-green' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Ledger
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`py-3 px-6 text-sm font-medium transition-colors border-b-2 flex items-center ${activeTab === 'pending' ? 'border-church-green text-church-green' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Pending Verifications
          {pendingRecords.length > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {pendingRecords.length}
            </span>
          )}
        </button>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
          <h2 className="text-lg font-bold text-church-navy">
            {activeTab === 'ledger' ? 'Recent Transactions' : 'Pending App Submissions'}
          </h2>
          <div className="relative w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search donor or fund..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent text-sm transition-shadow"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              {activeTab === 'ledger' ? (
                <tr className="bg-church-bg/50 text-church-slate text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold rounded-tl-3xl">Date</th>
                  <th className="px-6 py-4 font-semibold">Donor Name</th>
                  <th className="px-6 py-4 font-semibold">Fund Type</th>
                  <th className="px-6 py-4 font-semibold">Method</th>
                  <th className="px-6 py-4 font-semibold">Amount</th>
                  <th className="px-6 py-4 font-semibold rounded-tr-3xl text-right">Actions</th>
                </tr>
              ) : (
                <tr className="bg-church-bg/50 text-church-slate text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold rounded-tl-3xl">Submitted</th>
                  <th className="px-6 py-4 font-semibold">Donor Name</th>
                  <th className="px-6 py-4 font-semibold">Fund Type</th>
                  <th className="px-6 py-4 font-semibold">Amount</th>
                  <th className="px-6 py-4 font-semibold">Proof</th>
                  <th className="px-6 py-4 font-semibold rounded-tr-3xl text-right">Actions</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-church-slate">
                    Loading records...
                  </td>
                </tr>
              ) : activeTab === 'ledger' ? (
                filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-church-slate flex flex-col items-center">
                      <CreditCard size={32} className="mb-3 text-gray-300" />
                      <p>No giving records found.</p>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => {
                    // Fallbacks for records approved during the bug that didn't map ledger fields
                    const date = record.date || (record.submittedAt ? new Date(record.submittedAt.seconds * 1000).toISOString().split('T')[0] : '');
                    const donorName = record.donorName || usersMap[record.userId] || 'Anonymous';
                    const fundType = record.fundType || mapFundIdToName(record.fundId);
                    const method = record.method || record.paymentMethod || 'Cash';
                    const proofUrl = record.proofUrl || record.proofOfPaymentUrl || '';

                    return (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-church-slate font-medium">
                        {formatDate(date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-church-navy">
                        {donorName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                          {fundType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-church-slate">
                        {method}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-green-600">
                        {formatCurrency(record.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {proofUrl && (
                            <a 
                              href={proofUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-church-blue hover:text-church-blue/80 p-1 rounded-md hover:bg-blue-50 transition-colors"
                              title="View Proof"
                            >
                              <FileImage size={18} />
                            </a>
                          )}
                          <button 
                            onClick={() => handleEditClick(record)}
                            className="text-church-slate hover:text-church-navy p-1 rounded-md hover:bg-gray-100 transition-colors"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(record.id)}
                            className="text-red-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )})
                )
              ) : (
                pendingRecords.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-church-slate flex flex-col items-center">
                      <CheckCircle size={32} className="mb-3 text-gray-300" />
                      <p>No pending submissions.</p>
                    </td>
                  </tr>
                ) : (
                  pendingRecords.map((record) => {
                    const submittedDate = record.submittedAt?.toDate ? record.submittedAt.toDate() : new Date();
                    return (
                      <tr key={record.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap text-church-slate font-medium">
                          {submittedDate.toLocaleDateString()} {submittedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-bold text-church-navy">
                          {usersMap[record.userId] || 'Anonymous'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                            {mapFundIdToName(record.fundId)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-bold text-green-600">
                          {formatCurrency(record.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {record.proofOfPaymentUrl ? (
                            <a href={record.proofOfPaymentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:underline text-sm font-medium">
                              <ExternalLink size={14} className="mr-1" />
                              View Receipt
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs italic">No receipt</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button 
                              onClick={() => handleApproveSubmission(record)}
                              className="px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors text-xs font-bold flex items-center"
                              title="Approve"
                            >
                              <CheckCircle size={14} className="mr-1" />
                              Approve
                            </button>
                            <button 
                              onClick={() => handleRejectSubmission(record)}
                              className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors text-xs font-bold flex items-center"
                              title="Reject"
                            >
                              <XCircle size={14} className="mr-1" />
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      <GivingFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        record={editingRecord}
      />
    </div>
  );
}
