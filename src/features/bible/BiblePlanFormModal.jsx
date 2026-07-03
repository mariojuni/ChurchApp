import React, { useState, useEffect } from 'react';
import { X, FileText, Check } from 'lucide-react';
import { collection, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

const CHURCH_ID = 'casubiduan'; 

// First 7 Days of TGC Two-Year Plan
const TGC_TEMPLATE_DAYS = [
  { day: 1, passage: "Ezra 1; Acts 1" },
  { day: 2, passage: "Ezra 2; Acts 2" },
  { day: 3, passage: "Ezra 3; Acts 3" },
  { day: 4, passage: "Ezra 4; Acts 4" },
  { day: 5, passage: "Ezra 5; Acts 5" },
  { day: 6, passage: "Ezra 6; Acts 6" },
  { day: 7, passage: "Ezra 7; Acts 7" },
];

export default function BiblePlanFormModal({ isOpen, onClose, plan = null }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    durationDays: '',
    startDate: '',
    endDate: '',
    status: 'draft',
    readings: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [templateLoaded, setTemplateLoaded] = useState(false);

  useEffect(() => {
    if (plan) {
      setFormData({
        title: plan.title || '',
        description: plan.description || '',
        durationDays: plan.durationDays || '',
        startDate: plan.startDate || '',
        endDate: plan.endDate || '',
        status: plan.status || 'draft',
        readings: plan.readings || []
      });
    } else {
      setFormData({
        title: '',
        description: '',
        durationDays: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        status: 'draft',
        readings: []
      });
    }
    setError('');
    setTemplateLoaded(false);
  }, [plan, isOpen]);

  if (!isOpen) return null;

  const calculateEndDate = (startStr, durationDays) => {
    if (!startStr || !durationDays) return '';
    const date = new Date(startStr);
    // duration 1 means end date is the same as start date
    date.setDate(date.getDate() + parseInt(durationDays, 10) - 1);
    return date.toISOString().split('T')[0];
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // Auto-calculate end date if start date or duration changes
      if (name === 'startDate' && updated.durationDays) {
        updated.endDate = calculateEndDate(value, updated.durationDays);
      } else if (name === 'durationDays' && updated.startDate) {
        updated.endDate = calculateEndDate(updated.startDate, value);
      }
      
      return updated;
    });
  };

  const handleLoadTemplate = () => {
    setFormData(prev => ({
      ...prev,
      title: "TGC Two-Year Bible Reading Plan",
      description: "Based on the Robert Murray M'Cheyne reading plan modified by Don Carson. Read through the New Testament and Psalms twice and the Old Testament once over 2 years.",
      durationDays: 730,
      endDate: calculateEndDate(prev.startDate, 730),
      readings: TGC_TEMPLATE_DAYS
    }));
    setTemplateLoaded(true);
    setTimeout(() => setTemplateLoaded(false), 2000);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (Array.isArray(json)) {
          const duration = json.length;
          setFormData(prev => ({
            ...prev,
            readings: json,
            durationDays: duration,
            endDate: calculateEndDate(prev.startDate, duration) || prev.endDate
          }));
          alert(`Successfully loaded ${json.length} readings!`);
        } else {
          setError("Invalid JSON format. Expected an array of readings.");
        }
      } catch (err) {
        setError("Error parsing JSON file. Please ensure it is valid JSON.");
        console.error(err);
      }
    };
    reader.readAsText(file);
    // Reset input so they can upload the same file again if needed
    e.target.value = null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const plansColRef = collection(db, 'churches', CHURCH_ID, 'bible_plans');
      const docRef = plan ? doc(db, 'churches', CHURCH_ID, 'bible_plans', plan.id) : doc(plansColRef);

      const planDoc = {
        ...formData,
        durationDays: parseInt(formData.durationDays, 10) || 0,
        updatedAt: serverTimestamp(),
      };

      if (!plan) {
        planDoc.createdAt = serverTimestamp();
      }

      await setDoc(docRef, planDoc, { merge: true });
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save Bible Plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-church-soft overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-church-bg">
          <h2 className="text-xl font-bold text-church-navy">{plan ? 'Edit Reading Plan' : 'Create Reading Plan'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="overflow-y-auto">
          
          {/* Template Banner */}
          {!plan && (
            <div className="bg-blue-50 p-4 border-b border-blue-100 flex items-center justify-between">
              <div className="flex items-center text-blue-800 text-sm">
                <FileText size={18} className="mr-2 text-blue-600" />
                Want to use a pre-built reading plan?
              </div>
              <button 
                type="button"
                onClick={handleLoadTemplate}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center shadow-sm"
              >
                {templateLoaded ? <><Check size={14} className="mr-1" /> Loaded!</> : 'Load TGC 2-Year Plan'}
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
            
            <div>
              <label className="block text-sm font-medium text-church-navy mb-1">Plan Title *</label>
              <input 
                type="text" 
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. New Testament in 90 Days"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-church-navy mb-1">Description</label>
              <textarea 
                name="description"
                rows="3"
                value={formData.description}
                onChange={handleChange}
                placeholder="Summary or theme of the reading plan..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow resize-none" 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-church-navy mb-1">Start Date</label>
                <input 
                  type="date" 
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-church-navy mb-1">End Date</label>
                <input 
                  type="date" 
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-church-navy mb-1">Duration (Days)</label>
                <input 
                  type="number" 
                  name="durationDays"
                  value={formData.durationDays}
                  onChange={handleChange}
                  placeholder="e.g. 90"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-church-navy mb-1">Status</label>
                <select 
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow bg-white"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            {/* Readings Preview & Importer */}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-bold text-church-navy">Daily Readings Schema</label>
                
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                    {formData.readings?.length || 0} Days Loaded
                  </span>
                  
                  <div className="relative overflow-hidden inline-block">
                    <button type="button" className="px-3 py-1 bg-church-navy text-white text-xs font-bold rounded-md hover:bg-church-navy/90 shadow-sm cursor-pointer">
                      Import JSON
                    </button>
                    <input 
                      type="file" 
                      accept=".json"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
              
              {formData.readings?.length > 0 ? (
                <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden text-sm">
                  <div className="max-h-40 overflow-y-auto p-3 space-y-2">
                    {formData.readings.map((reading, idx) => (
                      <div key={idx} className="flex border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                        <span className="font-bold text-gray-500 w-16 shrink-0">Day {reading.day}</span>
                        <span className="text-church-navy font-medium">{reading.passage}</span>
                      </div>
                    ))}
                  </div>
                  {formData.readings.length === 7 && formData.durationDays === 730 && (
                    <div className="bg-blue-50 p-2 text-center text-xs font-bold text-blue-700 border-t border-blue-100">
                      Sample limited to 7 days. Full 730 days should be imported via JSON.
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-4 text-center text-sm text-gray-500 flex flex-col items-center">
                  <p className="mb-2">No readings loaded. Upload a JSON file to populate.</p>
                  <code className="text-xs bg-white border border-gray-200 px-2 py-1 rounded text-church-green">
                    [{"{"}"day": 1, "passage": "Genesis 1"{"}"}]
                  </code>
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end space-x-3">
              <button 
                type="button" 
                onClick={onClose}
                disabled={loading}
                className="px-5 py-2.5 bg-white border border-gray-300 rounded-full text-sm font-medium text-church-slate hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="px-6 py-2.5 bg-church-green text-white rounded-full text-sm font-medium hover:bg-church-green/90 transition-colors disabled:opacity-50 shadow-sm"
              >
                {loading ? 'Saving...' : 'Save Plan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
