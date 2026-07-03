import React, { useState, useEffect } from 'react';
import { X, Search, Check } from 'lucide-react';
import { collection, query, orderBy, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

export default function MinistryTeamModal({ isOpen, onClose, ministry = null }) {
  const [members, setMembers] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  // Fetch all members when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchMembers = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'users'), orderBy('name', 'asc'));
        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setMembers(docs);
        
        // Initialize selected IDs from the ministry's existing memberIds array
        if (ministry && ministry.memberIds) {
          setSelectedIds(new Set(ministry.memberIds));
        } else {
          setSelectedIds(new Set());
        }
      } catch (err) {
        console.error('Error fetching members:', err);
        setError('Failed to load members.');
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
    setSearchTerm('');
    setError('');
  }, [isOpen, ministry]);

  if (!isOpen || !ministry) return null;

  const filteredMembers = members.filter(m => 
    m.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleMember = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');

    try {
      const docRef = doc(db, 'ministries', ministry.id);
      await updateDoc(docRef, {
        memberIds: Array.from(selectedIds),
        updatedAt: serverTimestamp()
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save team data. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-church-soft overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-church-navy">Manage Team</h2>
            <p className="text-sm text-church-slate mt-1">{ministry.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 flex flex-col overflow-hidden">
          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
          
          <div className="relative mb-4 shrink-0">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green"
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="overflow-y-auto flex-1 min-h-[250px] border border-gray-100 rounded-xl">
            {loading ? (
              <div className="p-8 text-center text-church-slate text-sm">Loading members...</div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-8 text-center text-church-slate text-sm">No members found.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredMembers.map(member => {
                  const isSelected = selectedIds.has(member.id);
                  return (
                    <div 
                      key={member.id}
                      onClick={() => toggleMember(member.id)}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-church-green/10 flex items-center justify-center text-church-green font-bold text-xs uppercase shrink-0">
                          {member.name?.charAt(0) || 'U'}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-semibold text-church-navy">{member.name}</p>
                          <p className="text-xs text-church-slate">{member.role ? member.role.replace('_', ' ') : 'Member'}</p>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-church-green border-church-green' : 'border-gray-300 bg-white'
                      }`}>
                        {isSelected && <Check size={14} className="text-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="mt-4 flex justify-between items-center shrink-0">
            <span className="text-sm font-medium text-church-slate">
              {selectedIds.size} members selected
            </span>
            <div className="flex space-x-3">
              <button 
                type="button" 
                onClick={onClose}
                disabled={saving}
                className="px-5 py-2.5 bg-white border border-gray-300 rounded-full text-sm font-medium text-church-slate hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit}
                disabled={saving}
                className="px-5 py-2.5 bg-church-green text-white rounded-full text-sm font-medium hover:bg-church-green/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Team'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
