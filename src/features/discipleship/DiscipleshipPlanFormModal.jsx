import React, { useState, useEffect } from 'react';
import { X, BookOpen, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { createDiscipleshipPlan, updateDiscipleshipPlan } from './discipleshipService';

export default function DiscipleshipPlanFormModal({ isOpen, onClose, plan = null, onSave }) {
  const { activeChurchId, currentUser } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    category: '',
    language: 'English',
    coverImageUrl: '',
    sourceTitle: '',
    sourceAuthor: '',
    status: 'draft',
    visibility: 'church_members_only',
    totalWeeks: 0
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (plan) {
      setFormData({
        title: plan.title || '',
        subtitle: plan.subtitle || '',
        description: plan.description || '',
        category: plan.category || '',
        language: plan.language || 'English',
        coverImageUrl: plan.coverImageUrl || '',
        sourceTitle: plan.sourceTitle || '',
        sourceAuthor: plan.sourceAuthor || '',
        status: plan.status || 'draft',
        visibility: plan.visibility || 'church_members_only',
        totalWeeks: plan.totalWeeks || 0
      });
    }
  }, [plan]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!activeChurchId) {
      setError('Church ID is missing.');
      setLoading(false);
      return;
    }

    try {
      if (plan) {
        await updateDiscipleshipPlan(activeChurchId, plan.id, formData, currentUser?.uid);
      } else {
        await createDiscipleshipPlan(activeChurchId, formData, currentUser?.uid);
      }
      onSave();
      onClose();
    } catch (err) {
      console.error('Error saving plan:', err);
      setError(err.message || 'Failed to save discipleship plan.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-church-navy/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-church-green/10 rounded-full flex items-center justify-center mr-3">
              <BookOpen size={20} className="text-church-green" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-church-navy">
                {plan ? 'Edit Discipleship Plan' : 'Create Discipleship Plan'}
              </h2>
              <p className="text-sm text-gray-500">
                {plan ? 'Update plan details' : 'Set up a new weekly study plan'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {error && (
            <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100">
              {error}
            </div>
          )}

          <form id="plan-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4 md:col-span-2">
                <div>
                  <label className="block text-sm font-bold text-church-navy mb-1.5">Plan Title *</label>
                  <input
                    type="text"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-church-green focus:ring-1 focus:ring-church-green outline-none transition-all"
                    placeholder="e.g. The Story of God"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-church-navy mb-1.5">Subtitle</label>
                  <input
                    type="text"
                    name="subtitle"
                    value={formData.subtitle}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-church-green focus:ring-1 focus:ring-church-green outline-none transition-all"
                    placeholder="e.g. Volume 1: From Creation to Wilderness"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-church-navy mb-1.5">Description</label>
                  <textarea
                    name="description"
                    rows="3"
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-church-green focus:ring-1 focus:ring-church-green outline-none transition-all resize-none"
                    placeholder="Describe what this plan is about..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-church-navy mb-1.5">Category</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-church-green focus:ring-1 focus:ring-church-green outline-none transition-all"
                  placeholder="e.g. Foundations"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-church-navy mb-1.5">Language</label>
                <select
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-church-green focus:ring-1 focus:ring-church-green outline-none transition-all"
                >
                  <option value="English">English</option>
                  <option value="Tagalog">Tagalog</option>
                  <option value="Cebuano">Cebuano</option>
                  <option value="Spanish">Spanish</option>
                </select>
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <label className="block text-sm font-bold text-church-navy mb-1.5">Source Title</label>
                  <input
                    type="text"
                    name="sourceTitle"
                    value={formData.sourceTitle}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-church-green outline-none"
                    placeholder="e.g. The Story of God Booklet"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-church-navy mb-1.5">Source Author</label>
                  <input
                    type="text"
                    name="sourceAuthor"
                    value={formData.sourceAuthor}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-church-green outline-none"
                    placeholder="e.g. John Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-church-navy mb-1.5">Visibility</label>
                <select
                  name="visibility"
                  value={formData.visibility}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-church-green focus:ring-1 focus:ring-church-green outline-none transition-all"
                >
                  <option value="church_members_only">Church Members Only</option>
                  <option value="public">Public</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-church-navy mb-1.5">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-church-green focus:ring-1 focus:ring-church-green outline-none transition-all"
                >
                  <option value="draft">Draft (Hidden)</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-church-navy mb-1.5">Cover Image URL</label>
                <input
                  type="url"
                  name="coverImageUrl"
                  value={formData.coverImageUrl}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-church-green focus:ring-1 focus:ring-church-green outline-none transition-all"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:text-church-navy hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="plan-form"
            disabled={loading}
            className="flex items-center px-6 py-2.5 text-sm font-bold text-white bg-church-green hover:bg-church-green-dark rounded-xl transition-colors disabled:opacity-50 shadow-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : (
              <Check size={18} className="mr-2" />
            )}
            {plan ? 'Save Changes' : 'Create Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}
