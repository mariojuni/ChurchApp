import React, { useState, useEffect } from 'react';
import { X, Smartphone, Megaphone, Calendar } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

const AUDIENCE_OPTIONS = [
  'All Members',
  'Youth',
  'Parents',
  'Ministry Leaders',
  'Sunday School Teachers',
  'Specific Ministry',
  'Specific Age Group'
];

export default function AnnouncementFormModal({ isOpen, onClose, announcement }) {
  const { userProfile } = useAuth();
  
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [targetAudience, setTargetAudience] = useState(['All Members']);
  
  const [publishDate, setPublishDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  
  const [pushNotification, setPushNotification] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (announcement) {
        setTitle(announcement.title || '');
        setMessage(announcement.message || '');
        setImageUrl(announcement.imageUrl || '');
        setTargetAudience(announcement.targetAudience || ['All Members']);
        
        // Convert ISO strings to datetime-local format (YYYY-MM-DDThh:mm)
        setPublishDate(announcement.publishDate ? new Date(announcement.publishDate).toISOString().slice(0, 16) : '');
        setExpiryDate(announcement.expiryDate ? new Date(announcement.expiryDate).toISOString().slice(0, 16) : '');
        
        setPushNotification(announcement.pushNotification || false);
      } else {
        // Defaults for new
        setTitle('');
        setMessage('');
        setImageUrl('');
        setTargetAudience(['All Members']);
        
        // Default publish date to now
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        setPublishDate(now.toISOString().slice(0, 16));
        
        // Default expiry to 30 days from now
        const future = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
        setExpiryDate(future.toISOString().slice(0, 16));
        
        setPushNotification(false);
      }
      setError('');
    }
  }, [isOpen, announcement]);

  if (!isOpen) return null;

  const toggleAudience = (aud) => {
    if (aud === 'All Members') {
      setTargetAudience(['All Members']);
      return;
    }
    
    let newAud = targetAudience.filter(a => a !== 'All Members');
    if (newAud.includes(aud)) {
      newAud = newAud.filter(a => a !== aud);
    } else {
      newAud.push(aud);
    }
    
    if (newAud.length === 0) newAud = ['All Members'];
    setTargetAudience(newAud);
  };

  const handleSave = async (status) => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!message.trim()) {
      setError('Message is required');
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      title: title.trim(),
      message: message.trim(),
      imageUrl: imageUrl.trim(),
      targetAudience,
      publishDate: publishDate ? new Date(publishDate).toISOString() : null,
      expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
      pushNotification,
      status: status, // 'Draft' or 'Published'
      author: userProfile?.name || 'Admin',
      updatedAt: serverTimestamp()
    };

    try {
      if (announcement?.id) {
        await updateDoc(doc(db, 'announcements', announcement.id), payload);
      } else {
        payload.createdAt = serverTimestamp();
        payload.churchId = 'YmEc6C69Xz4DKRQaQZBV';
        await addDoc(collection(db, 'announcements'), payload);
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save announcement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-church-soft overflow-hidden flex flex-col my-8">
        
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-church-navy text-white">
          <h2 className="text-xl font-bold flex items-center">
            <Megaphone size={20} className="mr-2 text-church-green" />
            {announcement ? 'Edit Announcement' : 'Create Announcement'}
          </h2>
          <button onClick={onClose} className="text-gray-300 hover:text-white transition-colors bg-white/10 p-2 rounded-full">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
          
          <div>
            <label className="block text-sm font-bold text-church-navy mb-2">Title</label>
            <input 
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green"
              placeholder="e.g. Youth Camp Registration Open!"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-church-navy mb-2">Message</label>
            <textarea 
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green h-32 resize-none"
              placeholder="Write your announcement here..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-church-navy mb-2">Target Audience</label>
            <div className="flex flex-wrap gap-2">
              {AUDIENCE_OPTIONS.map(aud => (
                <button
                  key={aud}
                  type="button"
                  onClick={() => toggleAudience(aud)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    targetAudience.includes(aud)
                      ? 'bg-church-navy text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {aud}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-church-navy mb-2">Publish Date & Time</label>
              <div className="relative">
                <input 
                  type="datetime-local"
                  value={publishDate}
                  onChange={e => setPublishDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green text-sm"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Set to future date to schedule</p>
            </div>
            <div>
              <label className="block text-sm font-bold text-church-navy mb-2">Expiry Date & Time</label>
              <div className="relative">
                <input 
                  type="datetime-local"
                  value={expiryDate}
                  onChange={e => setExpiryDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green text-sm"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Post hides automatically after this date</p>
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50 flex items-start">
            <div className="flex h-5 items-center">
              <input
                id="pushNotification"
                type="checkbox"
                checked={pushNotification}
                onChange={e => setPushNotification(e.target.checked)}
                className="w-4 h-4 text-church-green bg-gray-100 border-gray-300 rounded focus:ring-church-green focus:ring-2"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="pushNotification" className="font-bold text-church-navy flex items-center cursor-pointer">
                <Smartphone size={16} className="mr-1 text-blue-600" /> Send Push Notification
              </label>
              <p className="text-gray-500 mt-1">If enabled, members in the target audience will receive a notification on their device immediately when this publishes.</p>
            </div>
          </div>

        </div>
        
        <div className="p-6 border-t border-gray-100 flex justify-end space-x-3 bg-gray-50/50">
          <button 
            type="button" 
            onClick={onClose} 
            disabled={saving} 
            className="px-5 py-2.5 bg-white border border-gray-300 rounded-full text-sm font-bold text-church-slate hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          
          <button 
            type="button" 
            onClick={() => handleSave('Draft')} 
            disabled={saving} 
            className="px-5 py-2.5 bg-gray-200 text-church-navy rounded-full text-sm font-bold hover:bg-gray-300 transition-colors disabled:opacity-50"
          >
            Save Draft
          </button>
          
          <button 
            type="button" 
            onClick={() => handleSave('Published')} 
            disabled={saving} 
            className="px-6 py-2.5 bg-church-green text-white rounded-full text-sm font-bold hover:bg-church-green/90 transition-colors disabled:opacity-50 shadow-md"
          >
            {saving ? 'Saving...' : 'Publish'}
          </button>
        </div>

      </div>
    </div>
  );
}
