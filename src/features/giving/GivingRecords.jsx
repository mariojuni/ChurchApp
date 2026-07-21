import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, onSnapshot, deleteDoc, doc, where, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Plus, CreditCard, Edit, Trash2, Search, ExternalLink } from 'lucide-react';
import GivingFormModal from './GivingFormModal';
import DateRangeFilter from '../../components/ui/DateRangeFilter';

export default function GivingRecords() {
  const { userProfile } = useAuth();
  const CHURCH_ID = userProfile?.churchId || 'YmEc6C69Xz4DKRQaQZBV';
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [usersMap, setUsersMap] = useState({});
  const [fundsMap, setFundsMap] = useState({});
  const [fundsList, setFundsList] = useState([]);
  const [selectedFundId, setSelectedFundId] = useState('all');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  // Date Filter state
  const [dateFilter, setDateFilter] = useState({
    filterType: 'thisMonth',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    if (!CHURCH_ID) return;
    
    let constraints = [
      where('churchId', '==', CHURCH_ID)
    ];

    const q = query(collection(db, 'givingRecords'), ...constraints);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter by date range in memory to avoid Firestore index requirements
      if (dateFilter.startDate) {
        docs = docs.filter(d => {
          const dDate = d.transactionDate || d.date || '';
          return dDate >= dateFilter.startDate;
        });
      }
      if (dateFilter.endDate) {
        docs = docs.filter(d => {
          const dDate = d.transactionDate || d.date || '';
          return dDate <= dateFilter.endDate;
        });
      }
      
      // Sort in memory (descending by date)
      docs.sort((a, b) => new Date(b.transactionDate || b.date || 0) - new Date(a.transactionDate || a.date || 0));
      setRecords(docs);
      setLoading(false);
    }, (error) => {
      console.error("GivingRecords error:", error);
      setLoading(false);
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
        });
        return unsubscribeUsers;
      } catch (err) {
        console.error("Error fetching users map:", err);
      }
    };
    
    // Fetch Funds to map names and filter
    const fetchFunds = async () => {
      try {
        const qFunds = query(collection(db, 'givingFunds'), where('churchId', '==', CHURCH_ID));
        const unsubscribeFunds = onSnapshot(qFunds, (snap) => {
          const map = {};
          const list = [];
          snap.forEach(d => {
            const data = d.data();
            map[d.id] = data.name;
            if (data.status === 'active' && data.allowGiving !== false) {
              list.push({ id: d.id, name: data.name });
            }
          });
          list.sort((a, b) => a.name.localeCompare(b.name));
          setFundsMap(map);
          setFundsList(list);
        });
        return unsubscribeFunds;
      } catch (err) {
        console.error("Error fetching funds:", err);
      }
    };

    let unsubscribeUsers;
    let unsubscribeFunds;
    fetchUsers().then(unsub => unsubscribeUsers = unsub);
    fetchFunds().then(unsub => unsubscribeFunds = unsub);

    return () => {
      unsubscribe();
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeFunds) unsubscribeFunds();
    };
  }, [userProfile?.churchId, dateFilter.startDate, dateFilter.endDate]);

  const handleAddClick = () => {
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (record) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (record) => {
    if (window.confirm('Are you sure you want to delete this giving record? This cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'givingRecords', record.id));
        
        // If the record was tied to a campaign, decrement the raised amount
        if (record.campaignId && record.amount) {
          const { increment, updateDoc } = await import('firebase/firestore');
          await updateDoc(doc(db, 'givingCampaigns', record.campaignId), {
            raisedAmount: increment(-record.amount)
          });
        }
      } catch (error) {
        console.error("Error deleting document: ", error);
        alert("Failed to delete record.");
      }
    }
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
        migratedCount++;
      }
      alert(`Migrated ${migratedCount} legacy records to givingRecords!`);
    } catch (err) {
      console.error("Migration error:", err);
      alert("Error migrating data.");
    }
    setLoading(false);
  };

  // Filter records
  const ledgerRecords = records.filter(r => ['completed', 'approved'].includes(r.status));

  const filteredLedgerRecords = ledgerRecords.filter(r => {
    // Check fund filter first
    if (selectedFundId !== 'all' && r.fundId !== selectedFundId) {
       // if it doesn't match fundId, check if it matches legacy fundType (as string)
       const selectedFundName = fundsMap[selectedFundId] || '';
       if (r.fundType !== selectedFundName && r.fundId !== selectedFundId) {
          return false;
       }
    }

    const search = debouncedSearchTerm.toLowerCase();
    if (!search) return true;
    const donorMatch = (r.donorName || '').toLowerCase().includes(search);
    const fundMatch = (r.fundType || mapFundIdToName(r.fundId, r.fundType) || '').toLowerCase().includes(search);
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
          <h1 className="text-3xl font-bold text-church-navy">Giving Ledger</h1>
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

      {/* Date Filter & Search Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-4 rounded-3xl shadow-church-soft border border-gray-100 space-y-4 md:space-y-0">
        <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <DateRangeFilter onChange={setDateFilter} defaultFilter="thisMonth" />
          <select 
            value={selectedFundId} 
            onChange={(e) => setSelectedFundId(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent text-sm bg-white"
          >
            <option value="all">All Funds</option>
            {fundsList.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        <div className="relative w-full md:w-72">
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

      {/* Table Section */}
      <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
          <h2 className="text-lg font-bold text-church-navy">
            Recent Transactions
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-church-bg/50 text-church-slate text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold rounded-tl-3xl">Date</th>
                <th className="px-6 py-4 font-semibold">Donor Name</th>
                <th className="px-6 py-4 font-semibold">Fund Type</th>
                <th className="px-6 py-4 font-semibold">Method</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold rounded-tr-3xl text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-church-slate">
                    Loading records...
                  </td>
                </tr>
              ) : filteredLedgerRecords.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-church-slate flex flex-col items-center">
                    <CreditCard size={32} className="mb-3 text-gray-300" />
                    <p>No giving transactions found for the selected date range.</p>
                  </td>
                </tr>
              ) : (
                filteredLedgerRecords.map((record) => {
                  const date = record.transactionDate || record.date || (record.submittedAt ? new Date(record.submittedAt.seconds * 1000).toISOString().split('T')[0] : '');
                  const donorName = record.donorName || usersMap[record.userId] || 'Anonymous';
                  const fundType = mapFundIdToName(record.fundId, record.fundType);
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
                            <ExternalLink size={18} />
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
                          onClick={() => handleDeleteClick(record)}
                          className="text-red-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
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

      <GivingFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        editingRecord={editingRecord}
      />
    </div>
  );
}
