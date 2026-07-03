import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { X, AlertCircle } from 'lucide-react';

export default function AssignmentFormModal({ isOpen, onClose, existingAssignment = null, defaultEventId = null }) {
  const { userProfile } = useAuth();
  
  const [events, setEvents] = useState([]);
  const [ministries, setMinistries] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  
  const [selectedEvent, setSelectedEvent] = useState(defaultEventId || '');
  const [selectedMinistry, setSelectedMinistry] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  
  const [selectedMember, setSelectedMember] = useState('');
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  
  const [callTime, setCallTime] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('Pending');

  const [loading, setLoading] = useState(false);
  const [conflictWarning, setConflictWarning] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (existingAssignment) {
        setSelectedEvent(existingAssignment.eventId || '');
        setSelectedMinistry(existingAssignment.ministryId || '');
        setSelectedRole(existingAssignment.roleName || '');
        setSelectedMember(existingAssignment.memberId || '');
        setCallTime(existingAssignment.callTime || '');
        setNotes(existingAssignment.notes || '');
        setStatus(existingAssignment.status || 'Pending');
      } else {
        setSelectedEvent(defaultEventId || '');
        setSelectedMinistry('');
        setSelectedRole('');
        setSelectedMember('');
        setMemberSearchTerm('');
        setCallTime('');
        setNotes('');
        setStatus('Pending');
      }
      setConflictWarning('');
    }
  }, [isOpen, existingAssignment, defaultEventId]);

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        const eventsSnap = await getDocs(collection(db, 'events'));
        let evDocs = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        evDocs = evDocs.filter(d => d.churchId === userProfile?.churchId || (!d.churchId && userProfile?.churchId === 'casubiduan'));
        setEvents(evDocs);
        
        const minSnap = await getDocs(collection(db, 'ministries'));
        let minDocs = minSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        minDocs = minDocs.filter(d => 
          (d.churchId === userProfile?.churchId || (!d.churchId && userProfile?.churchId === 'casubiduan')) &&
          d.status === 'Active'
        );
        setMinistries(minDocs);
        
        const membersSnap = await getDocs(collection(db, 'users'));
        let memDocs = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        memDocs = memDocs.filter(d => d.churchId === userProfile?.churchId || (!d.churchId && userProfile?.churchId === 'casubiduan'));
        
        // Format names nicely for search
        memDocs = memDocs.map(d => {
          let displayName = d.name || '';
          if (d.firstName || d.lastName) {
             const f = (d.firstName||'').split(/[\s-]+/).map(w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' ');
             const l = (d.lastName||'').split(/[\s-]+/).map(w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' ');
             const m = d.middleName ? d.middleName.charAt(0).toUpperCase() + '.' : '';
             displayName = [f, m, l].filter(Boolean).join(' ');
          }
          return { ...d, displayName };
        });
        setAllMembers(memDocs);
      };
      fetchData();
    }
  }, [isOpen]);

  const activeMinistry = ministries.find(m => m.id === selectedMinistry);
  const activeEvent = events.find(e => e.id === selectedEvent);

  // Basic conflict checking: if same member is assigned to another event on the same day
  useEffect(() => {
    if (!selectedMember || !activeEvent || !activeEvent.date) {
      setConflictWarning('');
      return;
    }
    
    const checkConflicts = async () => {
      // Get other events on the same date
      const sameDayEvents = events.filter(e => e.date === activeEvent.date && e.id !== activeEvent.id);
      if (sameDayEvents.length === 0) return setConflictWarning('');

      const sameDayEventIds = sameDayEvents.map(e => e.id);
      
      const q = query(
        collection(db, 'ministryAssignments'),
        where('memberId', '==', selectedMember)
      );
      const snap = await getDocs(q);
      const memberAssignments = snap.docs.map(d => d.data());
      
      const conflicts = memberAssignments.filter(a => sameDayEventIds.includes(a.eventId));
      if (conflicts.length > 0) {
        setConflictWarning(`Warning: This member is already scheduled for another event on ${activeEvent.date}.`);
      } else {
        setConflictWarning('');
      }
    };
    checkConflicts();
  }, [selectedMember, activeEvent, events]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEvent || !selectedMinistry || !selectedRole || !selectedMember) {
      alert("Please fill all required fields.");
      return;
    }

    setLoading(true);
    const memberObj = allMembers.find(m => m.id === selectedMember);
    const memberName = memberObj ? (memberObj.displayName || memberObj.name) : 'Unknown Member';
    const ministryName = activeMinistry ? activeMinistry.name : 'Unknown Ministry';
    const eventName = activeEvent ? activeEvent.title : 'Unknown Event';

    const data = {
      churchId: userProfile?.churchId || '',
      eventId: selectedEvent,
      eventName,
      eventDate: activeEvent?.date || '',
      ministryId: selectedMinistry,
      ministryName,
      roleName: selectedRole,
      memberId: selectedMember,
      memberName,
      callTime,
      notes,
      status,
      updatedAt: new Date().toISOString()
    };

    try {
      if (existingAssignment) {
        await updateDoc(doc(db, 'ministryAssignments', existingAssignment.id), data);
      } else {
        data.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'ministryAssignments'), data);
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert("Error saving assignment");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-church-navy/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-church-navy">{existingAssignment ? 'Edit Assignment' : 'Create Assignment'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-church-navy transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div>
            <label className="block text-sm font-bold text-church-navy mb-1">Event *</label>
            <select 
              value={selectedEvent} 
              onChange={e => setSelectedEvent(e.target.value)} 
              className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-gray-50 text-sm"
              required
            >
              <option value="">-- Select Event --</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.title} ({ev.date || 'No date'})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-church-navy mb-1">Ministry *</label>
            <select 
              value={selectedMinistry} 
              onChange={e => {
                setSelectedMinistry(e.target.value);
                setSelectedRole('');
                setSelectedMember('');
              }} 
              className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-gray-50 text-sm"
              required
            >
              <option value="">-- Select Ministry --</option>
              {ministries.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {selectedMinistry && (
            <>
              <div>
                <label className="block text-sm font-bold text-church-navy mb-1">Role *</label>
                <select 
                  value={selectedRole} 
                  onChange={e => setSelectedRole(e.target.value)} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-gray-50 text-sm"
                  required
                >
                  <option value="">-- Select Role --</option>
                  {activeMinistry?.roles?.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              
              <div className="relative">
                <label className="block text-sm font-bold text-church-navy mb-1">Search & Select Member *</label>
                <div className="relative">
                  <input 
                    type="text"
                    value={memberSearchTerm}
                    onChange={e => {
                      setMemberSearchTerm(e.target.value);
                      setIsMemberDropdownOpen(true);
                      if (selectedMember) {
                        setSelectedMember('');
                      }
                    }}
                    onFocus={() => setIsMemberDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsMemberDropdownOpen(false), 200)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-church-green"
                    placeholder="Type to search ALL members..."
                    required={!selectedMember}
                  />
                  {isMemberDropdownOpen && memberSearchTerm && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                       {allMembers
                         .filter(m => (m.displayName || m.name || '').toLowerCase().includes(memberSearchTerm.toLowerCase()))
                         .map(m => (
                           <div 
                             key={m.id} 
                             className="px-4 py-2 hover:bg-church-green/10 cursor-pointer text-sm text-church-navy font-medium"
                             onClick={() => {
                               setSelectedMember(m.id);
                               setMemberSearchTerm(m.displayName || m.name);
                               setIsMemberDropdownOpen(false);
                             }}
                           >
                             {m.displayName || m.name}
                           </div>
                       ))}
                       {allMembers.filter(m => (m.displayName || m.name || '').toLowerCase().includes(memberSearchTerm.toLowerCase())).length === 0 && (
                         <div className="px-4 py-3 text-sm text-gray-500 italic">No members found.</div>
                       )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {conflictWarning && (
            <div className="bg-orange-50 border border-orange-200 text-orange-800 p-3 rounded-lg text-sm flex items-start">
              <AlertCircle size={16} className="mr-2 mt-0.5 shrink-0" />
              <span>{conflictWarning}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-church-navy mb-1">Call Time</label>
              <input 
                type="time" 
                value={callTime}
                onChange={e => setCallTime(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-gray-50 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-church-navy mb-1">Status</label>
              <select 
                value={status} 
                onChange={e => setStatus(e.target.value)} 
                className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-gray-50 text-sm"
              >
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Declined">Declined</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-church-navy mb-1">Notes</label>
            <textarea 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-gray-50 text-sm h-20"
              placeholder="Any specific instructions..."
            />
          </div>

          <div className="pt-4 flex justify-end">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-full mr-3">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-5 py-2.5 bg-church-green text-white rounded-full text-sm font-bold hover:bg-church-green/90 shadow-md">
              {loading ? 'Saving...' : 'Save Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
