import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Plus, Calendar as CalendarIcon, Edit, Trash2, MapPin, Clock, MoreVertical, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import EventFormModal from './EventFormModal';
import { useNavigate } from 'react-router-dom';

export default function EventsList() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  
  // Action menu state
  const [activeMenuId, setActiveMenuId] = useState(null);

  useEffect(() => {
    if (!userProfile?.churchId) return;
    const q = query(collection(db, 'events'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Legacy support for multi-tenant
      docs = docs.filter(d => d.churchId === userProfile.churchId || (!d.churchId && userProfile.churchId === 'YmEc6C69Xz4DKRQaQZBV'));
      // Sort in memory
      docs.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
      setEvents(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile?.churchId]);

  const handleAddClick = () => {
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (e, event) => {
    e.stopPropagation();
    setEditingEvent(event);
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleDeleteClick = async (id, title) => {
    setActiveMenuId(null);
    if (window.confirm(`Are you sure you want to delete the event "${title}"?`)) {
      try {
        await deleteDoc(doc(db, 'events', id));
      } catch (error) {
        console.error("Error deleting document: ", error);
        alert("Failed to delete event.");
      }
    }
  };

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    const dateObj = new Date(dateStr + 'T00:00:00'); // Ensure it parses as local time
    return dateObj.toLocaleDateString(undefined, options);
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-church-navy">Events</h1>
          <p className="text-sm text-church-slate mt-1">Manage upcoming church events and schedules.</p>
        </div>
        <button 
          onClick={handleAddClick}
          className="flex items-center px-5 py-2.5 bg-church-green text-white rounded-full shadow-md text-sm font-medium hover:bg-church-green/90 transition-opacity"
        >
          <Plus size={18} className="mr-2" />
          Create Event
        </button>
      </div>
      
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-church-slate">Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 p-12 flex flex-col items-center justify-center flex-1">
          <div className="w-20 h-20 bg-church-green/10 rounded-full flex items-center justify-center mb-6">
            <CalendarIcon size={32} className="text-church-green" />
          </div>
          <h3 className="text-xl font-bold text-church-navy mb-2">No upcoming events</h3>
          <p className="text-church-slate text-center max-w-sm mb-6">Schedule your next church event, meeting, or service here.</p>
          <button 
            onClick={handleAddClick}
            className="px-6 py-3 bg-white border border-gray-300 text-church-navy rounded-full text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
          >
            Create Event
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {events.map(event => (
            <div 
              key={event.id} 
              onClick={() => navigate(`/admin/events/${event.id}`)}
              className="bg-white rounded-2xl p-5 shadow-church-soft border border-gray-100 flex items-center relative group transition-all hover:shadow-md cursor-pointer"
            >
              {/* Date Box */}
              <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-church-green/10 flex flex-col items-center justify-center text-church-green mr-5 border border-church-green/20">
                <span className="text-xs font-semibold uppercase">
                  {event.date ? new Date(event.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short' }) : 'TBD'}
                </span>
                <span className="text-2xl font-bold leading-none mt-0.5">
                  {event.date ? new Date(event.date + 'T00:00:00').getDate() : '--'}
                </span>
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className={`text-lg font-bold truncate ${event.status === 'Cancelled' ? 'text-gray-400 line-through' : 'text-church-navy'}`}>
                    {event.title}
                  </h3>
                  {event.status === 'Published' && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] uppercase font-bold rounded">Published</span>}
                  {event.status === 'Draft' && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] uppercase font-bold rounded">Draft</span>}
                  {event.status === 'Cancelled' && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] uppercase font-bold rounded">Cancelled</span>}
                </div>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1 text-sm text-church-slate">
                  {event.category && (
                    <div className="flex items-center text-church-navy font-medium">
                      {event.category}
                    </div>
                  )}
                  <div className="flex items-center">
                    <Clock size={14} className="mr-1.5 opacity-70" />
                    {(event.startTime || event.time) ? (event.endTime ? `${(event.startTime || event.time)} - ${event.endTime}` : (event.startTime || event.time)) : 'TBD'}
                  </div>
                  <div className="flex items-center">
                    <MapPin size={14} className="mr-1.5 opacity-70" />
                    <span className="truncate max-w-[150px]">{event.location || 'TBD'}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 mt-3">
                  {event.enableRSVP && (
                    <span className="flex items-center text-xs text-church-slate"><CheckCircle2 size={12} className="mr-1 text-church-green" /> RSVP</span>
                  )}
                  {event.enableVolunteer && (
                    <span className="flex items-center text-xs text-church-slate"><CheckCircle2 size={12} className="mr-1 text-church-green" /> Volunteers</span>
                  )}
                  {event.enableAttendance && (
                    <span className="flex items-center text-xs text-church-slate"><CheckCircle2 size={12} className="mr-1 text-church-green" /> Tracking</span>
                  )}
                </div>
              </div>
              
              {/* Actions Dropdown */}
              <div className="ml-4 relative">
                <button 
                  onClick={(e) => toggleMenu(e, event.id)}
                  className="p-2 text-gray-400 hover:text-church-navy rounded-full hover:bg-gray-50 transition-colors"
                >
                  <MoreVertical size={20} />
                </button>
                
                {activeMenuId === event.id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                    <div className="absolute right-0 top-10 w-36 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1">
                      <button 
                        onClick={(e) => handleEditClick(e, event)}
                        className="w-full flex items-center px-4 py-2 text-sm text-church-navy hover:bg-gray-50"
                      >
                        <Edit size={14} className="mr-2" /> Edit
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(event.id, event.title); }}
                        className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={14} className="mr-2" /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <EventFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        event={editingEvent}
      />
    </div>
  );
}
