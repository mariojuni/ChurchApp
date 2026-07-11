import React, { useState, useEffect } from 'react';
import { X, DollarSign } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

export default function GivingFormModal({ isOpen, onClose, record = null }) {
  const { userProfile, currentUser } = useAuth();
  const CHURCH_ID = userProfile?.churchId || 'YmEc6C69Xz4DKRQaQZBV';
  const [formData, setFormData] = useState({
    donorName: '',
    amount: '',
    date: '',
    fundType: 'Tithe',
    method: 'Cash',
    notes: '',
    proofUrl: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (record) {
      setFormData({
        donorName: record.donorName || '',
        amount: record.amount ? record.amount.toString() : '',
        date: record.date || '',
        fundType: record.fundType || 'Tithe',
        method: record.method || 'Cash',
        notes: record.notes || '',
        proofUrl: record.proofUrl || ''
      });
    } else {
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        donorName: '',
        amount: '',
        date: today,
        fundType: 'Tithe',
        method: 'Cash',
        notes: '',
        proofUrl: ''
      });
    }
    setError('');

    // Fetch members for dropdown
    if (isOpen) {
      const fetchMembers = async () => {
        try {
          if (!CHURCH_ID) return;
          const q = query(collection(db, 'users'), where('churchId', '==', CHURCH_ID));
          const snap = await getDocs(q);
          const activeMembers = snap.docs
            .map(d => d.data())
            .filter(data => data.membershipStatus !== 'Archived' && data.name)
            .map(data => data.name)
            .sort((a, b) => a.localeCompare(b));
          setMembers(activeMembers);
        } catch (e) {
          console.error("Failed to fetch members for dropdown", e);
        }
      };
      fetchMembers();
    }
  }, [record, isOpen, userProfile?.churchId]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const amountNum = parseFloat(formData.amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error("Please enter a valid amount.");
      }

      const payload = {
        ...formData,
        amount: amountNum,
      };

      if (record) {
        await updateDoc(doc(db, 'givingRecords', record.id), {
          ...payload,
          churchId: CHURCH_ID,
          updatedAt: serverTimestamp(),
          updatedBy: currentUser?.uid || null
        });
      } else {
        await addDoc(collection(db, 'givingRecords'), {
          ...payload,
          churchId: CHURCH_ID,
          userId: currentUser?.uid,
          createdAt: serverTimestamp(),
          createdBy: currentUser?.uid || null,
          churchId: userProfile?.churchId || 'YmEc6C69Xz4DKRQaQZBV',
          status: 'completed', // Add completed status for manual entries
          userId: currentUser?.uid // Required by native rules
        });
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to save giving record. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-church-soft overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-church-bg">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-xl bg-church-green/10 flex items-center justify-center mr-3">
              <DollarSign size={20} className="text-church-green" />
            </div>
            <h2 className="text-xl font-bold text-church-navy">{record ? 'Edit Record' : 'Add Contribution'}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
            
            <div>
              <label className="block text-sm font-medium text-church-navy mb-1.5">Donor Name (Optional)</label>
              <input 
                type="text" 
                name="donorName"
                list="donorList"
                value={formData.donorName}
                onChange={handleChange}
                placeholder="e.g. John Doe (Leave blank for Anonymous)"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow" 
              />
              <datalist id="donorList">
                <option value="Anonymous" />
                {members.map(name => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-church-navy mb-1.5">Amount *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 font-medium">₱</span>
                  </div>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    name="amount"
                    required
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow font-medium text-church-navy" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-church-navy mb-1.5">Date *</label>
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
                <label className="block text-sm font-medium text-church-navy mb-1.5">Fund Type *</label>
                <select 
                  name="fundType"
                  required
                  value={formData.fundType}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow bg-white appearance-none" 
                >
                  <option value="Tithe">Tithe</option>
                  <option value="Offering">Offering</option>
                  <option value="Building Fund">Building Fund</option>
                  <option value="Altar Project">Altar Project</option>
                  <option value="Special Project">Special Project</option>
                  <option value="Others">Others</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-church-navy mb-1.5">Method *</label>
                <select 
                  name="method"
                  required
                  value={formData.method}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow bg-white appearance-none" 
                >
                  <option value="Cash">Cash</option>
                  <option value="GCash">GCash</option>
                  <option value="Maya">Maya</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Check">Check</option>
                  <option value="Online Payment">Online Payment</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-church-navy mb-1.5">Notes (Optional)</label>
              <textarea 
                name="notes"
                rows="2"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Check number, specific designation, etc."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow resize-none" 
              />
            </div>

            <div className="pt-6 border-t border-gray-100 flex justify-end space-x-3">
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
                {loading ? 'Saving...' : 'Save Record'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
