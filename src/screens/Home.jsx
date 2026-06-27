import React, { useState, useEffect } from 'react';
import { Search, Crown, Users, Calendar, HeartHandshake, HandHeart, Grid, BarChart3, BookOpen, ChevronRight, Quote, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, runTransaction } from 'firebase/firestore';
import { fetchVerseOfTheDay, getUserPreferences, saveUserPreferences } from '../utils/bibleApi';

const Home = ({ toggleTheme, setActiveTab, members }) => {
  const { userProfile, currentUser } = useAuth();
  const isStaff = userProfile?.role?.toLowerCase() === 'staff';
  const [latestPrayer, setLatestPrayer] = useState(null);
  const [votd, setVotd] = useState(null);
  const [upcomingDuty, setUpcomingDuty] = useState(null);
  const [upcomingDutyDate, setUpcomingDutyDate] = useState(null);

  // Get the first name or use a default if it's missing
  const displayName = userProfile?.name 
    ? userProfile.name.split(' ')[0] 
    : (currentUser?.displayName ? currentUser.displayName.split(' ')[0] : 'User');

  useEffect(() => {
    const q = query(collection(db, 'prayers'), orderBy('createdAt', 'desc'), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        setLatestPrayer({
          id: docSnap.id,
          ...docSnap.data()
        });
      } else {
        setLatestPrayer(null);
      }
    }, (error) => {
      console.error("Error fetching latest prayer request: ", error);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadVotd = async () => {
      const prefs = getUserPreferences();
      const data = await fetchVerseOfTheDay(prefs.activeTranslation);
      if (data) setVotd(data);
    };
    loadVotd();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    
    // Get next Sunday
    const getNextSunday = () => {
      const d = new Date();
      d.setDate(d.getDate() + (7 - d.getDay()) % 7);
      if (d.getDay() !== 0) d.setDate(d.getDate() + (7 - d.getDay()));
      return d.toISOString().split('T')[0];
    };
    
    const nextSundayStr = getNextSunday();
    setUpcomingDutyDate(nextSundayStr);
    const docRef = doc(db, 'schedules', nextSundayStr);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        let duties = [];
        if (data.openingPrayer === currentUser.uid) duties.push('Opening Prayer');
        if (data.tithesOfferingPrayer === currentUser.uid) duties.push('Tithes & Offering Prayer');
        if (data.scriptureReading === currentUser.uid) duties.push('Scripture Reading');
        if (data.praiseWorship === currentUser.uid) duties.push('Praise & Worship');
        if (data.ushers && data.ushers.includes(currentUser.uid)) duties.push('Usher');
        
        setUpcomingDuty(duties.length > 0 ? duties.join(', ') : null);
      } else {
        setUpcomingDuty(null);
      }
    });
    
    return () => unsubscribe();
  }, [currentUser]);

  const handleVotdClick = () => {
    if (!votd || !votd.passageId) return;
    const prefs = getUserPreferences();
    const parts = votd.passageId.split('.');
    if (parts.length >= 2) {
      saveUserPreferences({
        ...prefs,
        activeBook: parts[0],
        activeChapter: parseInt(parts[1], 10)
      });
      setActiveTab('bible');
    }
  };

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
    const docRef = doc(db, 'prayers', id);
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
          newLikedBy = currentLikedBy.filter(uid => uid !== userId);
          newLikes = Math.max(0, currentLikes - 1);
        } else {
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

  return (
    <section className="screen active">
      <header className="top-bar">
        <div>
          <p className="greeting" onClick={toggleTheme}>Hello,</p>
          <h1 className="subtitle">{displayName}!</h1>
        </div>
        <img src="https://i.pravatar.cc/150?img=11" alt="Profile" className="top-bar-profile" />
      </header>
      
      <div className="scroll-content">
        
        {/* Search Bar */}
        <div className="search-bar">
          <Search />
          <input type="text" placeholder="Search" />
        </div>

        {/* Ministerial Duty Notification */}
        {upcomingDuty && upcomingDutyDate && new Date() <= new Date(`${upcomingDutyDate}T23:59:59`) && (
          <div style={{ marginBottom: '16px', animation: 'slideUp 0.4s ease-out' }}>
            <div style={{ 
              background: 'var(--surface)', 
              border: '1px solid rgba(var(--primary-rgb), 0.2)',
              borderRadius: '16px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              boxShadow: 'var(--shadow-sm)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--primary-gradient)' }} />
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Crown size={16} color="var(--primary)" />
                  <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>Ministerial Update</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', background: 'var(--bg-gradient)', padding: '4px 8px', borderRadius: '6px' }}>
                  {new Date(`${upcomingDutyDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0, paddingLeft: '24px' }}>
                Thank you for your dedicated ministry, {displayName}. You are scheduled for <strong style={{ color: 'var(--primary)' }}>{upcomingDuty}</strong> this Sunday.
              </p>
            </div>
          </div>
        )}

        {/* Hero Card */}
        <div className="card hero-card bento-hero" style={{ cursor: isStaff ? 'pointer' : 'default' }} onClick={() => isStaff && setActiveTab('attendance')}>
          <span className="badge live-badge">LIVE SERVICE <Crown size={12} style={{marginLeft: 4}} /></span>
          <h2>Sunday 9:00 AM<br/>Worship & Sermon</h2>
          <p>{isStaff ? 'Tap to view live attendance and check-ins right now!' : 'Join us for worship and sermon.'}</p>
        </div>

        {/* Verse of the Day */}
        {votd && (
          <div 
            className="card" 
            style={{ 
              marginBottom: '16px', 
              padding: '20px', 
              background: 'var(--bg-gradient)', 
              border: '1px solid var(--border)',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden'
            }}
            onClick={handleVotdClick}
          >
            <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.05, transform: 'rotate(15deg)' }}>
              <Quote size={100} color="var(--primary)" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <BookOpen size={16} color="var(--primary)" />
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--primary)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Verse of the Day</span>
            </div>
            <p style={{ fontSize: '16px', fontWeight: '500', lineHeight: '1.6', color: 'var(--text-primary)', marginBottom: '16px', fontStyle: 'italic', position: 'relative', zIndex: 1 }}>
              "{votd.text}"
            </p>
            <p style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
              — {votd.reference}
            </p>
          </div>
        )}


        
        {/* Icon Grid Row */}
        <div className="bento-grid-4">
           <div className="icon-grid-item" onClick={() => setActiveTab('members')} style={{ cursor: 'pointer' }}>
             <div className="icon-square" style={{ color: '#4D8BFF' }}>
               <Users />
             </div>
             <span className="icon-grid-label">Members</span>
           </div>
           <div className="icon-grid-item">
             <div className="icon-square" style={{ color: '#8B6FE8' }}>
               <Calendar />
             </div>
             <span className="icon-grid-label">Events</span>
           </div>
           <div className="icon-grid-item">
             <div className="icon-square" style={{ color: '#4ADE80' }}>
               <HandHeart />
             </div>
             <span className="icon-grid-label">Giving</span>
           </div>
           <div className="icon-grid-item">
             <div className="icon-square" style={{ color: '#FF6596' }}>
               <Grid />
             </div>
             <span className="icon-grid-label">More</span>
           </div>
        </div>
        
        {/* Saved Article equivalent (Stats with Open buttons) */}
        <div className="section-header">
          <h3>Quick Stats</h3>
          <a href="#" className="see-all">See all <ChevronRight size={14} /></a>
        </div>
        
        <div className="bento-grid">
          <div className="card stat-card">
            <div className="stat-top">
              <div className="stat-icon pink-light">
                <BarChart3 size={20} />
              </div>
              <div className="stat-info">
                <h3>247</h3>
                <p>Attendance</p>
              </div>
            </div>
            <button className="stat-btn pink">Open</button>
          </div>
          
          <div className="card stat-card">
            <div className="stat-top">
              <div className="stat-icon blue-light">
                <BookOpen size={20} />
              </div>
              <div className="stat-info blue">
                <h3>18</h3>
                <p>New Visitors</p>
              </div>
            </div>
            <button className="stat-btn blue">Open</button>
          </div>
        </div>
        
        <div className="section-header" style={{ marginTop: '24px' }}>
          <h3>Prayer Wall</h3>
          <a href="#" className="see-all" onClick={(e) => { e.preventDefault(); setActiveTab('prayerRequests'); }}>See all <ChevronRight size={14} /></a>
        </div>

        {latestPrayer ? (
          (() => {
            const isLiked = latestPrayer.likedBy && latestPrayer.likedBy.includes(currentUser?.uid);
            return (
              <div className="card" style={{ marginBottom: '16px', padding: '16px', borderLeft: latestPrayer.answered ? '4px solid var(--success)' : '4px solid var(--primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{latestPrayer.name}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{formatTimeAgo(latestPrayer.createdAt)}</span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  {latestPrayer.request}
                </p>
                <button 
                  onClick={() => handlePray(latestPrayer.id)}
                  style={{ 
                    background: isLiked ? 'var(--primary)' : 'transparent', 
                    border: isLiked ? 'none' : '1px solid #FFE8F0', 
                    color: isLiked ? '#fff' : 'var(--primary)',
                    padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                    display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
                    transition: 'background 0.2s, color 0.2s'
                  }}
                >
                  <HeartHandshake size={12} /> {isLiked ? 'Prayed' : 'Pray'} ({latestPrayer.likes || 0})
                </button>
              </div>
            );
          })()
        ) : (
          <div className="card" style={{ marginBottom: '16px', padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p style={{ fontSize: '13px' }}>No prayer requests shared yet. Be the first!</p>
          </div>
        )}

        <div className="bottom-spacer" style={{height: 100}}></div>
      </div>
    </section>
  );
};

export default Home;
