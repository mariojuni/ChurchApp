import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function NewPrayerModal({ isOpen, onClose, showToast }) {
  const { currentUser, userProfile } = useAuth();
  const [prayerText, setPrayerText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prayerText.trim() || !currentUser) return;
    setIsSubmitting(true);
    
    const displayName = userProfile?.name || currentUser.displayName || currentUser.email || 'Anonymous';
    
    try {
      await addDoc(collection(db, 'prayers'), {
        name: isAnonymous ? 'Anonymous' : displayName,
        userId: currentUser.uid,
        request: prayerText.trim(),
        createdAt: serverTimestamp(),
        likes: 0,
        likedBy: [],
        answered: false
      });
      showToast('Prayer request shared!');
      setPrayerText('');
      setIsAnonymous(false);
      onClose();
    } catch (err) {
      console.error("Error sharing prayer request: ", err);
      showToast('Failed to share prayer request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(26, 19, 48, 0.4)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-end',
      zIndex: 2000,
      animation: 'fadeInOverlay 0.2s ease-out forwards'
    }} onClick={onClose}>
      <div style={{
        width: '100%',
        backgroundColor: 'var(--surface)',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        padding: '24px',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.15)',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>Share a Prayer Request</h3>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--text-secondary)', 
              cursor: 'pointer', 
              fontSize: '14px', 
              fontWeight: '600' 
            }}
          >
            Cancel
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <textarea
            placeholder="How can we pray for you today?"
            value={prayerText}
            onChange={(e) => setPrayerText(e.target.value)}
            required
            rows={4}
            maxLength={300}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              background: 'var(--bg-gradient)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'none',
              outline: 'none'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
              Post Anonymously
            </label>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {300 - prayerText.length} characters left
            </span>
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !prayerText.trim()}
            className="btn-primary"
            style={{ 
              width: '100%', 
              padding: '14px', 
              borderRadius: '16px', 
              border: 'none', 
              color: '#fff', 
              fontSize: '15px', 
              fontWeight: 'bold', 
              cursor: 'pointer',
              opacity: (isSubmitting || !prayerText.trim()) ? 0.6 : 1
            }}
          >
            {isSubmitting ? 'Sharing...' : 'Share Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
