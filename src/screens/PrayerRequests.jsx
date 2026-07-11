import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Heart, Search, Filter, Plus, CheckCircle, X } from 'lucide-react';
import { usePrayers } from '../hooks/usePrayers';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  runTransaction, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const PrayerRequests = () => {
  const { currentUser, userProfile } = useAuth();
  const { prayers: requests, loading } = usePrayers();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Recent');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Format Firestore server timestamp to relative time string
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const handlePray = async (id) => {
    if (!currentUser) return;
    const CHURCH_ID = userProfile?.churchId || 'YmEc6C69Xz4DKRQaQZBV';
    const docRef = doc(db, 'churches', CHURCH_ID, 'prayer_requests', id);
    const userId = currentUser.uid;

    try {
      await runTransaction(db, async (transaction) => {
        const sfDoc = await transaction.get(docRef);
        if (!sfDoc.exists()) {
          throw new Error("Document does not exist!");
        }

        const currentLikedBy = sfDoc.data().likedBy || [];
        const currentLikes = sfDoc.data().likes || 0;
        let newLikedBy;
        let newLikes;

        if (currentLikedBy.includes(userId)) {
          // Unlike (un-pray)
          newLikedBy = currentLikedBy.filter(uid => uid !== userId);
          newLikes = Math.max(0, currentLikes - 1);
        } else {
          // Like (pray)
          newLikedBy = [...currentLikedBy, userId];
          newLikes = currentLikes + 1;
        }

        transaction.update(docRef, { 
          likedBy: newLikedBy, 
          likes: newLikes 
        });
      });
    } catch (e) {
      console.error("Transaction failed: ", e);
    }
  };

  const handleToggleAnswered = async (id, currentVal) => {
    const docRef = doc(db, 'prayers', id);
    try {
      await updateDoc(docRef, {
        answered: !currentVal
      });
    } catch (e) {
      console.error("Error updating answered status: ", e);
    }
  };



  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.request?.toLowerCase().includes(search.toLowerCase()) ||
                          req.name?.toLowerCase().includes(search.toLowerCase());
                          
    if (filter === 'My Requests') {
      return matchesSearch && req.userId === currentUser?.uid;
    }
    if (filter === 'Answered') {
      return matchesSearch && req.answered === true;
    }
    return matchesSearch;
  });

  return (
    <section className="screen active">
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
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          margin: '-500px calc(var(--spacing-lg) * -1) 16px calc(var(--spacing-lg) * -1)',
          paddingLeft: 'var(--spacing-lg)',
          paddingRight: 'var(--spacing-lg)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.4)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
        }}>
          {/* Top Icons Row */}
          <div style={{ 
            paddingTop: 'max(env(safe-area-inset-top), 24px)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <button 
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              style={{ 
                width: '40px', height: '40px', borderRadius: '50%', 
                background: 'var(--glass-button)', 
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid var(--glass-border)', cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              {isSearchOpen ? <X size={20} color="var(--text-primary)" /> : <Search size={20} color="var(--text-primary)" />}
            </button>
          </div>

          {/* Large Left-Aligned Title or Search Input */}
          {isSearchOpen ? (
            <div className="search-bar" style={{ margin: '0 0 20px 0', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)' }}>
              <Search size={18} />
              <input 
                autoFocus
                type="text" 
                placeholder="Search requests..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          ) : (
            <h1 style={{ 
              fontSize: '34px', 
              fontWeight: '900', 
              margin: '0 0 20px 0',
              color: 'var(--text-primary)',
              letterSpacing: '-0.5px'
            }}>
              Prayers
            </h1>
          )}

          {/* Filters Wrapper */}
          <div style={{ paddingBottom: '12px' }}>
            <div className="filter-pills" style={{ overflow: 'auto', flexWrap: 'nowrap', margin: 0, paddingBottom: 0, gap: '32px' }}>
          <button 
            className={`pill ${filter === 'Recent' ? 'active' : ''}`}
            onClick={() => setFilter('Recent')}
          >
            Recent
          </button>
          <button 
            className={`pill ${filter === 'My Requests' ? 'active' : ''}`}
            onClick={() => setFilter('My Requests')}
          >
            My Requests
          </button>
          <button 
            className={`pill ${filter === 'Answered' ? 'active' : ''}`}
            onClick={() => setFilter('Answered')}
          >
            Answered
          </button>
          </div>
        </div>
      </div>

        <div className="requests-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowAnchor: 'none' }}>
          {filteredRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
              <p>No prayer requests found.</p>
            </div>
          ) : (
            filteredRequests.map(req => {
              const isLiked = req.likedBy && req.likedBy.includes(currentUser?.uid);
              return (
                <div key={req.id} className="card" style={{ marginBottom: 0, borderLeft: req.answered ? '4px solid var(--success)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h4 style={{ color: 'var(--text-primary)', margin: 0 }}>{req.name}</h4>
                      {req.answered && (
                        <span style={{ 
                          fontSize: '10px', 
                          backgroundColor: 'rgba(74, 222, 128, 0.15)', 
                          color: 'var(--success)', 
                          padding: '2px 6px', 
                          borderRadius: '8px', 
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}>
                          <CheckCircle size={10} /> Answered
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {formatTimeAgo(req.createdAt)}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px', lineHeight: '1.5' }}>
                    {req.request}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button 
                      type="button"
                      onClick={(e) => { e.preventDefault(); handlePray(req.id); }}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        background: isLiked ? 'var(--primary)' : '#FFE8F0', 
                        color: isLiked ? '#fff' : 'var(--primary)', 
                        border: 'none', 
                        padding: '6px 12px', 
                        borderRadius: '12px',
                        fontSize: '12px', 
                        fontWeight: 'bold', 
                        cursor: 'pointer',
                        transition: 'background 0.2s, color 0.2s'
                      }}
                    >
                      <Heart size={14} fill={isLiked ? '#fff' : 'none'} /> 
                      {isLiked ? 'Prayed' : 'Pray'} ({req.likes || 0})
                    </button>

                    {req.userId === currentUser?.uid && (
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); handleToggleAnswered(req.id, req.answered); }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: req.answered ? 'var(--text-secondary)' : 'var(--success)',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {req.answered ? 'Mark Active' : 'Mark Answered'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="bottom-spacer" style={{height: 100}}></div>
      </div>


    </section>
  );
};

export default PrayerRequests;

