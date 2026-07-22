import React, { useState, useEffect, useMemo } from 'react';
import { X, DollarSign } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import ModernDropdown from '../../components/ui/ModernDropdown';
import ModernDatePicker from '../../components/ui/ModernDatePicker';

const normalizeMethod = (m) => {
  if (!m) return 'Cash';
  const raw = String(m).trim();
  const lower = raw.toLowerCase().replace(/_/g, ' ');
  if (lower === 'cash') return 'Cash';
  if (lower === 'gcash') return 'GCash';
  if (lower === 'maya') return 'Maya';
  if (lower === 'bank transfer' || lower === 'bank') return 'Bank Transfer';
  if (lower === 'check') return 'Check';
  if (lower === 'online payment' || lower === 'online') return 'Online Payment';
  return raw.split(/[\s_]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

export default function GivingFormModal({ isOpen, onClose, record = null, editingRecord = null }) {
  const { userProfile, currentUser } = useAuth();
  const CHURCH_ID = userProfile?.churchId || 'YmEc6C69Xz4DKRQaQZBV';
  const activeRecord = record || editingRecord;

  const [formData, setFormData] = useState({
    userId: '',
    donorName: '',
    amount: '',
    date: '',
    transactionDate: '',
    fundId: '',
    fundType: '',
    method: 'Cash',
    campaignId: '',
    notes: '',
    proofUrl: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [members, setMembers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [funds, setFunds] = useState([]);

  const donorOptions = useMemo(() => {
    const opts = [{ value: '', label: 'Anonymous' }];
    members.forEach(m => {
      opts.push({ value: m.id, label: m.name });
    });
    if (formData.userId && !opts.some(o => o.value === formData.userId)) {
      opts.push({ value: formData.userId, label: formData.donorName || 'Selected Member' });
    }
    return opts;
  }, [members, formData.userId, formData.donorName]);

  useEffect(() => {
    if (activeRecord) {
      setFormData({
        userId: activeRecord.userId || '',
        donorName: activeRecord.donorName || '',
        amount: activeRecord.amount !== undefined && activeRecord.amount !== null ? activeRecord.amount.toString() : '',
        date: activeRecord.date || activeRecord.transactionDate || '',
        transactionDate: activeRecord.transactionDate || activeRecord.date || '',
        fundId: activeRecord.fundId || '',
        fundType: activeRecord.fundType || '',
        method: normalizeMethod(activeRecord.method || activeRecord.paymentMethod || 'Cash'),
        campaignId: activeRecord.campaignId || '',
        notes: activeRecord.notes || activeRecord.note || '',
        proofUrl: activeRecord.proofUrl || activeRecord.proofOfPaymentUrl || ''
      });
    } else {
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        userId: '',
        donorName: '',
        amount: '',
        date: today,
        transactionDate: today,
        fundId: '',
        fundType: '',
        method: 'Cash',
        campaignId: '',
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
            .map(d => {
              const u = d.data();
              if (u.membershipStatus === 'Archived') return null;
              let name = '';
              if (u.firstName || u.lastName) {
                const f = (u.firstName || '').trim().split(/[\s-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                const l = (u.lastName || '').trim().split(/[\s-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                const m = u.middleName ? u.middleName.trim().charAt(0).toUpperCase() + '.' : '';
                name = [f, m, l].filter(Boolean).join(' ');
              }
              if (!name) name = u.name || u.displayName;
              return { id: d.id, name: name || 'Anonymous' };
            })
            .filter(Boolean)
            .sort((a, b) => a.name.localeCompare(b.name));

          setMembers(activeMembers);

          if (activeRecord && !activeRecord.userId && activeRecord.donorName) {
            const matched = activeMembers.find(m => m.name.toLowerCase() === activeRecord.donorName.toLowerCase());
            if (matched) {
              setFormData(prev => ({ ...prev, userId: matched.id }));
            }
          }
        } catch (e) {
          console.error("Failed to fetch members for dropdown", e);
        }
      };
      
      const fetchCampaigns = async () => {
        try {
          if (!CHURCH_ID) return;
          const q = query(collection(db, 'givingCampaigns'), where('churchId', '==', CHURCH_ID));
          const snap = await getDocs(q);
          const activeCampaigns = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(c => c.status === 'active')
            .sort((a, b) => a.title.localeCompare(b.title));
          setCampaigns(activeCampaigns);
        } catch (e) {
          console.error("Failed to fetch campaigns for dropdown", e);
        }
      };

      const fetchFunds = async () => {
        try {
          if (!CHURCH_ID) return;
          const q = query(collection(db, 'givingFunds'), where('churchId', '==', CHURCH_ID), where('status', '==', 'active'));
          const snap = await getDocs(q);
          const activeFunds = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(f => f.allowGiving !== false)
            .sort((a, b) => a.name.localeCompare(b.name));
          setFunds(activeFunds);
          
          if (!activeRecord && activeFunds.length > 0) {
             setFormData(prev => ({ ...prev, fundId: activeFunds[0].id, fundType: activeFunds[0].name }));
          }
        } catch (e) {
          console.error("Failed to fetch funds for dropdown", e);
        }
      };
      
      fetchMembers();
      fetchCampaigns();
      fetchFunds();
    }
  }, [record, editingRecord, isOpen, userProfile?.churchId]);

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

      // Ensure fundType is set for backwards compatibility based on selected fundId
      let finalFundType = formData.fundType;
      if (formData.fundId) {
        const selectedFund = funds.find(f => f.id === formData.fundId);
        if (selectedFund) {
          finalFundType = selectedFund.name;
        }
      }

      const payload = {
        ...formData,
        fundType: finalFundType,
        amount: amountNum,
        transactionDate: formData.date
      };
      if (!payload.campaignId) delete payload.campaignId;

      if (activeRecord) {
        await updateDoc(doc(db, 'givingRecords', activeRecord.id), {
          ...payload,
          churchId: CHURCH_ID,
          userId: formData.userId || null,
          donorName: formData.userId ? formData.donorName : (formData.donorName || 'Anonymous'),
          updatedAt: serverTimestamp(),
          updatedBy: currentUser?.uid || null
        });

        // Handle Campaign Amount updates for Edits
        const oldAmount = activeRecord.amount || 0;
        const oldCampaignId = activeRecord.campaignId;
        const newCampaignId = payload.campaignId;
        
        // If the campaign changed entirely or was removed
        if (oldCampaignId && oldCampaignId !== newCampaignId) {
           const { increment } = await import('firebase/firestore');
           await updateDoc(doc(db, 'givingCampaigns', oldCampaignId), {
              raisedAmount: increment(-oldAmount)
           });
        }
        
        // If there's a new campaign, and it's the same as old, update the diff. Else, add full amount.
        if (newCampaignId) {
           const { increment } = await import('firebase/firestore');
           if (newCampaignId === oldCampaignId) {
             const diff = amountNum - oldAmount;
             if (diff !== 0) {
               await updateDoc(doc(db, 'givingCampaigns', newCampaignId), {
                 raisedAmount: increment(diff)
               });
             }
           } else {
             await updateDoc(doc(db, 'givingCampaigns', newCampaignId), {
               raisedAmount: increment(amountNum)
             });
           }
        }
      } else {
        await addDoc(collection(db, 'givingRecords'), {
          ...payload,
          churchId: CHURCH_ID,
          userId: formData.userId || null,
          donorName: formData.userId ? formData.donorName : (formData.donorName || 'Anonymous'),
          createdAt: serverTimestamp(),
          createdBy: currentUser?.uid || null,
          status: 'completed'
        });
        
        // Handle new record campaign update
        if (payload.campaignId) {
          const { increment } = await import('firebase/firestore');
          await updateDoc(doc(db, 'givingCampaigns', payload.campaignId), {
            raisedAmount: increment(amountNum)
          });
        }
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
            <h2 className="text-xl font-bold text-church-navy">{activeRecord ? 'Edit Contribution' : 'Add Contribution'}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
            
            <div>
              <label className="block text-sm font-medium text-church-navy mb-1.5">Donor Name</label>
              <ModernDropdown
                value={formData.userId || ''}
                onChange={(val) => {
                  const selectedMember = members.find(m => m.id === val);
                  setFormData(prev => ({
                    ...prev,
                    userId: val,
                    donorName: selectedMember ? selectedMember.name : (val === '' ? 'Anonymous' : prev.donorName)
                  }));
                }}
                options={donorOptions}
                placeholder="-- Select Donor --"
                searchable={true}
              />
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
                <ModernDatePicker 
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-church-navy mb-1.5">Fund Type *</label>
                <ModernDropdown
                  value={formData.fundId}
                  onChange={(val) => handleChange({ target: { name: 'fundId', value: val } })}
                  options={funds.map(f => ({ value: f.id, label: f.name }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-church-navy mb-1.5">Method *</label>
                <ModernDropdown
                  value={formData.method}
                  onChange={(val) => handleChange({ target: { name: 'method', value: val } })}
                  options={[
                    { value: 'Cash', label: 'Cash' },
                    { value: 'GCash', label: 'GCash' },
                    { value: 'Maya', label: 'Maya' },
                    { value: 'Bank Transfer', label: 'Bank Transfer' },
                    { value: 'Check', label: 'Check' },
                    { value: 'Online Payment', label: 'Online Payment' }
                  ]}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-church-navy mb-1.5">Campaign (Optional)</label>
              <ModernDropdown
                value={formData.campaignId || ''}
                onChange={(val) => handleChange({ target: { name: 'campaignId', value: val } })}
                options={[
                  { value: '', label: 'None' },
                  ...campaigns.map(c => ({ value: c.id, label: c.title }))
                ]}
              />
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
