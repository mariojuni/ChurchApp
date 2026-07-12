import React, { useState, useEffect } from 'react';
import { X, BookOpen, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { saveDiscipleshipWeeks } from './discipleshipService';

export default function DiscipleshipWeekFormModal({ isOpen, onClose, planId, week = null, nextWeekNumber = 1, onSave }) {
  const { userProfile } = useAuth();
  const CHURCH_ID = userProfile?.churchId || 'YmEc6C69Xz4DKRQaQZBV';
  
  const [formData, setFormData] = useState({
    weekNumber: nextWeekNumber,
    chapterNumber: '',
    chapterTitle: '',
    scriptureReference: '',
    suggestedFlow: '',
    storyText: '',
    retellInstruction: '',
    retellActivity: '',
    discussionQuestions: '',
    keyTruths: '',
    applicationQuestions: '',
    additionalStudy: '',
    memoryVerse: '',
    sermonLink: '',
    estimatedDurationMinutes: 60,
    status: 'draft'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (week) {
      setFormData({
        id: week.id,
        weekNumber: week.weekNumber || nextWeekNumber,
        chapterNumber: week.chapterNumber || '',
        chapterTitle: week.chapterTitle || '',
        scriptureReference: week.scriptureReference || '',
        suggestedFlow: week.suggestedFlow || '',
        storyText: week.storyText || '',
        retellInstruction: week.retellInstruction || '',
        retellActivity: week.retellActivity || '',
        discussionQuestions: week.discussionQuestions || '',
        keyTruths: week.keyTruths || '',
        applicationQuestions: week.applicationQuestions || '',
        additionalStudy: week.additionalStudy || '',
        memoryVerse: week.memoryVerse || '',
        sermonLink: week.sermonLink || '',
        estimatedDurationMinutes: week.estimatedDurationMinutes || 60,
        status: week.status || 'published'
      });
    } else {
      setFormData({
        weekNumber: nextWeekNumber,
        chapterNumber: '',
        chapterTitle: '',
        scriptureReference: '',
        suggestedFlow: '',
        storyText: '',
        retellInstruction: '',
        retellActivity: '',
        discussionQuestions: '',
        keyTruths: '',
        applicationQuestions: '',
        additionalStudy: '',
        memoryVerse: '',
        sermonLink: '',
        estimatedDurationMinutes: 60,
        status: 'draft'
      });
    }
  }, [week, nextWeekNumber, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'weekNumber' || name === 'estimatedDurationMinutes' || name === 'chapterNumber' 
        ? Number(value) 
        : value 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!CHURCH_ID || !planId) {
      setError('Church ID or Plan ID is missing.');
      setLoading(false);
      return;
    }

    try {
      await saveDiscipleshipWeeks(CHURCH_ID, planId, [formData]);
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to save week.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-church-navy/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-church-green/10 rounded-full flex items-center justify-center mr-3">
              <BookOpen size={20} className="text-church-green" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-church-navy">
                {week ? `Edit Week ${formData.weekNumber}` : `Add Week ${formData.weekNumber}`}
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {error && (
            <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl text-sm">{error}</div>
          )}

          <form id="week-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-bold text-church-navy mb-1.5">Week Number</label>
                <input
                  type="number"
                  name="weekNumber"
                  required
                  value={formData.weekNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-church-green outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-church-navy mb-1.5">Chapter Number</label>
                <input
                  type="number"
                  name="chapterNumber"
                  value={formData.chapterNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-church-green outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-church-navy mb-1.5">Duration (mins)</label>
                <input
                  type="number"
                  name="estimatedDurationMinutes"
                  value={formData.estimatedDurationMinutes}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-church-green outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-church-navy mb-1.5">Chapter Title</label>
                <input
                  type="text"
                  name="chapterTitle"
                  required
                  value={formData.chapterTitle}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-church-green outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-church-navy mb-1.5">Scripture Reference</label>
                <input
                  type="text"
                  name="scriptureReference"
                  required
                  value={formData.scriptureReference}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-church-green outline-none"
                  placeholder="e.g. Genesis 1:1-2:3"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-church-navy mb-1.5">Suggested Flow</label>
                <textarea
                  name="suggestedFlow"
                  rows="3"
                  value={formData.suggestedFlow}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-church-green outline-none"
                  placeholder="e.g. 1. Opening prayer, 2. Read the story..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-church-navy mb-1.5">Story Text</label>
                <textarea
                  name="storyText"
                  rows="4"
                  value={formData.storyText}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-church-green outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-church-navy mb-1.5">Retell Instruction</label>
                <textarea
                  name="retellInstruction"
                  rows="2"
                  value={formData.retellInstruction}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-church-green outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-church-navy mb-1.5">Retell Activity</label>
                <textarea
                  name="retellActivity"
                  rows="3"
                  value={formData.retellActivity}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-church-green outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-church-navy mb-1.5">Discussion Questions (JSON or text)</label>
                <textarea
                  name="discussionQuestions"
                  rows="3"
                  value={formData.discussionQuestions}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-church-green outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-church-navy mb-1.5">Key Truths</label>
                <textarea
                  name="keyTruths"
                  rows="3"
                  value={formData.keyTruths}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-church-green outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-church-navy mb-1.5">Application</label>
                <textarea
                  name="applicationQuestions"
                  rows="3"
                  value={formData.applicationQuestions}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-church-green outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-church-navy mb-1.5">Memory Verse</label>
                <input
                  type="text"
                  name="memoryVerse"
                  value={formData.memoryVerse}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-church-green outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-church-navy mb-1.5">Additional Study</label>
                <textarea
                  name="additionalStudy"
                  rows="3"
                  value={formData.additionalStudy}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-church-green outline-none"
                  placeholder="Optional additional study material or assignments"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-church-navy mb-1.5">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-church-green outline-none"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl">Cancel</button>
          <button type="submit" form="week-form" disabled={loading} className="flex items-center px-6 py-2.5 text-sm font-bold text-white bg-church-green hover:bg-church-green-dark rounded-xl">
            {loading ? 'Saving...' : 'Save Week'}
          </button>
        </div>
      </div>
    </div>
  );
}
