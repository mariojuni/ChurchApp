import React, { useState } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { X } from 'lucide-react';
import { DEFAULT_AVATAR, resizeAndConvertToBase64 } from '../../utils/image';

export default function NewMemberModal({ isOpen, onClose, showToast }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Member');
  const [status, setStatus] = useState('active');
  const [birthDate, setBirthDate] = useState('');
  const [ministryAssignments, setMinistryAssignments] = useState('');
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const base64Image = await resizeAndConvertToBase64(file);
      setAvatar(base64Image);
    } catch (err) {
      console.error("Error processing image file:", err);
      showToast("Failed to load image.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);

    try {
      await addDoc(collection(db, 'users'), {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
        status,
        birthDate: birthDate || 'None',
        ministryAssignments: ministryAssignments.trim() || 'None',
        avatar: avatar,
        createdAt: serverTimestamp()
      });
      showToast('Member created successfully!');
      
      // Reset form
      setName('');
      setEmail('');
      setPhone('');
      setRole('Member');
      setStatus('active');
      setBirthDate('');
      setMinistryAssignments('');
      setAvatar(DEFAULT_AVATAR);
      onClose();
    } catch (err) {
      console.error("Error adding member: ", err);
      showToast('Failed to add member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-sheet-header">
          <span className="modal-sheet-title">New Member Profile</span>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label>Name *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Full Name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="email@example.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input 
              type="tel" 
              className="form-input" 
              placeholder="e.g. 555-0100" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Role</label>
              <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="Member">Member</option>
                <option value="Staff">Staff</option>
                <option value="Elder">Elder</option>
                <option value="Worship Team">Worship Team</option>
                <option value="Youth Leader">Youth Leader</option>
                <option value="Children's Ministry">Children's Ministry</option>
              </select>
            </div>

            <div className="form-group">
              <label>Status</label>
              <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="active">Active</option>
                <option value="new">New</option>
                <option value="fellowship">Fellowship</option>
                <option value="inactive">Inactive</option>
                <option value="deceased">Deceased</option>
                <option value="transferred">Transferred</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Birth Date</label>
            <input 
              type="date" 
              className="form-input" 
              value={birthDate} 
              onChange={(e) => setBirthDate(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label>Ministry Assignments</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Ushers, Greeting" 
              value={ministryAssignments} 
              onChange={(e) => setMinistryAssignments(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label>Profile Picture</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-gradient)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)' }}>
              <img 
                src={avatar} 
                alt="Preview" 
                style={{ width: '60px', height: '60px', minWidth: '60px', minHeight: '60px', aspectRatio: '1/1', borderRadius: '16px', objectFit: 'cover', border: '2px solid var(--surface)', boxShadow: 'var(--shadow-sm)', flexShrink: 0 }} 
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                <label style={{ 
                  display: 'inline-block', 
                  textAlign: 'center',
                  padding: '8px 14px', 
                  background: 'var(--surface)', 
                  color: 'var(--primary)', 
                  border: '1px solid var(--primary)',
                  borderRadius: '8px', 
                  fontSize: '12px', 
                  fontWeight: 'bold', 
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}>
                  Upload from Gallery
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    style={{ display: 'none' }} 
                  />
                </label>
                {avatar !== DEFAULT_AVATAR && (
                  <button 
                    type="button" 
                    onClick={() => setAvatar(DEFAULT_AVATAR)}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: 'var(--text-secondary)', 
                      fontSize: '11px', 
                      fontWeight: '600',
                      cursor: 'pointer',
                      textAlign: 'left',
                      textDecoration: 'underline',
                      padding: 0
                    }}
                  >
                    Use Default Avatar
                  </button>
                )}
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={isSubmitting || !name.trim()}
            style={{ marginTop: '8px' }}
          >
            {isSubmitting ? 'Creating...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
