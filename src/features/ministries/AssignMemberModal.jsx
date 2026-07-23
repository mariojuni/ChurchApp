import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { collection, query, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import ModernDropdown from '../../components/ui/ModernDropdown';

// Helper to format name as: FirstName [Middle Initial.] LastName
function formatStandardName(d) {
  const f = (d.firstName || '').trim();
  const m = d.middleName ? `${d.middleName.trim().charAt(0)}.` : '';
  const l = (d.lastName || '').trim();
  const constructed = [f, m, l].filter(Boolean).join(' ');
  if (constructed) return constructed;

  // Fallback if only 'name' string field exists
  if (d.name) {
    const parts = d.name.trim().split(/\s+/);
    if (parts.length >= 3) {
      const first = parts[0];
      const mid = `${parts[1].charAt(0)}.`;
      const last = parts.slice(2).join(' ');
      return `${first} ${mid} ${last}`;
    }
    return d.name.trim();
  }

  return 'Unnamed Member';
}

export default function AssignMemberModal({ isOpen, onClose, ministry }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
      setSelectedMemberId('');
      setError('');
    }
  }, [isOpen, ministry]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      let snap;
      try {
        const q = query(collection(db, 'users'), orderBy('name', 'asc'));
        snap = await getDocs(q);
      } catch (queryErr) {
        snap = await getDocs(collection(db, 'users'));
      }
      
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const formattedDocs = docs.map(d => ({
        ...d,
        displayName: formatStandardName(d)
      }));
      
      // Sort members alphabetically by standardized display name
      formattedDocs.sort((a, b) => a.displayName.localeCompare(b.displayName));
      
      // Filter out people already in this ministry
      const existingMemberIds = (ministry?.members || []).map(m => m.memberId);
      const availableMembers = formattedDocs.filter(m => !existingMemberIds.includes(m.id) && m.membershipStatus !== 'Archived');
      
      setMembers(availableMembers);
    } catch (err) {
      console.error('Error fetching church members:', err);
      setError("Failed to fetch church members");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !ministry) return null;

  const dropdownOptions = members.map(m => ({
    value: m.id,
    label: m.displayName
  }));

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
      const displayName = formatStandardName(memberDoc || {});
      
      const newMemberObj = {
        memberId: selectedMemberId,
        memberName: displayName
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
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-church-soft overflow-visible flex flex-col my-8">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-3xl">
          <h2 className="text-xl font-bold text-church-navy">Assign to {ministry.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors bg-white p-2 rounded-full shadow-sm">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 pb-28 min-h-[220px]">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium text-church-navy mb-2">Select Church Member</label>
            {loading ? (
              <div className="p-4 text-center text-sm text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
                Loading members...
              </div>
            ) : (
              <ModernDropdown
                options={dropdownOptions}
                value={selectedMemberId}
                onChange={setSelectedMemberId}
                placeholder="Choose a member to assign..."
                searchable={true}
              />
            )}
          </div>
        </form>

        <div className="p-6 border-t border-gray-100 flex justify-end space-x-3 bg-gray-50/50 rounded-b-3xl">
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
