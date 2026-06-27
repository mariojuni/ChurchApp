import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Plus, UserPlus, CalendarPlus, Home as HomeIcon, Search, Activity, User, X, QrCode, HeartHandshake, Book, MessageCircleHeart, HandHeart } from 'lucide-react';
import Home from './screens/Home';
import Members, { EditMemberModal, MemberDetailModal } from './screens/Members';
import { seedMembers, seedServices } from './utils/seedData';
import Staff from './screens/Staff';
import Giving from './screens/Giving';
import More from './screens/More';
import PrayerRequests from './screens/PrayerRequests';
import Bible from './screens/Bible';
import QRScanner from './screens/QRScanner';
import ErrorBoundary from './components/ErrorBoundary';
// Firebase
import { db } from './firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';

// Utilities
import { DEFAULT_AVATAR, resizeAndConvertToBase64 } from './utils/image';

import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ProtectedRoute from './components/Auth/ProtectedRoute';

const PrayingHandsIcon = ({ size = 24, color = "currentColor", className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 256 256" 
    fill="none" 
    stroke={color} 
    strokeWidth="16" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M141.78,16h0A13.77,13.77,0,0,1,155,25.78L192,148l20.27,20.27-45,43-29.94-29.94A32,32,0,0,1,128,158.75v-129A13.78,13.78,0,0,1,141.78,16Z" />
    <path d="M167.31,211.31l18.35,18.35a8,8,0,0,0,11.31,0L229.66,197a8,8,0,0,0,0-11.31l-18.35-18.35" />
    <path d="M118.63,181.37,88.69,211.31l-44-44L64,148,101,25.78A13.77,13.77,0,0,1,114.22,16h0A13.78,13.78,0,0,1,128,29.78v129A32,32,0,0,1,118.63,181.37Z" />
    <path d="M44.69,167.31,26.34,185.66a8,8,0,0,0,0,11.31L59,229.66a8,8,0,0,0,11.31,0l18.35-18.35" />
  </svg>
);

function NewPrayerModal({ isOpen, onClose, showToast }) {
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

function NewMemberModal({ isOpen, onClose, showToast }) {
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

function MainApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transitionType, setTransitionType] = useState('fade');
  const [theme, setTheme] = useState('light');
  const [fabOpen, setFabOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [isNewMemberModalOpen, setIsNewMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [isNewPrayerModalOpen, setIsNewPrayerModalOpen] = useState(false);
  
  // Real-time members database states at App root level
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState(null);

  const selectedMember = members.find(m => m.id === selectedMemberId);

  const { logout, userProfile, currentUser } = useAuth();
  const isStaff = userProfile?.role?.toLowerCase() === 'staff';

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  // Real-time Firestore sync & seeding
  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        console.log("No users found. Seeding members into users collection...");
        for (const m of seedMembers) {
          try {
            await addDoc(collection(db, 'users'), {
              ...m,
              createdAt: serverTimestamp()
            });
          } catch (e) {
            console.error("Error seeding user:", e);
          }
        }
      } else {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMembers(docs);
        setMembersLoading(false);
      }
    }, (error) => {
      console.error("Error fetching users: ", error);
      setMembersLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time services database seeding
  useEffect(() => {
    const q = query(collection(db, 'services'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        console.log("No services found. Seeding services...");
        for (const s of seedServices) {
          try {
            await addDoc(collection(db, 'services'), {
              ...s,
              createdAt: serverTimestamp()
            });
          } catch (e) {
            console.error("Error seeding service:", e);
          }
        }
      }
    }, (error) => {
      console.error("Error fetching services: ", error);
    });

    return () => unsubscribe();
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setFabOpen(false);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const renderScreen = () => {
    switch(activeTab) {
      case 'dashboard': return <Home theme={theme} toggleTheme={toggleTheme} setActiveTab={(tab) => { setTransitionType('pan'); setActiveTab(tab); }} members={members} />;
      case 'members': return (
        <Members 
          members={members} 
          loading={membersLoading} 
          onSelectMember={(id) => setSelectedMemberId(id)}
        />
      );
      case 'attendance': 
        return isStaff ? <Staff isStaff={isStaff} members={members} setActiveTab={(tab) => { setTransitionType('pan'); setActiveTab(tab); }} /> : <Home theme={theme} toggleTheme={toggleTheme} setActiveTab={(tab) => { setTransitionType('pan'); setActiveTab(tab); }} members={members} />;
      case 'qr-scanner':
        return (
          <ErrorBoundary setActiveTab={setActiveTab}>
            <QRScanner setActiveTab={setActiveTab} members={members} showToast={showToast} />
          </ErrorBoundary>
        );
      case 'giving': return <Giving theme={theme} />;
      case 'more': return <More />;
      case 'prayerRequests': return <PrayerRequests />;
      case 'bible': return <Bible theme={theme} />;
      default: return <Home theme={theme} toggleTheme={toggleTheme} setActiveTab={(tab) => { setTransitionType('pan'); setActiveTab(tab); }} members={members} />;
    }
  };

  return (
    <div className="app-container">
      {toastMessage && (
        <div 
          id="toast-container" 
          style={{
            position: 'absolute',
            bottom: 'calc(120px + env(safe-area-inset-bottom))',
            left: '20px',
            right: '20px',
            display: 'flex',
            justifyContent: 'center',
            zIndex: 999999,
            pointerEvents: 'none',
            animation: 'fadeIn 0.3s ease forwards'
          }}
        >
          <div style={{
            background: toastType === 'error' ? '#EF4444' : toastType === 'warning' ? '#F59E0B' : '#10B981',
            color: '#FFFFFF',
            padding: '12px 24px',
            borderRadius: '100px',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {toastMessage}
          </div>
        </div>
      )}



      {/* Member Detail Modal */}
      <MemberDetailModal 
        isOpen={!!selectedMemberId} 
        onClose={() => setSelectedMemberId(null)} 
        member={selectedMember} 
        isStaff={isStaff} 
        onEdit={(member) => { setEditingMember(member); setIsEditModalOpen(true); }}
      />

      {/* New Member Form Modal */}
      <NewMemberModal 
        isOpen={isNewMemberModalOpen} 
        onClose={() => setIsNewMemberModalOpen(false)} 
        showToast={showToast} 
      />

      {/* Edit Member Form Modal */}
      <EditMemberModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        member={editingMember}
        showToast={showToast} 
      />

      {/* New Prayer Form Modal */}
      <NewPrayerModal 
        isOpen={isNewPrayerModalOpen} 
        onClose={() => setIsNewPrayerModalOpen(false)} 
        showToast={showToast} 
      />

      {/* Top Header/Action Bar can go here. Temporarily adding a logout button for testing */}
      {activeTab === 'dashboard' && (
        <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 100 }}>
          <button className="btn-secondary" onClick={handleLogout} style={{ padding: '4px 8px', fontSize: '12px' }}>
            Logout
          </button>
        </div>
      )}

      <main className={`screens ${activeTab === 'qr-scanner' ? 'fullscreen-mode' : ''} ${transitionType === 'pan' ? 'pan-mode' : ''}`} style={activeTab === 'qr-scanner' ? { padding: 0, margin: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' } : {}}>
        {renderScreen()}
      </main>

      {/* Bottom Navigation Area (hidden if qr-scanner is active) */}
      {activeTab !== 'qr-scanner' && (
        <div className="bottom-nav-area">
        <nav className="bottom-nav">
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setTransitionType('fade'); setActiveTab('dashboard'); }}
          >
            <HomeIcon />
          </button>
          <button 
            className={`nav-item ${activeTab === 'bible' ? 'active' : ''}`}
            onClick={() => { setTransitionType('fade'); setActiveTab('bible'); }}
          >
            <Book />
          </button>
          <button 
            className={`nav-item ${activeTab === 'prayerRequests' ? 'active' : ''}`}
            onClick={() => { setTransitionType('fade'); setActiveTab('prayerRequests'); }}
          >
            <HeartHandshake />
          </button>
          {isStaff && (
            <button 
              className={`nav-item ${activeTab === 'attendance' ? 'active' : ''}`}
              onClick={() => { setTransitionType('fade'); setActiveTab('attendance'); }}
            >
              <Activity />
            </button>
          )}
        </nav>

        <div className="fab-container">
          <button 
            className={`fab ${fabOpen ? 'active' : ''}`} 
            onClick={() => setFabOpen(!fabOpen)}
          >
            <Plus />
          </button>
          <div className={`fab-menu ${fabOpen ? 'open' : ''}`}>
            <button className="fab-menu-item" title="Check In" onClick={() => { setActiveTab('qr-scanner'); setFabOpen(false); }}>
              <QrCode />
            </button>
            {isStaff && (
              <>
                <button className="fab-menu-item" title="New Member" onClick={() => { setIsNewMemberModalOpen(true); setFabOpen(false); }}>
                  <UserPlus />
                </button>
                <button className="fab-menu-item" title="Add Event" onClick={() => { showToast('Scheduling event...'); }}>
                  <CalendarPlus />
                </button>
              </>
            )}
            <button className="fab-menu-item" title="Giving" onClick={() => { setActiveTab('giving'); setFabOpen(false); }}>
              <HandHeart />
            </button>
            <button className="fab-menu-item" title="Add Prayer" onClick={() => { setIsNewPrayerModalOpen(true); setFabOpen(false); }}>
              <PrayingHandsIcon />
            </button>
          </div>
        </div>
        </div>
      )}



      {/* QR Check-in Pass Modal */}
      {showQrModal && (() => {
        // Find the current user's member record by email
        const myMember = members.find(m => m.email && currentUser?.email && m.email.toLowerCase() === currentUser.email.toLowerCase());
        const qrId = myMember?.id || currentUser?.uid || 'unknown';
        const qrName = myMember?.name || userProfile?.name || currentUser?.displayName || 'Member';
        const qrRole = myMember?.role || userProfile?.role || 'Member';

        return (
          <div className="modal-overlay" onClick={() => setShowQrModal(false)} style={{ zIndex: 1000 }}>
            <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', textAlign: 'center', alignItems: 'center' }}>
              <div className="modal-sheet-header" style={{ marginBottom: '20px', width: '100%' }}>
                <span className="modal-sheet-title">My Check-in QR Pass</span>
                <button className="close-btn" onClick={() => setShowQrModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
                Show this QR code to the church staff at the welcome desk to check in.
              </p>

              <div style={{
                background: '#FFFFFF',
                padding: '16px',
                borderRadius: '20px',
                boxShadow: 'var(--shadow-md)',
                marginBottom: '20px',
                border: '1px solid rgba(0,0,0,0.05)',
                display: 'inline-block'
              }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrId}`}
                  alt="My Check-in QR Code"
                  style={{ width: '200px', height: '200px', display: 'block' }}
                />
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px', color: 'var(--text-primary)' }}>
                {qrName}
              </h3>
              <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '20px' }}>
                {qrRole}
              </p>

              <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                <button
                  className="btn-secondary"
                  onClick={async () => {
                    try {
                      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${qrId}`;
                      const response = await fetch(qrUrl);
                      const blob = await response.blob();
                      const blobUrl = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = blobUrl;
                      link.download = `qr-${qrId}.png`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(blobUrl);
                      showToast('QR Code saved!');
                    } catch (error) {
                      console.error('Error downloading QR:', error);
                      window.open(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${qrId}`, '_blank');
                    }
                  }}
                  style={{ flex: 1, padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <QrCode size={16} /> Save to Gallery
                </button>
                <button
                  className="btn-primary"
                  onClick={() => setShowQrModal(false)}
                  style={{ flex: 1, padding: '14px' }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route 
            path="/*" 
            element={
              <ProtectedRoute>
                <ErrorBoundary setActiveTab={() => window.location.reload()}>
                  <MainApp />
                </ErrorBoundary>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
