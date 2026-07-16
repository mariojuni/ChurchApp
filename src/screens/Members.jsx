import React, { useState, useEffect } from 'react';
import { Filter, Search, X, Mail, Phone, Cake, Briefcase, QrCode } from 'lucide-react';
import { db } from '../firebase';
import { 
  doc,
  updateDoc
} from 'firebase/firestore';
import { DEFAULT_AVATAR, resizeAndConvertToBase64 } from '../utils/image';
import ModernDropdown from '../components/ui/ModernDropdown';
import ModernDatePicker from '../components/ui/ModernDatePicker';

const formatDate = (dateStr) => {
  if (!dateStr || dateStr === 'None') return 'N/A';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

export function MemberDetailModal({ isOpen, onClose, member, isStaff, onEdit }) {
  if (!isOpen || !member) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-sheet-header">
          <span className="modal-sheet-title">Member Profile</span>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="profile-hero">
          <img 
            src={member.avatar || DEFAULT_AVATAR} 
            alt={member.name} 
            className="profile-hero-avatar" 
          />
          <h3>{member.name}</h3>
          <div className="profile-badges">
            <span className="profile-badge status-active" style={{ background: 'var(--primary-gradient)', color: '#fff' }}>
              {member.role}
            </span>
            <span className={`profile-badge status-${member.status}`}>
              {member.status?.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="detail-section">
          <span className="detail-section-title">Contact Details</span>
          <div className="detail-card">
            <div className="detail-row">
              <div className="detail-icon">
                <Mail size={16} />
              </div>
              <div className="detail-info">
                <span className="detail-label">Email Address</span>
                <span className="detail-value">{member.email || 'N/A'}</span>
              </div>
            </div>
            <div className="detail-row">
              <div className="detail-icon">
                <Phone size={16} />
              </div>
              <div className="detail-info">
                <span className="detail-label">Phone Number</span>
                <span className="detail-value">{member.phone || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <span className="detail-section-title">Personal Info & Groups</span>
          <div className="detail-card">
            <div className="detail-row">
              <div className="detail-icon">
                <Cake size={16} />
              </div>
              <div className="detail-info">
                <span className="detail-label">Birth Date</span>
                <span className="detail-value">{formatDate(member.birthDate)}</span>
              </div>
            </div>
            <div className="detail-row">
              <div className="detail-icon">
                <Briefcase size={16} />
              </div>
              <div className="detail-info">
                <span className="detail-label">Ministry Assignment</span>
                <span className="detail-value">{member.ministryAssignments || 'None'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <span className="detail-section-title">Check-in QR Code</span>
          <div className="detail-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', gap: '12px' }}>
            <div style={{ background: '#fff', padding: '10px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: 'var(--shadow-sm)' }}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${member.id}`} 
                alt={`${member.name} QR Code`} 
                style={{ width: '150px', height: '150px', display: 'block' }}
              />
            </div>
            <button 
              onClick={async () => {
                try {
                  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${member.id}`;
                  const response = await fetch(qrUrl);
                  const blob = await response.blob();
                  const blobUrl = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = blobUrl;
                  link.download = `qr-${member.id}.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(blobUrl);
                } catch (error) {
                  console.error("Error downloading QR: ", error);
                  window.open(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${member.id}`, '_blank');
                }
              }}
              className="btn-secondary"
              style={{ width: '100%', padding: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <QrCode size={16} /> Save QR Code to Gallery
            </button>
          </div>
        </div>

        {isStaff && (
          <button 
            onClick={() => onEdit && onEdit(member)} 
            className="btn-primary" 
            style={{ marginTop: '16px', background: 'var(--primary-gradient)' }}
          >
            Edit Profile
          </button>
        )}
      </div>
    </div>
  );
}

export function EditMemberModal({ isOpen, onClose, member, showToast }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Member');
  const [status, setStatus] = useState('active');
  const [birthDate, setBirthDate] = useState('');
  const [ministryAssignments, setMinistryAssignments] = useState('');
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (member) {
      setName(member.name || '');
      setEmail(member.email || '');
      setPhone(member.phone || '');
      setRole(member.role || 'Member');
      setStatus(member.status || 'active');
      setBirthDate(member.birthDate || '');
      setMinistryAssignments(member.ministryAssignments || '');
      setAvatar(member.avatar || DEFAULT_AVATAR);
    }
  }, [member]);

  if (!isOpen || !member) return null;

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const base64Image = await resizeAndConvertToBase64(file);
      setAvatar(base64Image);
    } catch (err) {
      console.error("Error processing image file:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);

    try {
      const docRef = doc(db, 'users', member.id);
      await updateDoc(docRef, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
        status,
        birthDate: birthDate || 'None',
        ministryAssignments: ministryAssignments.trim() || 'None',
        avatar: avatar
      });
      if (showToast) {
        showToast('Member profile updated successfully!');
      }
      onClose();
    } catch (err) {
      console.error("Error updating member details:", err);
      if (showToast) {
        showToast('Failed to update member.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-sheet-header">
          <span className="modal-sheet-title">Edit Member Profile</span>
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
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input 
              type="tel" 
              className="form-input" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Role</label>
              <ModernDropdown
                value={role}
                onChange={(val) => setRole(val)}
                options={[
                  { value: 'Member', label: 'Member' },
                  { value: 'Staff', label: 'Staff' },
                  { value: 'Elder', label: 'Elder' },
                  { value: 'Worship Team', label: 'Worship Team' },
                  { value: 'Youth Leader', label: 'Youth Leader' },
                  { value: "Children's Ministry", label: "Children's Ministry" }
                ]}
              />
            </div>

            <div className="form-group">
              <label>Status</label>
              <ModernDropdown
                value={status}
                onChange={(val) => setStatus(val)}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'new', label: 'New' },
                  { value: 'fellowship', label: 'Fellowship' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'deceased', label: 'Deceased' },
                  { value: 'transferred', label: 'Transferred' }
                ]}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Birth Date</label>
            <ModernDatePicker 
              value={birthDate} 
              onChange={(e) => setBirthDate(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label>Ministry Assignments</label>
            <input 
              type="text" 
              className="form-input" 
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={onClose}
              style={{ padding: '14px', borderRadius: 'var(--radius-md)', fontWeight: 'bold' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isSaving || !name.trim()}
              style={{ padding: '14px', borderRadius: 'var(--radius-md)' }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const Members = ({ members, loading, onSelectMember }) => {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filters = ['All', 'Active', 'New', 'Staff', 'Fellowship', 'Inactive', 'Deceased', 'Transferred'];

  const filteredMembers = members.filter(m => {
    const nameMatch = m.name?.toLowerCase().includes(search.toLowerCase());
    const roleMatch = m.role?.toLowerCase().includes(search.toLowerCase());
    const birthMatch = m.birthDate?.includes(search);
    const ministryMatch = m.ministryAssignments?.toLowerCase().includes(search.toLowerCase());
    const matchesSearch = nameMatch || roleMatch || birthMatch || ministryMatch;

    if (filter === 'All') return matchesSearch;
    if (filter === 'New') return matchesSearch && m.status === 'new';
    if (filter === 'Staff') return matchesSearch && m.role?.toLowerCase() === 'staff';
    if (filter === 'Active') return matchesSearch && m.status === 'active';
    if (filter === 'Fellowship') return matchesSearch && m.status === 'fellowship';
    if (filter === 'Inactive') return matchesSearch && m.status === 'inactive';
    if (filter === 'Deceased') return matchesSearch && m.status === 'deceased';
    if (filter === 'Transferred') return matchesSearch && m.status === 'transferred';
    return matchesSearch;
  });

  return (
    <section className="screen active">
      <header className="top-bar glass">
        <h1>Directory</h1>
        <button className="icon-button"><Filter size={20} /></button>
      </header>
      
      <div className="scroll-content" style={{ paddingTop: 0 }}>
        
        {/* Unified Sticky Header */}
        <div style={{
          position: 'sticky',
          top: '-572px', /* -72px (search bar height 48px + paddingBottom 24px) + -500px (overscroll) */
          marginTop: '-500px',
          paddingTop: '500px',
          overflowAnchor: 'none',
          zIndex: 20,
          background: 'var(--header-glass)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          margin: '-500px calc(var(--spacing-lg) * -1) 16px calc(var(--spacing-lg) * -1)',
          paddingLeft: 'var(--spacing-lg)',
          paddingRight: 'var(--spacing-lg)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          {/* Search Bar Wrapper */}
          <div style={{ 
            paddingTop: '16px',
            paddingBottom: '24px',
          }}>
            <div className="search-bar" style={{ margin: 0, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)' }}>
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Search members, birthday, ministries..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          {/* Filters Wrapper */}
          <div style={{ paddingBottom: '12px' }}>
            <div className="filter-pills" style={{ overflow: 'auto', flexWrap: 'nowrap', margin: 0, paddingBottom: 0, gap: '32px' }}>
              {filters.map(f => (
                <button 
                  key={f} 
                  className={`pill ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
            <p>Loading members...</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
            <p>No members found matching "{search}".</p>
          </div>
        ) : (
          <div className="members-list">
            {filteredMembers.map(member => (
              <div 
                className="card member-card" 
                key={member.id} 
                onClick={() => onSelectMember && onSelectMember(member.id)}
                style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
              >
                <img src={member.avatar || DEFAULT_AVATAR} alt={member.name} className="member-avatar" />
                <div className="member-info">
                  <h4>{member.name}</h4>
                  <p>{member.role}</p>
                </div>
                <span className={`member-status status-${member.status}`}>
                  {member.status?.charAt(0).toUpperCase() + member.status?.slice(1)}
                </span>
              </div>
            ))}
          </div>
        )}
        
        <div className="bottom-spacer" style={{height: 100}}></div>
      </div>
    </section>
  );
};

export default Members;
