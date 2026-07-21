import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Plus, Calendar as CalendarIcon, Edit, Trash2, MapPin, Clock, MoreVertical, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import EventFormModal from './EventFormModal';
import { useNavigate } from 'react-router-dom';
import { canManageEvents } from '../../utils/permissions';
import GenerateMonthlyEventsModal from './GenerateMonthlyEventsModal';
import ModernDropdown from '../../components/ui/ModernDropdown';

export default function EventsList() {
  const { userProfile } = useAuth();
  const CHURCH_ID = userProfile?.churchId || 'YmEc6C69Xz4DKRQaQZBV';
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const canManage = canManageEvents(userProfile);

  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Action menu state
  const [activeMenuId, setActiveMenuId] = useState(null);

  useEffect(() => {
    if (!CHURCH_ID) return;
    const q = query(collection(db, 'events'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Legacy support for multi-tenant
      docs = docs.filter(d => d.churchId === CHURCH_ID || (!d.churchId && CHURCH_ID === 'YmEc6C69Xz4DKRQaQZBV'));
      // Sort in memory
      docs.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
      setEvents(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [CHURCH_ID]);

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

  const handleBulkDelete = async () => {
    if (selectedEvents.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedEvents.length} selected events?`)) {
      try {
        const batch = writeBatch(db);
        selectedEvents.forEach(id => {
          batch.delete(doc(db, 'events', id));
        });
        await batch.commit();
        setSelectedEvents([]);
        setIsSelectionMode(false);
      } catch (error) {
        console.error("Error deleting documents: ", error);
        alert("Failed to delete selected events.");
      }
    }
  };
  
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedEvents([]);
    setActiveMenuId(null);
  };

  const toggleEventSelect = (e, id) => {
    e.stopPropagation();
    if (selectedEvents.includes(id)) {
      setSelectedEvents(selectedEvents.filter(eventId => eventId !== id));
    } else {
      setSelectedEvents([...selectedEvents, id]);
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

  const filteredEvents = events.filter(event => {
    if (!event.date) return false;
    const [y, m] = event.date.split('-');
    
    const yearMatch = filterYear === 'all' || y === filterYear;
    const monthMatch = filterMonth === 'all' || parseInt(m, 10) - 1 === parseInt(filterMonth, 10);
    
    return yearMatch && monthMatch;
  });

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-church-navy">Events</h1>
          <p className="text-sm text-church-slate mt-1">Manage upcoming church events and schedules.</p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2 items-center justify-end">
            {isSelectionMode ? (
              <>
                <button 
                  onClick={handleBulkDelete}
                  disabled={selectedEvents.length === 0}
                  className="flex items-center px-4 py-2 bg-red-50 text-red-600 rounded-full text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50 border border-red-200"
                >
                  <Trash2 size={16} className="mr-2" />
                  Delete Selected ({selectedEvents.length})
                </button>
                <button 
                  onClick={toggleSelectionMode}
                  className="flex items-center px-4 py-2 bg-white border border-gray-300 text-church-slate rounded-full shadow-sm text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                {events.length > 0 && (
                  <button 
                    onClick={toggleSelectionMode}
                    className="flex items-center px-4 py-2 bg-white border border-gray-300 text-church-slate rounded-full shadow-sm text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Select
                  </button>
                )}
                <button 
                  onClick={() => setIsGeneratorOpen(true)}
                  className="flex items-center px-4 py-2 bg-white border border-church-green text-church-green rounded-full shadow-sm text-sm font-medium hover:bg-green-50 transition-colors hidden sm:flex"
                >
                  <CalendarIcon size={16} className="mr-2" />
                  Generate Events
                </button>
                <button 
                  onClick={handleAddClick}
                  className="flex items-center px-4 py-2 bg-church-green text-white rounded-full shadow-md text-sm font-medium hover:bg-church-green/90 transition-opacity"
                >
                  <Plus size={16} className="mr-1" />
                  Create Event
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-church-soft border border-gray-100 flex flex-wrap gap-4 items-end z-10 relative">
        <div className="w-48">
          <label className="block text-sm font-medium text-church-navy mb-1">Month</label>
          <ModernDropdown
            value={filterMonth}
            onChange={setFilterMonth}
            options={[
              { value: 'all', label: 'All Months' },
              ...MONTHS.map((m, i) => ({ value: String(i), label: m }))
            ]}
          />
        </div>
        <div className="w-32">
          <label className="block text-sm font-medium text-church-navy mb-1">Year</label>
          <ModernDropdown
            value={filterYear}
            onChange={setFilterYear}
            options={[
              { value: 'all', label: 'All Years' },
              { value: String(new Date().getFullYear() - 1), label: String(new Date().getFullYear() - 1) },
              { value: String(new Date().getFullYear()), label: String(new Date().getFullYear()) },
              { value: String(new Date().getFullYear() + 1), label: String(new Date().getFullYear() + 1) }
            ]}
          />
        </div>
      </div>
      
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-church-slate">Loading events...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 p-12 flex flex-col items-center justify-center flex-1">
          <div className="w-20 h-20 bg-church-green/10 rounded-full flex items-center justify-center mb-6">
            <CalendarIcon size={32} className="text-church-green" />
          </div>
          <h3 className="text-xl font-bold text-church-navy mb-2">No events found</h3>
          <p className="text-church-slate text-center max-w-sm mb-6">No events match the selected filters or schedule.</p>
          {canManage && filterMonth === 'all' && filterYear === 'all' && (
            <button 
              onClick={handleAddClick}
              className="px-6 py-3 bg-white border border-gray-300 text-church-navy rounded-full text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
            >
              Create Event
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filteredEvents.map(event => (
            <div 
              key={event.id} 
              onClick={(e) => isSelectionMode ? toggleEventSelect(e, event.id) : navigate(`/admin/events/${event.id}`)}
              className={`bg-white rounded-2xl p-5 shadow-church-soft border flex items-center relative group transition-all hover:shadow-md cursor-pointer ${
                selectedEvents.includes(event.id) ? 'border-church-green bg-green-50/10' : 'border-gray-100'
              }`}
            >
              {/* Selection Checkbox */}
              {isSelectionMode && (
                <div className="mr-4">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    selectedEvents.includes(event.id) ? 'bg-church-green border-church-green text-white' : 'border-gray-300 bg-white'
                  }`}>
                    {selectedEvents.includes(event.id) && <CheckCircle2 size={14} className="text-white" />}
                  </div>
                </div>
              )}
              
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
              {canManage && (
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
              )}
            </div>
          ))}
        </div>
      )}

      <EventFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        event={editingEvent}
      />

      <GenerateMonthlyEventsModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
      />
    </div>
  );
}
