import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { collection, query, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export default function AssignMemberModal({ isOpen, onClose, ministry }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedMemberId, setSelectedMemberId] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
      setSelectedMemberId('');

      setSearchTerm('');
      setError('');
    }
  }, [isOpen, ministry]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      // Fetch all active users to assign
      const q = query(collection(db, 'users'), orderBy('name', 'asc'));
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Filter out people already in this ministry
      const existingMemberIds = (ministry?.members || []).map(m => m.memberId);
      const availableMembers = docs.filter(m => !existingMemberIds.includes(m.id) && m.membershipStatus !== 'Archived');
      
      setMembers(availableMembers);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch church members");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !ministry) return null;

  const filteredMembers = members.filter(m => 
    m.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMemberId) {
      setError("Please select a member");
      return;
    }
    
    setSaving(true);
    setError('');

    try {
      const memberDoc = members.find(m => m.id === selectedMemberId);
      
      const newMemberObj = {
        memberId: memberDoc.id,
        memberName: memberDoc.name
      };

      const updatedMembers = [...(ministry.members || []), newMemberObj];
      
      await updateDoc(doc(db, 'ministries', ministry.id), {
        members: updatedMembers,
        updatedAt: new Date()
      });
      
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to assign member to ministry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-church-soft overflow-hidden flex flex-col my-8">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-church-navy">Assign to {ministry.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors bg-white p-2 rounded-full shadow-sm">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium text-church-navy mb-2">Search Member</label>
            <div className="relative mb-3">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search size={16} className="text-gray-400" />
              </div>
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl">
              {loading ? (
                <div className="p-4 text-center text-sm text-gray-500">Loading roster...</div>
              ) : filteredMembers.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">No members found.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredMembers.map(m => (
                    <label key={m.id} className="flex items-center p-3 hover:bg-gray-50 cursor-pointer">
                      <input 
                        type="radio" 
                        name="memberSelection"
                        value={m.id}
                        checked={selectedMemberId === m.id}
                        onChange={(e) => setSelectedMemberId(e.target.value)}
                        className="text-church-green focus:ring-church-green mr-3"
                      />
                      <span className="text-sm font-medium text-church-navy">{m.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-gray-100 flex justify-end space-x-3 bg-gray-50/50">
          <button type="button" onClick={onClose} disabled={saving} className="px-5 py-2.5 bg-white border border-gray-300 rounded-full text-sm font-bold text-church-slate hover:bg-gray-100 transition-colors">
            Cancel
          </button>
          <button type="submit" onClick={handleSubmit} disabled={saving || !selectedMemberId} className="px-6 py-2.5 bg-church-green text-white rounded-full text-sm font-bold hover:bg-church-green/90 transition-colors disabled:opacity-50 shadow-md">
            {saving ? 'Assigning...' : 'Assign Member'}
          </button>
        </div>
      </div>
    </div>
  );
}
