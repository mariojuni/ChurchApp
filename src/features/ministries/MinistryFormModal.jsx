import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

export default function MinistryFormModal({ isOpen, onClose, ministry = null }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'Active',
    roles: ['Leader', 'Member']
  });
  const [newRole, setNewRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ministry) {
      setFormData({
        name: ministry.name || '',
        description: ministry.description || '',
        status: ministry.status || 'Active',
        roles: ministry.roles || ['Leader', 'Member']
      });
    } else {
      setFormData({
        name: '',
        description: '',
        status: 'Active',
        roles: ['Leader', 'Member']
      });
    }
    setError('');
    setNewRole('');
  }, [ministry, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddRole = (e) => {
    e.preventDefault();
    if (newRole.trim() && !formData.roles.includes(newRole.trim())) {
      setFormData(prev => ({
        ...prev,
        roles: [...prev.roles, newRole.trim()]
      }));
      setNewRole('');
    }
  };

  const handleRemoveRole = (roleToRemove) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.filter(r => r !== roleToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (ministry) {
        await updateDoc(doc(db, 'ministries', ministry.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'ministries'), {
          ...formData,
          members: [],
          createdAt: serverTimestamp(),
          churchId: 'casubiduan' 
        });
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save ministry data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-church-soft overflow-hidden flex flex-col my-8">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-church-navy">{ministry ? 'Edit Ministry' : 'Create Ministry'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors bg-white p-2 rounded-full shadow-sm">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 overflow-y-auto">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium text-church-navy mb-1">Ministry Name *</label>
            <input type="text" name="name" required value={formData.name} onChange={handleChange} placeholder="e.g. Praise and Worship" className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green" />
          </div>

          <div>
            <label className="block text-sm font-medium text-church-navy mb-1">Description</label>
            <textarea name="description" rows="3" value={formData.description} onChange={handleChange} placeholder="What is the purpose of this ministry?" className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green resize-none"></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-church-navy mb-1">Status</label>
            <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green bg-white">
              <option value="Active">Active</option>
              <option value="Archived">Archived</option>
            </select>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <label className="block text-sm font-medium text-church-navy mb-2">Custom Roles</label>
            <p className="text-xs text-church-slate mb-3">Define the specific roles members can have in this ministry (e.g. Vocalist, Drummer, Sound Tech).</p>
            
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.roles.map(role => (
                <div key={role} className="flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                  {role}
                  <button type="button" onClick={() => handleRemoveRole(role)} className="ml-2 text-blue-400 hover:text-blue-600 focus:outline-none">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex space-x-2">
              <input 
                type="text" 
                value={newRole} 
                onChange={(e) => setNewRole(e.target.value)} 
                placeholder="New Role Name" 
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-church-green"
                onKeyDown={(e) => { if(e.key === 'Enter') handleAddRole(e); }}
              />
              <button type="button" onClick={handleAddRole} className="px-3 py-1.5 bg-gray-100 text-church-navy rounded-lg text-sm font-medium hover:bg-gray-200">
                Add Role
              </button>
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-gray-100 flex justify-end space-x-3 bg-gray-50/50">
          <button type="button" onClick={onClose} disabled={loading} className="px-5 py-2.5 bg-white border border-gray-300 rounded-full text-sm font-bold text-church-slate hover:bg-gray-100 transition-colors">
            Cancel
          </button>
          <button type="submit" onClick={handleSubmit} disabled={loading} className="px-6 py-2.5 bg-church-green text-white rounded-full text-sm font-bold hover:bg-church-green/90 transition-colors disabled:opacity-50 shadow-md">
            {loading ? 'Saving...' : 'Save Ministry'}
          </button>
        </div>
      </div>
    </div>
  );
}
