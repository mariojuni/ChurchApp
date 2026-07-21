import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, getDocs, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { X } from 'lucide-react';
import ModernDropdown from '../ui/ModernDropdown';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function NewAttendanceSessionModal({ isOpen, onClose }) {
  const { userProfile } = useAuth();
  const CHURCH_ID = userProfile?.churchId || 'YmEc6C69Xz4DKRQaQZBV';
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const fetchEvents = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'events'));
        const snapshot = await getDocs(q);
        let docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Filter for church
        docs = docs.filter(d => d.churchId === CHURCH_ID || (!d.churchId && CHURCH_ID === 'YmEc6C69Xz4DKRQaQZBV'));
        
        // Filter upcoming events (optional, but requested "upcoming events")
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        docs = docs.filter(d => {
          if (!d.date) return false;
          const eventDate = new Date(d.date + 'T00:00:00');
          return eventDate >= today;
        });

        // Sort by dates
        docs.sort((a, b) => new Date(a.date) - new Date(b.date));

        setEvents(docs);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [isOpen, CHURCH_ID]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEventId) return;

    const selectedEvent = events.find(ev => ev.id === selectedEventId);
    if (!selectedEvent) return;

    setIsSubmitting(true);
    try {
      const sessionRef = doc(db, 'attendance_sessions', selectedEvent.id);
      await setDoc(sessionRef, {
        eventTitle: selectedEvent.title,
        eventId: selectedEvent.id, // reference to the event
        date: selectedEvent.date,
        status: 'Open',
        metrics: {
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          visitors: 0
        },
        createdAt: serverTimestamp(),
        churchId: CHURCH_ID
      }, { merge: true });
      onClose();
      navigate(`/admin/attendance/${selectedEvent.id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to create attendance session: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const eventOptions = events.map(ev => ({
    value: ev.id,
    label: `${ev.title} (${new Date(ev.date + 'T00:00:00').toLocaleDateString()})`
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md shadow-church-soft flex flex-col my-8" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-church-navy">New Attendance Session</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col space-y-4">
          <div>
            <label className="block text-sm font-medium text-church-navy mb-1">Select Event</label>
            {loading ? (
              <div className="text-sm text-church-slate py-2">Loading upcoming events...</div>
            ) : (
              <ModernDropdown
                value={selectedEventId}
                onChange={(val) => setSelectedEventId(val)}
                options={eventOptions}
                placeholder="Select an upcoming event"
                searchable={true}
              />
            )}
          </div>

          <div className="pt-6 flex justify-end space-x-3 border-t border-gray-100 mt-4">
            <button 
              type="button" 
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-white border border-gray-300 rounded-full text-sm font-medium text-church-slate hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting || !selectedEventId || loading}
              className="px-5 py-2.5 bg-church-green text-white rounded-full text-sm font-medium hover:bg-church-green/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
