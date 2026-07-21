import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Plus, Wallet, Edit, Trash2, Archive, Eye } from 'lucide-react';
import FundFormModal from './FundFormModal';
import { canManageFunds, canCreateFund, canEditFund, canArchiveFund } from '../../utils/financePermissions';

export default function FundsList() {
  const { userProfile } = useAuth();
  const CHURCH_ID = userProfile?.churchId || 'YmEc6C69Xz4DKRQaQZBV';
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFund, setEditingFund] = useState(null);

  useEffect(() => {
    if (!CHURCH_ID) return;
    
    const q = query(
      collection(db, 'givingFunds'), 
      where('churchId', '==', CHURCH_ID)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      docs.sort((a, b) => {
        if (a.status === b.status) {
           return a.name.localeCompare(b.name);
        }
        if (a.status === 'active') return -1;
        if (b.status === 'active') return 1;
        if (a.status === 'inactive') return -1;
        return 1;
      });

      setFunds(docs);
      setLoading(false);
    }, (error) => {
      console.error("FundsList error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [CHURCH_ID]);

  const handleAddClick = () => {
    setEditingFund(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (fund) => {
    setEditingFund(fund);
    setIsModalOpen(true);
  };

  const handleArchiveClick = async (fund) => {
    if (window.confirm(`Are you sure you want to archive the ${fund.name} fund?`)) {
      try {
        const { updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'givingFunds', fund.id), { status: 'archived' });
      } catch (error) {
        console.error("Error archiving fund: ", error);
        alert("Failed to archive fund.");
      }
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount || 0);
  };

  const getStatusBadge = (status) => {
    if (status === 'active') return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700">Active</span>;
    if (status === 'inactive') return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-yellow-50 text-yellow-700">Inactive</span>;
    return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">Archived</span>;
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-church-navy">Funds Management</h1>
          <p className="text-sm text-church-slate mt-1">Manage and track your church's designated funds.</p>
        </div>
        {canCreateFund(userProfile) && (
          <button 
            onClick={handleAddClick}
            className="flex items-center px-5 py-2.5 bg-church-green text-white rounded-full shadow-md text-sm font-medium hover:bg-church-green/90 transition-opacity"
          >
            <Plus size={18} className="mr-2" />
            Create Fund
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-white">
          <h2 className="text-lg font-bold text-church-navy">
            All Funds
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-church-bg/50 text-church-slate text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold rounded-tl-3xl">Fund Name</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Usage</th>
                <th className="px-6 py-4 font-semibold rounded-tr-3xl text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-church-slate">
                    Loading funds...
                  </td>
                </tr>
              ) : funds.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-church-slate flex flex-col items-center">
                    <Wallet size={32} className="mb-3 text-gray-300" />
                    <p>No funds found. Create one to get started.</p>
                  </td>
                </tr>
              ) : (
                funds.map((fund) => {
                  return (
                  <tr key={fund.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-church-navy">{fund.name}</span>
                        {fund.description && <span className="text-xs text-church-slate mt-0.5 truncate max-w-xs">{fund.description}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <span className="capitalize">{fund.type?.replace('_', ' ')}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(fund.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-church-slate">
                      <div className="flex flex-col space-y-1">
                        {fund.allowGiving && <span className="flex items-center text-green-600"><Plus size={12} className="mr-1"/> Giving</span>}
                        {fund.allowExpenses && <span className="flex items-center text-red-500"><Plus size={12} className="mr-1 transform rotate-45"/> Expenses</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEditFund(userProfile) && (
                          <button 
                            onClick={() => handleEditClick(fund)}
                            className="text-church-slate hover:text-church-navy p-1 rounded-md hover:bg-gray-100 transition-colors"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>
                        )}
                        {canArchiveFund(userProfile) && fund.status !== 'archived' && (
                          <button 
                            onClick={() => handleArchiveClick(fund)}
                            className="text-yellow-500 hover:text-yellow-600 p-1 rounded-md hover:bg-yellow-50 transition-colors"
                            title="Archive"
                          >
                            <Archive size={18} />
                          </button>
                        )}
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

      <FundFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        fund={editingFund}
      />
    </div>
  );
}
