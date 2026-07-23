import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { X, AlertCircle } from 'lucide-react';
import ModernDropdown from '../../components/ui/ModernDropdown';
import ModernTimePicker from '../../components/ui/ModernTimePicker';
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
  const [takenRoles, setTakenRoles] = useState([]);

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
        evDocs = evDocs.filter(d => d.churchId === userProfile?.churchId || (!d.churchId && userProfile?.churchId === 'YmEc6C69Xz4DKRQaQZBV'));
        setEvents(evDocs);
        
        const minQ = query(
          collection(db, 'ministries'),
          where('churchId', '==', userProfile?.churchId || 'YmEc6C69Xz4DKRQaQZBV')
        );
        const minSnap = await getDocs(minQ);
        let minDocs = minSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        minDocs = minDocs.filter(d => 
          (d.churchId === userProfile?.churchId || (!d.churchId && userProfile?.churchId === 'YmEc6C69Xz4DKRQaQZBV')) &&
          d.status === 'Active'
        );
        setMinistries(minDocs);
        
        const membersSnap = await getDocs(collection(db, 'users'));
        let memDocs = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        memDocs = memDocs.filter(d => d.churchId === userProfile?.churchId || (!d.churchId && userProfile?.churchId === 'YmEc6C69Xz4DKRQaQZBV'));
        
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

  useEffect(() => {
    if (selectedEvent && selectedMinistry) {
      const fetchTakenRoles = async () => {
        const q = query(
          collection(db, 'ministryAssignments'),
          where('eventId', '==', selectedEvent),
          where('ministryId', '==', selectedMinistry)
        );
        const snap = await getDocs(q);
        const roles = snap.docs.map(d => d.data().roleName);
        
        if (existingAssignment) {
          setTakenRoles(roles.filter(r => r !== existingAssignment.roleName));
        } else {
          setTakenRoles(roles);
        }
      };
      fetchTakenRoles();
    } else {
      setTakenRoles([]);
    }
  }, [selectedEvent, selectedMinistry, existingAssignment]);

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

    const isWorshipSongListEnabled = Boolean(activeMinistry?.type === 'worship' && activeMinistry?.features?.songListEnabled === true);

    const data = {
      churchId: userProfile?.churchId || '',
      eventId: selectedEvent,
      eventName,
      eventDate: activeEvent?.date || '',
      ministryId: selectedMinistry,
      ministryName,
      ministryType: activeMinistry?.type || 'general',
      roleName: selectedRole,
      memberId: selectedMember,
      memberName,
      callTime,
      notes,
      status,
      canViewSongList: isWorshipSongListEnabled,
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
            <ModernDropdown 
              value={selectedEvent}
              onChange={(val) => setSelectedEvent(val)}
              options={events.map(ev => ({ value: ev.id, label: `${ev.title} (${ev.date || 'No date'})` }))}
              placeholder="-- Select Event --"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-church-navy mb-1">Ministry *</label>
            <ModernDropdown 
              value={selectedMinistry}
              onChange={(val) => {
                setSelectedMinistry(val);
                setSelectedRole('');
                setSelectedMember('');
              }}
              options={ministries.map(m => ({ value: m.id, label: m.name }))}
              placeholder="-- Select Ministry --"
            />
            {selectedMinistry && activeMinistry && (
              <div className="mt-2">
                {activeMinistry.type === 'worship' && activeMinistry.features?.songListEnabled ? (
                  <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-semibold text-indigo-900 flex items-center justify-between">
                    <span>Song List Access Enabled</span>
                    <span className="px-2 py-0.5 bg-indigo-600 text-white font-bold text-[10px] rounded-full uppercase tracking-wider">
                      Active
                    </span>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {selectedMinistry && (
            <>
              <div>
                <label className="block text-sm font-bold text-church-navy mb-1">Role *</label>
                <ModernDropdown 
                  value={selectedRole}
                  onChange={(val) => setSelectedRole(val)}
                  options={(activeMinistry?.roles || []).filter(r => !takenRoles.includes(r)).map(r => ({ value: r, label: r }))}
                  placeholder="-- Select Role --"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-church-navy mb-1">Search & Select Member *</label>
                {(() => {
                  const ministryMemberIds = (activeMinistry?.members || []).map(m => m.memberId);
                  const membersToDisplay = allMembers.filter(m => ministryMemberIds.includes(m.id));
                  
                  if ((activeMinistry?.members || []).length === 0) {
                    return (
                      <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm font-medium">
                        No members assigned to this ministry yet. Please add members to {activeMinistry?.name || 'this ministry'} in Team Roster first.
                      </div>
                    );
                  }

                  return (
                    <ModernDropdown 
                      value={selectedMember}
                      onChange={(val) => setSelectedMember(val)}
                      options={membersToDisplay.map(m => ({ value: m.id, label: m.displayName || m.name || 'Unknown' }))}
                      placeholder="-- Select Member --"
                      searchable={true}
                    />
                  );
                })()}
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
              <ModernTimePicker 
                name="callTime"
                value={callTime}
                onChange={e => setCallTime(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-church-navy mb-1">Status</label>
              <ModernDropdown 
                value={status}
                onChange={(val) => setStatus(val)}
                options={[
                  { value: 'Pending', label: 'Pending' },
                  { value: 'Confirmed', label: 'Confirmed' },
                  { value: 'Declined', label: 'Declined' },
                  { value: 'Completed', label: 'Completed' },
                ]}
                placeholder="-- Select Status --"
              />
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
