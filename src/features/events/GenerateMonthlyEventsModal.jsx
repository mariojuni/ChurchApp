import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_TEMPLATES, checkExistingEvents, generatePreview, saveGeneratedEvents } from './eventGeneratorService';
import ModernDropdown from '../../components/ui/ModernDropdown';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function GenerateMonthlyEventsModal({ isOpen, onClose }) {
  const { userProfile } = useAuth();
  const CHURCH_ID = userProfile?.churchId || 'YmEc6C69Xz4DKRQaQZBV';
  
  const [step, setStep] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [previewEvents, setPreviewEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Draft');

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setPreviewEvents([]);
      setError('');
      setLoading(false);
      setStatus('Draft');
      // Reset month/year to next month by default
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      setSelectedMonth(nextMonth.getMonth());
      setSelectedYear(nextMonth.getFullYear());
      // Reset templates selection
      setTemplates(DEFAULT_TEMPLATES.map(t => ({ ...t, isSelected: true })));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleTemplate = (id) => {
    setTemplates(templates.map(t => t.id === id ? { ...t, isSelected: !t.isSelected } : t));
  };

  const handleTemplateChange = (id, field, value) => {
    setTemplates(templates.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handlePreview = async () => {
    const selectedTemps = templates.filter(t => t.isSelected);
    if (selectedTemps.length === 0) {
      setError('Please select at least one template.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const existingEvents = await checkExistingEvents(CHURCH_ID, selectedYear, selectedMonth);
      const generated = generatePreview(selectedYear, selectedMonth, selectedTemps, existingEvents);
      
      if (generated.length === 0) {
        setError('No events generated for the selected month/templates.');
      } else {
        setPreviewEvents(generated);
        setStep(2);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to generate preview.');
    } finally {
      setLoading(false);
    }
  };

  const toggleEventSelection = (previewId) => {
    setPreviewEvents(previewEvents.map(e => 
      e._previewId === previewId ? { ...e, selected: !e.selected } : e
    ));
  };
  
  const toggleAllEvents = (select) => {
    setPreviewEvents(previewEvents.map(e => ({ ...e, selected: select })));
  };

  const handleGenerate = async () => {
    const eventsToSave = previewEvents.filter(e => e.selected);
    if (eventsToSave.length === 0) {
      setError('Please select at least one event to generate.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const generatedMonth = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
      await saveGeneratedEvents(eventsToSave, status, CHURCH_ID, generatedMonth);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save events.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-church-soft overflow-hidden flex flex-col my-8 max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-church-navy">Generate Monthly Events</h2>
            <p className="text-sm text-church-slate mt-1">Automatically create recurring events for a specific month.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm mb-4 flex items-center"><AlertCircle size={16} className="mr-2"/>{error}</div>}
          
          {step === 1 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-2">Select Month</label>
                  <ModernDropdown
                    value={selectedMonth}
                    onChange={(val) => setSelectedMonth(Number(val))}
                    options={MONTHS.map((m, i) => ({ value: i, label: m }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-2">Select Year</label>
                  <ModernDropdown
                    value={selectedYear}
                    onChange={(val) => setSelectedYear(Number(val))}
                    options={[
                      { value: selectedYear, label: String(selectedYear) },
                      { value: selectedYear + 1, label: String(selectedYear + 1) }
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-church-navy mb-3">Select Templates</label>
                <div className="grid grid-cols-1 gap-3">
                  {templates.map(template => (
                    <div key={template.id} className={`p-4 border rounded-xl transition-colors ${template.isSelected ? 'border-church-green bg-green-50/10' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <label className="flex items-start cursor-pointer group">
                        <div className="flex items-center h-5 mt-1">
                          <input 
                            type="checkbox" 
                            checked={template.isSelected}
                            onChange={() => toggleTemplate(template.id)}
                            className="w-4 h-4 text-church-green border-gray-300 rounded focus:ring-church-green"
                          />
                        </div>
                        <div className="ml-3 flex-1" onClick={e => e.preventDefault()}>
                          {template.isSelected ? (
                            <div className="space-y-2 mt-0.5 pr-2">
                              <input 
                                type="text" 
                                value={template.title}
                                onChange={(e) => handleTemplateChange(template.id, 'title', e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full text-sm font-bold text-church-navy bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-church-green"
                              />
                              <div className="flex flex-wrap items-center gap-2 text-xs text-church-slate" onClick={(e) => e.stopPropagation()}>
                                <span className="flex items-center">Every <span className="capitalize ml-1">{template.dayOfWeek}</span></span>
                                <span>•</span>
                                <div className="flex items-center space-x-1">
                                  <input 
                                    type="time" 
                                    value={template.startTime}
                                    onChange={(e) => handleTemplateChange(template.id, 'startTime', e.target.value)}
                                    className="border border-gray-300 rounded px-1 py-0.5 bg-white focus:outline-none focus:border-church-green"
                                  />
                                  <span>-</span>
                                  <input 
                                    type="time" 
                                    value={template.endTime}
                                    onChange={(e) => handleTemplateChange(template.id, 'endTime', e.target.value)}
                                    className="border border-gray-300 rounded px-1 py-0.5 bg-white focus:outline-none focus:border-church-green"
                                  />
                                </div>
                                <span>•</span>
                                <input 
                                  type="text" 
                                  value={template.location}
                                  placeholder="Location"
                                  onChange={(e) => handleTemplateChange(template.id, 'location', e.target.value)}
                                  className="border border-gray-300 rounded px-2 py-0.5 bg-white focus:outline-none focus:border-church-green flex-1 min-w-[120px]"
                                />
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm font-bold text-church-navy">{template.title}</p>
                              <p className="text-xs text-church-slate mt-0.5">
                                Every <span className="capitalize">{template.dayOfWeek}</span> • {template.startTime} - {template.endTime} {template.location && `• ${template.location}`}
                              </p>
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h3 className="text-lg font-bold text-church-navy">Preview Events</h3>
                  <p className="text-sm text-church-slate">Review generated events before saving.</p>
                </div>
                <div className="flex space-x-3 text-sm">
                  <button onClick={() => toggleAllEvents(true)} className="text-church-green hover:underline font-medium">Select All</button>
                  <button onClick={() => toggleAllEvents(false)} className="text-church-slate hover:underline font-medium">Deselect All</button>
                </div>
              </div>
              
              <div className="space-y-2">
                {previewEvents.map((event) => (
                  <label key={event._previewId} className={`flex items-center p-3 border rounded-xl cursor-pointer transition-colors ${event.isDuplicate ? 'bg-orange-50/50 border-orange-200' : (event.selected ? 'bg-white border-church-green' : 'bg-gray-50 border-gray-200')}`}>
                    <div className="flex items-center h-5 mr-3">
                      <input 
                        type="checkbox" 
                        checked={event.selected}
                        onChange={() => toggleEventSelection(event._previewId)}
                        className="w-4 h-4 text-church-green border-gray-300 rounded focus:ring-church-green"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-church-navy truncate">{event.title}</p>
                        <p className="text-xs text-church-slate flex items-center mt-0.5">
                          <CalendarIcon size={12} className="mr-1 opacity-70" />
                          {event.date} • {event.startTime} - {event.endTime}
                        </p>
                      </div>
                      
                      {event.isDuplicate && (
                        <div className="ml-2 flex items-center px-2 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded">
                          <AlertCircle size={12} className="mr-1" />
                          Duplicate Exists
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
              
              <div className="pt-4 mt-6 border-t border-gray-100">
                <label className="block text-sm font-medium text-church-navy mb-2">Status after generation</label>
                <div className="w-64">
                  <ModernDropdown
                    value={status}
                    onChange={(val) => setStatus(val)}
                    options={[
                      { value: 'Draft', label: 'Save as Draft' },
                      { value: 'Published', label: 'Publish Immediately' }
                    ]}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
          {step === 2 ? (
            <button 
              type="button" 
              onClick={() => setStep(1)}
              disabled={loading}
              className="px-5 py-2.5 bg-white border border-gray-300 rounded-full text-sm font-medium text-church-slate hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
          ) : (
            <button 
              type="button" 
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 bg-white border border-gray-300 rounded-full text-sm font-medium text-church-slate hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
          
          {step === 1 ? (
            <button 
              type="button" 
              onClick={handlePreview}
              disabled={loading}
              className="px-5 py-2.5 bg-church-green text-white rounded-full text-sm font-medium hover:bg-church-green/90 transition-colors disabled:opacity-50 flex items-center"
            >
              {loading ? 'Processing...' : 'Preview Events'}
            </button>
          ) : (
            <button 
              type="button" 
              onClick={handleGenerate}
              disabled={loading || previewEvents.filter(e => e.selected).length === 0}
              className="px-5 py-2.5 bg-church-green text-white rounded-full text-sm font-medium hover:bg-church-green/90 transition-colors disabled:opacity-50 flex items-center"
            >
              {loading ? 'Saving...' : `Generate ${previewEvents.filter(e => e.selected).length} Events`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
