import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, CheckCircle2, X, Users, ShieldAlert, CalendarDays, ChevronRight, UserPlus, Trash2, Clock } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const AttendanceTab = ({ members, todayCheckins, showStaffFeatures, setDemoStaffMode }) => {
  const { userProfile } = useAuth();
  const CHURCH_ID = userProfile?.churchId || 'YmEc6C69Xz4DKRQaQZBV';

  // Filtered checkins state for history list
  const [filterDate, setFilterDate] = useState(getTodayStr());
  const [filteredScannerCheckins, setFilteredScannerCheckins] = useState([]);

  // Search state for already checked-in members
  const [searchCheckedInQuery, setSearchCheckedInQuery] = useState('');

  // Calendar State for Date Picker
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
  
  const formatLocal = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const openCalendar = () => {
    if (filterDate) {
      const [y, m, d] = filterDate.split('-');
      setCalendarViewDate(new Date(y, m - 1, d));
    } else {
      setCalendarViewDate(new Date());
    }
    setIsCalendarOpen(true);
  };
  const closeCalendar = () => setIsCalendarOpen(false);

  // Manual Check-in Modal States
  const [isManualCheckinOpen, setIsManualCheckinOpen] = useState(false);
  const [manualCheckinQuery, setManualCheckinQuery] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanMessage, setScanMessage] = useState('');

  // Member Details / Delete Modal States
  const [selectedCheckinMember, setSelectedCheckinMember] = useState(null);

  // Real-time scanner checked-in list listener
  useEffect(() => {
    const q = query(
      collection(db, 'attendance'),
      where('churchId', '==', CHURCH_ID),
      where('date', '==', filterDate),
      where('type', '==', 'member')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by check-in time (descending)
      data.sort((a, b) => {
        const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
        const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
        return timeB - timeA;
      });
      setFilteredScannerCheckins(data);
    }, (error) => {
      console.error("Error fetching filtered scanner check-ins:", error);
    });

    return () => unsubscribe();
  }, [filterDate]);

  // Handle manual checkin
  const handleManualCheckin = async (memberToScan) => {
    if (!memberToScan) return;
    const member = memberToScan;

    setScanLoading(true);
    setScanMessage('');

    setTimeout(async () => {
      try {
        const alreadyChecked = todayCheckins.some(
          c => c.userId === member.id && c.type === 'member'
        );

        if (alreadyChecked) {
          setScanMessage(`⚠️ ${member.name} is already checked in for today.`);
          setScanLoading(false);
          return;
        }

        await addDoc(collection(db, 'attendance'), {
          userId: member.id,
          name: member.name,
          role: member.role,
          status: member.status,
          date: getTodayStr(),
          timestamp: serverTimestamp(),
          type: 'member',
          churchId: CHURCH_ID
        });

        setScanMessage(`🎉 Checked in ${member.name} successfully!`);
      } catch (err) {
        console.error("Error simulating checkin scan:", err);
      } finally {
        setScanLoading(false);
        setManualCheckinQuery('');
        // Close modal after short delay on success
        setTimeout(() => {
          setIsManualCheckinOpen(false);
          setScanMessage('');
        }, 1500);
      }
    }, 500);
  };

  const handleDeleteCheckin = async (id) => {
    try {
      await deleteDoc(doc(db, 'attendance', id));
      setSelectedCheckinMember(null); // Close modal
    } catch (error) {
      console.error("Error deleting check-in:", error);
    }
  };

  // Format checkin list time label
  const formatCheckinTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Filter members not checked in yet to show in the manual checkin list
  const uncheckedMembers = members.filter(
    m => !todayCheckins.some(c => c.userId === m.id && c.type === 'member')
  );

  const matchingUncheckedMembers = uncheckedMembers.filter(m => 
    m.name.toLowerCase().includes(manualCheckinQuery.toLowerCase())
  );

  // Search filtered checked in members list
  const displayedCheckins = filteredScannerCheckins.filter(c => 
    c.name.toLowerCase().includes(searchCheckedInQuery.toLowerCase())
  );

  return (
    <>
      {showStaffFeatures ? (
        <div style={{ position: 'relative', zIndex: 10, marginBottom: '24px' }}>
          {/* Main Search Bar - Searching Checked-in members */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={20} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', pointerEvents: 'none', zIndex: 2 }} />
            <input 
              type="text" 
              placeholder="Search checked-in..."
              value={searchCheckedInQuery}
              onChange={(e) => setSearchCheckedInQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 16px 14px 48px',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                fontSize: '15px',
                fontWeight: '600',
                outline: 'none',
                boxShadow: 'var(--shadow-sm)'
              }}
            />
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: '32px 16px', textAlign: 'center', border: '1px dashed var(--primary)', marginBottom: '16px' }}>
          <ShieldAlert size={48} style={{ color: 'var(--primary)', marginBottom: '16px', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>Staff Access Restricted</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
            The Attendance system is a staff-facing utility. Please enable demo mode below to test.
          </p>
          <button 
            onClick={() => setDemoStaffMode(true)}
            className="btn-primary"
            style={{ background: 'var(--primary-gradient)', width: '100%', padding: '12px' }}
          >
            Enable Demo Staff Mode
          </button>
        </div>
      )}

      {/* History List Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '0 4px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 2px 0' }}>Checked-in</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, fontWeight: '500' }}>{displayedCheckins.length} present</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={openCalendar}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 12px', borderRadius: '12px',
              background: 'var(--surface)', border: 'none',
              color: 'var(--text-primary)', fontSize: '13px', fontWeight: '700',
              boxShadow: 'var(--shadow-sm)', cursor: 'pointer'
            }}
          >
            <CalendarDays size={16} color="var(--primary)" />
            {filterDate ? new Date(filterDate.split('-')[0], filterDate.split('-')[1]-1, filterDate.split('-')[2]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Today'}
          </button>
          
          <button 
            onClick={() => setIsManualCheckinOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '8px', borderRadius: '12px',
              background: 'var(--surface)', border: 'none',
              color: 'var(--primary)',
              boxShadow: 'var(--shadow-sm)', cursor: 'pointer'
            }}
          >
            <UserPlus size={16} />
          </button>
        </div>
      </div>

      {/* History List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {displayedCheckins.length > 0 ? (
          displayedCheckins.map(c => {
            const memberInfo = members.find(m => m.id === c.userId) || {};
            return (
              <div 
                key={c.id} 
                onClick={() => setSelectedCheckinMember({ ...c, memberInfo })}
                className="card" 
                style={{ 
                  margin: 0, padding: '16px', display: 'flex', alignItems: 'center', gap: '16px',
                  cursor: 'pointer', transition: 'transform 0.2s ease', WebkitTapHighlightColor: 'transparent'
                }} 
              >
                <img 
                  src={memberInfo.avatar || 'https://i.pravatar.cc/150'} 
                  alt={c.name} 
                  style={{ width: '48px', height: '48px', borderRadius: '14px', objectFit: 'cover', boxShadow: '0 4px 10px rgba(0,0,0,0.08)' }} 
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', color: c.status === 'new' ? 'var(--primary)' : 'var(--tertiary)', background: c.status === 'new' ? '#FFE8F0' : '#E8F0FF', padding: '2px 8px', borderRadius: '6px', fontWeight: '700', textTransform: 'uppercase' }}>
                      {c.role || 'Member'}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700', background: 'var(--bg-gradient)', padding: '6px 10px', borderRadius: '10px' }}>
                  {formatCheckinTime(c.timestamp)}
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--surface)', borderRadius: '24px', border: '1px dashed var(--border)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: '#F8F9FB', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <Users size={32} color="var(--text-secondary)" opacity={0.5} />
            </div>
            <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>No check-ins found</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, maxWidth: '200px' }}>When members scan in or are marked present, they will appear here.</p>
          </div>
        )}
      </div>

      {/* Calendar Modal */}
      {isCalendarOpen && createPortal(
        <div className="modal-overlay" onClick={closeCalendar} style={{ zIndex: 4000 }}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', paddingBottom: '32px' }}>
            <div style={{ width: '40px', height: '5px', background: 'var(--border)', borderRadius: '10px', margin: '0 auto 20px' }} />
            
            <div className="modal-sheet-header" style={{ marginBottom: '24px' }}>
              <h3 className="modal-sheet-title">Select Date</h3>
              <button className="close-btn" onClick={closeCalendar}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <button onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1))} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--surface)', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <ChevronRight size={20} style={{ transform: 'rotate(180deg)', color: 'var(--text-primary)' }} />
              </button>
              <h4 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                {monthNames[calendarViewDate.getMonth()]} {calendarViewDate.getFullYear()}
              </h4>
              <button onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1))} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--surface)', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <ChevronRight size={20} color="var(--text-primary)" />
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '16px' }}>
              {dayNames.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: '13px', fontWeight: '800', color: 'var(--text-secondary)' }}>{d}</div>
              ))}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
              {Array.from({ length: getFirstDayOfMonth(calendarViewDate.getFullYear(), calendarViewDate.getMonth()) }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: getDaysInMonth(calendarViewDate.getFullYear(), calendarViewDate.getMonth()) }).map((_, i) => {
                const d = i + 1;
                const dateStr = formatLocal(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), d));
                const isSelected = filterDate === dateStr;
                const isToday = dateStr === formatLocal(new Date());
                
                return (
                  <button 
                    key={d} 
                    onClick={() => { setFilterDate(dateStr); closeCalendar(); }}
                    style={{
                      aspectRatio: '1', borderRadius: '50%',
                      background: isSelected ? 'var(--primary)' : isToday ? 'var(--bg-gradient)' : 'transparent',
                      border: isToday && !isSelected ? '1.5px solid var(--primary)' : 'none',
                      color: isSelected ? '#fff' : isToday ? 'var(--primary)' : 'var(--text-primary)',
                      fontWeight: isSelected || isToday ? '800' : '600',
                      fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', transition: 'all 0.2s ease',
                      boxShadow: isSelected ? 'var(--shadow-md)' : 'none'
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.querySelector('.app-container') || document.body
      )}

      {/* Manual Check-in Modal */}
      {isManualCheckinOpen && createPortal(
        <div className="modal-overlay" onClick={() => setIsManualCheckinOpen(false)} style={{ zIndex: 4000 }}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', paddingBottom: '32px' }}>
            <div style={{ width: '40px', height: '5px', background: 'var(--border)', borderRadius: '10px', margin: '0 auto 20px', flexShrink: 0 }} />
            
            <div className="modal-sheet-header" style={{ marginBottom: '16px', flexShrink: 0 }}>
              <h3 className="modal-sheet-title">Manual Check-in</h3>
              <button className="close-btn" onClick={() => setIsManualCheckinOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <Search size={20} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 2 }} />
              <input 
                type="text" 
                placeholder="Search member to check in..."
                value={manualCheckinQuery}
                onChange={(e) => setManualCheckinQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 48px',
                  borderRadius: '16px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                  fontSize: '15px',
                  fontWeight: '600',
                  outline: 'none',
                  boxShadow: 'var(--shadow-sm)'
                }}
              />
              {scanLoading && (
                <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', border: '2px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              )}
            </div>

            {/* Notification Toast */}
            {scanMessage && (
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '10px', 
                background: scanMessage.startsWith('⚠️') ? '#FFF9E6' : '#DEF7EC', 
                padding: '12px 16px', borderRadius: '16px', 
                border: scanMessage.startsWith('⚠️') ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(49, 196, 141, 0.3)', 
                color: scanMessage.startsWith('⚠️') ? '#92400E' : '#03543F', 
                fontSize: '13px', fontWeight: '700',
                boxShadow: 'var(--shadow-sm)', flexShrink: 0
              }}>
                <CheckCircle2 size={18} style={{ color: scanMessage.startsWith('⚠️') ? 'var(--secondary)' : 'var(--success)', flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{scanMessage}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {matchingUncheckedMembers.length > 0 ? (
                matchingUncheckedMembers.map(m => (
                  <div 
                    key={m.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 0', borderBottom: '1px solid var(--border)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img src={m.avatar || 'https://i.pravatar.cc/150'} alt="" style={{ width: '40px', height: '40px', borderRadius: '12px', objectFit: 'cover' }} />
                      <div>
                        <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 2px 0' }}>{m.name}</h4>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>{m.role}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleManualCheckin(m)}
                      disabled={scanLoading}
                      style={{
                        padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '700',
                        display: 'flex', alignItems: 'center', gap: '4px',
                        background: '#FFF0F5', color: 'var(--primary)',
                        border: 'none', cursor: 'pointer',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#FFE4EF'}
                      onMouseLeave={(e) => e.target.style.background = '#FFF0F5'}
                    >
                      <UserPlus size={14} /> Add
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <Users size={32} style={{ opacity: 0.3, marginBottom: '12px', margin: '0 auto' }} />
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>No members found</p>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.querySelector('.app-container') || document.body
      )}

      {/* Member Check-in Details / Delete Modal */}
      {selectedCheckinMember && createPortal(
        <div className="modal-overlay" onClick={() => setSelectedCheckinMember(null)} style={{ zIndex: 4000 }}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ paddingBottom: '32px' }}>
            <div style={{ width: '40px', height: '5px', background: 'var(--border)', borderRadius: '10px', margin: '0 auto 24px' }} />
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '32px' }}>
              <img 
                src={selectedCheckinMember.memberInfo?.avatar || 'https://i.pravatar.cc/150'} 
                alt={selectedCheckinMember.name} 
                style={{ width: '80px', height: '80px', borderRadius: '24px', objectFit: 'cover', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginBottom: '16px' }} 
              />
              <h2 style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-primary)', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
                {selectedCheckinMember.name}
              </h2>
              <span style={{ fontSize: '12px', color: selectedCheckinMember.status === 'new' ? 'var(--primary)' : 'var(--tertiary)', background: selectedCheckinMember.status === 'new' ? '#FFE8F0' : '#E8F0FF', padding: '4px 12px', borderRadius: '8px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '16px' }}>
                {selectedCheckinMember.role || 'Member'}
              </span>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface)', padding: '12px 20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <Clock size={16} color="var(--text-secondary)" />
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Checked in at</span>
                <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>{formatCheckinTime(selectedCheckinMember.timestamp)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                onClick={() => setSelectedCheckinMember(null)}
                style={{
                  width: '100%', padding: '16px', borderRadius: '16px',
                  background: 'var(--surface)', color: 'var(--text-primary)',
                  border: '1px solid var(--border)', fontSize: '15px', fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
              
              <button 
                onClick={() => handleDeleteCheckin(selectedCheckinMember.id)}
                style={{
                  width: '100%', padding: '16px', borderRadius: '16px',
                  background: '#FEF2F2', color: '#EF4444',
                  border: '1px solid #FEE2E2', fontSize: '15px', fontWeight: '800',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                <Trash2 size={18} />
                Undo Check-in
              </button>
            </div>
          </div>
        </div>,
        document.querySelector('.app-container') || document.body
      )}
    </>
  );
};

export default AttendanceTab;
