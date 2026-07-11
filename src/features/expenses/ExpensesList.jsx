import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { Plus, Receipt, Edit, Trash2, ArrowUpRight, TrendingDown } from 'lucide-react';
import ExpenseFormModal from './ExpenseFormModal';
import { useAuth } from '../../context/AuthContext';

export default function ExpensesList() {
  const { userProfile } = useAuth();
  const CHURCH_ID = userProfile?.churchId || 'YmEc6C69Xz4DKRQaQZBV';
  
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  useEffect(() => {
    if (!CHURCH_ID) return;
    const q = query(
      collection(db, 'givingExpenses'), 
      where('churchId', '==', CHURCH_ID)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      docs.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setExpenses(docs);
      setLoading(false);
    }, (err) => {
      console.error("Expenses fetch error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [CHURCH_ID]);

  const handleAddClick = () => {
    setEditingExpense(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (expense) => {
    setEditingExpense(expense);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (id, payee) => {
    if (window.confirm(`Are you sure you want to delete the expense for "${payee}"?`)) {
      try {
        await deleteDoc(doc(db, 'givingExpenses', id));
      } catch (error) {
        console.error("Error deleting document: ", error);
        alert("Failed to delete expense.");
      }
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const dateObj = new Date(dateStr + 'T00:00:00'); 
    return dateObj.toLocaleDateString(undefined, options);
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-church-navy">Expenses</h1>
          <p className="text-sm text-church-slate mt-1">Track and manage church outflows and receipts.</p>
        </div>
        <button 
          onClick={handleAddClick}
          className="flex items-center px-5 py-2.5 bg-church-green text-white rounded-full shadow-md text-sm font-medium hover:bg-church-green/90 transition-opacity"
        >
          <Plus size={18} className="mr-2" />
          Log Expense
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow-church-soft border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-church-slate mb-1">Total Expenses Recorded</p>
            <h3 className="text-3xl font-bold text-red-600">
              ₱{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600">
            <TrendingDown size={24} />
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-church-slate">Loading expenses...</p>
        </div>
      ) : expenses.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 p-12 flex flex-col items-center justify-center flex-1">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
            <Receipt size={32} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-church-navy mb-2">No expenses logged</h3>
          <p className="text-church-slate text-center max-w-sm mb-6">Record your first church expense to start tracking outflows.</p>
          <button 
            onClick={handleAddClick}
            className="px-6 py-3 bg-white border border-gray-300 text-church-navy rounded-full text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
          >
            Log Expense
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Payee</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Amount</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Receipt</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6 text-sm text-church-slate whitespace-nowrap">
                      {formatDate(expense.date)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm font-bold text-church-navy">{expense.payee}</div>
                      {expense.description && (
                        <div className="text-xs text-gray-400 line-clamp-1 mt-0.5">{expense.description}</div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                        {expense.category}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm font-bold text-red-600 text-right whitespace-nowrap">
                      ₱{(expense.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {expense.receiptUrl ? (
                        <a 
                          href={expense.receiptUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                          title="View Receipt"
                        >
                          <Receipt size={16} />
                        </a>
                      ) : (
                        <span className="text-gray-300 text-xs">-</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <button 
                        onClick={() => handleEditClick(expense)}
                        className="text-gray-400 hover:text-church-navy p-1.5 transition-colors inline-block"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(expense.id, expense.payee)}
                        className="text-gray-400 hover:text-red-600 p-1.5 transition-colors inline-block ml-2"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ExpenseFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        expense={editingExpense}
      />
    </div>
  );
}
