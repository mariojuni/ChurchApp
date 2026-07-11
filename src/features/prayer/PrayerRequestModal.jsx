import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

export default function PrayerRequestModal({ isOpen, onClose, request = null, churchId }) {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    requesterName: '',
    requestText: '',
    status: 'pending',
    visibility: 'public', // public, leaders_only
    category: 'other'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (request) {
      setFormData({
        requesterName: request.requesterName || '',
        requestText: request.requestText || '',
        status: request.status || 'pending',
        visibility: request.visibility || 'public',
        category: request.category || 'other'
      });
    } else {
      setFormData({
        requesterName: '',
        requestText: '',
        status: 'pending',
        visibility: 'public',
        category: 'other'
      });
    }
    setError('');
  }, [request, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!churchId) {
      setError('Church ID is missing. Cannot save.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const prayersColRef = collection(db, 'churches', churchId, 'prayer_requests');
      const docRef = request ? doc(db, 'churches', churchId, 'prayer_requests', request.id) : doc(prayersColRef);

      const prayerDoc = {
        ...formData,
        requesterName: formData.requesterName || 'Anonymous',
        updatedAt: serverTimestamp(),
      };

      if (!request) {
        prayerDoc.createdAt = serverTimestamp();
        prayerDoc.userId = currentUser?.uid; // Required by firestore.rules
      }

      await setDoc(docRef, prayerDoc, { merge: true });
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save prayer request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-church-soft overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-church-bg">
          <h2 className="text-xl font-bold text-church-navy">{request ? 'Edit Prayer Request' : 'Add Prayer Request'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
            
            <div>
              <label className="block text-sm font-medium text-church-navy mb-1">Requester Name (Optional)</label>
              <input 
                type="text" 
                name="requesterName"
                value={formData.requesterName}
                onChange={handleChange}
                placeholder="Leave blank for Anonymous"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-church-navy mb-1">Prayer Request *</label>
              <textarea 
                name="requestText"
                required
                rows="4"
                value={formData.requestText}
                onChange={handleChange}
                placeholder="What can we pray for?"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow resize-none" 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-church-navy mb-1">Status</label>
                <select 
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow bg-white"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="answered">Answered</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-church-navy mb-1">Visibility</label>
                <select 
                  name="visibility"
                  value={formData.visibility}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow bg-white"
                >
                  <option value="public">Public Wall</option>
                  <option value="leaders_only">Leaders Only</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-church-navy mb-1">Category</label>
              <select 
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow bg-white"
              >
                <option value="healing">Healing</option>
                <option value="family">Family</option>
                <option value="spiritual_growth">Spiritual Growth</option>
                <option value="provision">Provision</option>
                <option value="thanksgiving">Thanksgiving</option>
                <option value="other">Other</option>
              </select>
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
                {loading ? 'Saving...' : 'Save Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
