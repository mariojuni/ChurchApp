import React, { useState, useEffect } from 'react';
import { X, Upload } from 'lucide-react';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';

const CHURCH_ID = 'YmEc6C69Xz4DKRQaQZBV'; 

const CATEGORIES = [
  'Utilities',
  'Ministry Supplies',
  'Events & Programs',
  'Salaries & Stipends',
  'Facility Maintenance',
  'Missions & Outreach',
  'Other'
];

export default function ExpenseFormModal({ isOpen, onClose, expense = null }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    payee: '',
    category: 'Utilities',
    description: '',
  });
  
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (expense) {
      setFormData({
        date: expense.date || new Date().toISOString().split('T')[0],
        amount: expense.amount || '',
        payee: expense.payee || '',
        category: expense.category || 'Utilities',
        description: expense.description || '',
      });
    } else {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        payee: '',
        category: 'Utilities',
        description: '',
      });
    }
    setReceiptFile(null);
    setUploadProgress(0);
    setError('');
  }, [expense, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const expensesColRef = collection(db, 'churches', CHURCH_ID, 'expenses');
      const docRef = expense ? doc(db, 'churches', CHURCH_ID, 'expenses', expense.id) : doc(expensesColRef);

      let receiptUrl = expense?.receiptUrl || null;

      if (receiptFile) {
        const storageRef = ref(storage, `receipts/${CHURCH_ID}/${docRef.id}_${receiptFile.name}`);
        const uploadTask = uploadBytesResumable(storageRef, receiptFile);

        await new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (err) => reject(err),
            async () => {
              receiptUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      }

      const expenseDoc = {
        ...formData,
        amount: parseFloat(formData.amount) || 0,
        receiptUrl,
        updatedAt: serverTimestamp(),
      };

      if (!expense) {
        expenseDoc.createdAt = serverTimestamp();
      }

      await setDoc(docRef, expenseDoc, { merge: true });
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save expense. Please try again.');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-church-soft overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-church-bg">
          <h2 className="text-xl font-bold text-church-navy">{expense ? 'Edit Expense' : 'Log Expense'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-church-navy mb-1">Amount (₱) *</label>
                <input 
                  type="number" 
                  step="0.01"
                  name="amount"
                  required
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow text-lg font-bold text-church-green" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-church-navy mb-1">Date *</label>
                <input 
                  type="date" 
                  name="date"
                  required
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-church-navy mb-1">Payee / Vendor *</label>
                <input 
                  type="text" 
                  name="payee"
                  required
                  value={formData.payee}
                  onChange={handleChange}
                  placeholder="e.g. Meralco"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-church-navy mb-1">Category *</label>
                <select 
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow bg-white"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-church-navy mb-1">Description</label>
              <textarea 
                name="description"
                rows="2"
                value={formData.description}
                onChange={handleChange}
                placeholder="What was this for?"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow resize-none" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-church-navy mb-1">Receipt Upload (Optional)</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:bg-gray-50 transition-colors">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-8 w-8 text-gray-400" />
                  <div className="flex text-sm text-gray-600 justify-center">
                    <label htmlFor="receipt-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-church-green hover:text-church-green/80 focus-within:outline-none">
                      <span>{receiptFile ? receiptFile.name : 'Upload a file'}</span>
                      <input id="receipt-upload" name="receipt-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*,.pdf" />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, PDF up to 5MB</p>
                </div>
              </div>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                  <div className="bg-church-green h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100">
              <button 
                type="button" 
                onClick={onClose}
                disabled={loading}
                className="px-5 py-2.5 bg-white border border-gray-300 rounded-full text-sm font-medium text-church-slate hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="px-6 py-2.5 bg-church-green text-white rounded-full text-sm font-medium hover:bg-church-green/90 transition-colors disabled:opacity-50 shadow-sm"
              >
                {loading ? 'Saving...' : 'Save Expense'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
