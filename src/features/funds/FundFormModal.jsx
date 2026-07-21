import React, { useState, useEffect } from 'react';
import { X, Wallet } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import ModernDropdown from '../../components/ui/ModernDropdown';

const FUND_TYPES = [
  'tithe',
  'offering',
  'missions',
  'building',
  'ministry',
  'general',
  'special_project',
  'other'
];

export default function FundFormModal({ isOpen, onClose, fund = null }) {
  const { userProfile, currentUser } = useAuth();
  const CHURCH_ID = userProfile?.churchId || 'YmEc6C69Xz4DKRQaQZBV';
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'general',
    status: 'active',
    visibility: 'public',
    allowGiving: true,
    allowExpenses: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (fund) {
      setFormData({
        name: fund.name || '',
        description: fund.description || '',
        type: fund.type || 'general',
        status: fund.status || 'active',
        visibility: fund.visibility || 'public',
        allowGiving: fund.allowGiving !== undefined ? fund.allowGiving : true,
        allowExpenses: fund.allowExpenses !== undefined ? fund.allowExpenses : true,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        type: 'general',
        status: 'active',
        visibility: 'public',
        allowGiving: true,
        allowExpenses: true,
      });
    }
    setError('');
  }, [fund, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData(prev => ({ ...prev, [e.target.name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.name.trim()) {
        throw new Error('Fund Name is required.');
      }

      // Check for duplicate name
      const q = query(
        collection(db, 'givingFunds'), 
        where('churchId', '==', CHURCH_ID),
        where('name', '==', formData.name.trim())
      );
      const snap = await getDocs(q);
      
      const isDuplicate = snap.docs.some(d => d.id !== fund?.id);
      if (isDuplicate) {
        throw new Error('A fund with this name already exists.');
      }

      const payload = {
        ...formData,
        name: formData.name.trim(),
        churchId: CHURCH_ID,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.uid || null,
      };

      if (fund) {
        await updateDoc(doc(db, 'givingFunds', fund.id), payload);
      } else {
        await addDoc(collection(db, 'givingFunds'), {
          ...payload,
          totalGiving: 0,
          totalExpenses: 0,
          currentBalance: 0,
          createdAt: serverTimestamp(),
          createdBy: currentUser?.uid || null,
        });
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to save fund. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-church-soft overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-church-bg">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-xl bg-church-green/10 flex items-center justify-center mr-3">
              <Wallet size={20} className="text-church-green" />
            </div>
            <h2 className="text-xl font-bold text-church-navy">{fund ? 'Edit Fund' : 'Create Fund'}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
            
            <div>
              <label className="block text-sm font-medium text-church-navy mb-1.5">Fund Name *</label>
              <input 
                type="text" 
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Building Fund"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-church-navy mb-1.5">Description</label>
              <textarea 
                name="description"
                rows="2"
                value={formData.description}
                onChange={handleChange}
                placeholder="What is this fund for?"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow resize-none" 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-church-navy mb-1.5">Fund Type *</label>
                <ModernDropdown
                  value={formData.type}
                  onChange={(val) => handleChange({ target: { name: 'type', value: val } })}
                  options={FUND_TYPES.map(t => ({ 
                    value: t, 
                    label: t.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') 
                  }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-church-navy mb-1.5">Visibility *</label>
                <ModernDropdown
                  value={formData.visibility}
                  onChange={(val) => handleChange({ target: { name: 'visibility', value: val } })}
                  options={[
                    { value: 'public', label: 'Public' },
                    { value: 'members_only', label: 'Members Only' },
                    { value: 'finance_only', label: 'Finance Only' }
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                <label className="block text-sm font-medium text-church-navy mb-1.5">Status *</label>
                <ModernDropdown
                  value={formData.status}
                  onChange={(val) => handleChange({ target: { name: 'status', value: val } })}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                    { value: 'archived', label: 'Archived' }
                  ]}
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="allowGiving"
                  checked={formData.allowGiving}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-gray-300 text-church-green focus:ring-church-green"
                />
                <span className="text-sm font-medium text-church-slate">Allow Giving into this fund</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="allowExpenses"
                  checked={formData.allowExpenses}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-gray-300 text-church-green focus:ring-church-green"
                />
                <span className="text-sm font-medium text-church-slate">Allow Expenses from this fund</span>
              </label>
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
                {loading ? 'Saving...' : 'Save Fund'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
