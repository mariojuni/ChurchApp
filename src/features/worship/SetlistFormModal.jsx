import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { createSetlist, updateSetlist } from './worshipService';
import { useAuth } from '../../context/AuthContext';

export default function SetlistFormModal({ isOpen, onClose, setlist, events, onSaved }) {
  const { userProfile, currentUser } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    eventId: '',
    serviceDate: '',
    status: 'draft'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (setlist) {
      setFormData({
        title: setlist.title || '',
        eventId: setlist.eventId || '',
        serviceDate: setlist.serviceDate || '',
        status: setlist.status || 'draft'
      });
    } else {
      setFormData({
        title: '',
        eventId: '',
        serviceDate: '',
        status: 'draft'
      });
    }
  }, [setlist, isOpen]);

  // When eventId changes, automatically fill serviceDate
  useEffect(() => {
    if (formData.eventId && events[formData.eventId]) {
      const selectedEvent = events[formData.eventId];
      if (selectedEvent.date && !formData.serviceDate) {
        setFormData(prev => ({ ...prev, serviceDate: selectedEvent.date }));
      }
      if (!formData.title) {
        setFormData(prev => ({ ...prev, title: `Worship Setlist - ${selectedEvent.title}` }));
      }
    }
  }, [formData.eventId, events]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.eventId) return;
    
    setSaving(true);
    try {
      const dataToSave = {
        ...formData,
        churchId: userProfile?.churchId || null,
        createdBy: currentUser?.uid || null
      };
      
      if (setlist) {
        await updateSetlist(setlist.id, dataToSave);
      } else {
        await createSetlist(dataToSave);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save setlist');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="fixed inset-0 bg-church-navy/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100">
          <h2 className="text-xl font-bold text-church-navy">
            {setlist ? 'Edit Setlist Metadata' : 'Create New Setlist'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <form id="setlist-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-church-navy mb-2">Linked Event *</label>
              <select 
                name="eventId" 
                required 
                value={formData.eventId} 
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-church-green focus:ring-1 focus:ring-church-green"
              >
                <option value="">-- Select an Event --</option>
                {Object.values(events)
                  .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
                  .map(event => (
                  <option key={event.id} value={event.id}>
                    {event.date} | {event.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-church-navy mb-2">Setlist Title *</label>
              <input 
                type="text" 
                name="title" 
                required 
                value={formData.title} 
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-church-green focus:ring-1 focus:ring-church-green" 
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-church-navy mb-2">Service Date</label>
              <input 
                type="date" 
                name="serviceDate" 
                value={formData.serviceDate} 
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-church-green focus:ring-1 focus:ring-church-green" 
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-church-navy mb-2">Status</label>
              <select 
                name="status"
                value={formData.status} 
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-church-green focus:ring-1 focus:ring-church-green"
              >
                <option value="draft">Draft (Private)</option>
                <option value="published">Published (Visible to Team)</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </form>
        </div>
        
        <div className="px-6 py-5 border-t border-gray-100 bg-gray-50 rounded-b-3xl flex justify-end space-x-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-church-slate hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="setlist-form"
            disabled={saving}
            className="px-5 py-2.5 bg-church-green text-white text-sm font-semibold rounded-xl hover:bg-church-green/90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Saving...' : (setlist ? 'Save Changes' : 'Create Setlist')}
          </button>
        </div>
      </div>
    </div>
  );
}
