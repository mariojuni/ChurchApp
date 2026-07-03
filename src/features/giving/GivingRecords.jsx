import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Plus, CreditCard, Edit, Trash2, TrendingUp, Search, Calendar, FileText } from 'lucide-react';
import GivingFormModal from './GivingFormModal';

export default function GivingRecords() {
  const { userProfile } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  useEffect(() => {
    if (!userProfile?.churchId) return;
    // Fetch giving without orderBy to avoid composite index requirements
    const q = query(collection(db, 'giving'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Support legacy data
      docs = docs.filter(d => d.churchId === userProfile.churchId || (!d.churchId && userProfile.churchId === 'casubiduan'));
      // Sort in memory (descending by date)
      docs.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setRecords(docs);
      setLoading(false);
    });

    return () => unsubscribe();
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
        await deleteDoc(doc(db, 'giving', id));
      } catch (error) {
        console.error("Error deleting document: ", error);
        alert("Failed to delete record.");
      }
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
  const filteredRecords = records.filter(r => 
    r.donorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.fundType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <button 
          onClick={handleAddClick}
          className="flex items-center px-5 py-2.5 bg-church-green text-white rounded-full shadow-md text-sm font-medium hover:bg-church-green/90 transition-opacity"
        >
          <Plus size={18} className="mr-2" />
          Add Record
        </button>
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
      
      {/* Table Section */}
      <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
          <h2 className="text-lg font-bold text-church-navy">Recent Transactions</h2>
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
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-church-slate flex flex-col items-center">
                    <CreditCard size={32} className="mb-3 text-gray-300" />
                    <p>No giving records found.</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-church-slate font-medium">
                      {formatDate(record.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-church-navy">
                      {record.donorName || 'Anonymous'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                        {record.fundType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-church-slate">
                      {record.method}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-green-600">
                      {formatCurrency(record.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEditClick(record)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(record.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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
