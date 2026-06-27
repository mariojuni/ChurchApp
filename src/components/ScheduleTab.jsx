import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, Sparkles, User, Trash2, ChevronRight, X, Search, CheckCircle2, Users, CalendarDays } from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { DEFAULT_AVATAR } from '../utils/image';

export default function ScheduleTab({ members, preloadedSchedule }) {
  const getNextSunday = () => {
    const d = new Date();
    d.setDate(d.getDate() + (7 - d.getDay()) % 7);
    if (d.getDay() !== 0) d.setDate(d.getDate() + (7 - d.getDay())); 
    return d.toISOString().split('T')[0];
  };

  const [date, setDate] = useState(getNextSunday());
  const hasLoadedPreloaded = React.useRef(false);
  const lastLoadedDate = React.useRef(null);
  
  // Custom Calendar State
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
    if (date) {
      const [y, m, d] = date.split('-');
      setCalendarViewDate(new Date(y, m - 1, d));
    } else {
      setCalendarViewDate(new Date());
    }
    setIsCalendarOpen(true);
  };
  const closeCalendar = () => setIsCalendarOpen(false);

  const [openingPrayer, setOpeningPrayer] = useState('');
  const [tithesOfferingPrayer, setTithesOfferingPrayer] = useState('');
  const [scriptureReading, setScriptureReading] = useState('');
  const [praiseWorship, setPraiseWorship] = useState('');
  const [ushers, setUshers] = useState([]);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Sheet State
  const [sheetConfig, setSheetConfig] = useState({ isOpen: false, roleKey: null, title: '', isMulti: false });
  const [searchQuery, setSearchQuery] = useState('');
  const [savingMemberId, setSavingMemberId] = useState(null);

  const setters = {
    openingPrayer: { val: openingPrayer, set: setOpeningPrayer },
    tithesOfferingPrayer: { val: tithesOfferingPrayer, set: setTithesOfferingPrayer },
    scriptureReading: { val: scriptureReading, set: setScriptureReading },
    praiseWorship: { val: praiseWorship, set: setPraiseWorship },
    ushers: { val: ushers, set: setUshers }
  };

  useEffect(() => {
    if (!date) return;
    if (lastLoadedDate.current === date) return; // Prevent duplicate fetches for the same date

    if (date === getNextSunday() && !hasLoadedPreloaded.current) {
      if (preloadedSchedule) {
        // Use preloaded data
        setOpeningPrayer(preloadedSchedule.openingPrayer || '');
        setTithesOfferingPrayer(preloadedSchedule.tithesOfferingPrayer || '');
        setScriptureReading(preloadedSchedule.scriptureReading || '');
        setPraiseWorship(preloadedSchedule.praiseWorship || '');
        setUshers(preloadedSchedule.ushers || []);
        hasLoadedPreloaded.current = true;
        lastLoadedDate.current = date;
      }
      // Never show a loading spinner for the initial default date
    } else {
      loadSchedule(date);
      lastLoadedDate.current = date;
    }
  }, [date, preloadedSchedule]);

  const loadSchedule = async (selectedDate) => {
    setIsLoading(true);
    setMessage('');
    try {
      const docRef = doc(db, 'schedules', selectedDate);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setOpeningPrayer(data.openingPrayer || '');
        setTithesOfferingPrayer(data.tithesOfferingPrayer || '');
        setScriptureReading(data.scriptureReading || '');
        setPraiseWorship(data.praiseWorship || '');
        setUshers(data.ushers || []);
      } else {
        setOpeningPrayer('');
        setTithesOfferingPrayer('');
        setScriptureReading('');
        setPraiseWorship('');
        setUshers([]);
      }
    } catch (err) {
      console.error("Error fetching schedule:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const autoSaveSchedule = async (updates) => {
    if (!date) return;
    setIsSaving(true);
    try {
      const scheduleRef = doc(db, 'schedules', date);
      const docSnap = await getDoc(scheduleRef);
      
      const scheduleData = {
        date,
        ...updates,
        updatedAt: serverTimestamp()
      };

      if (!docSnap.exists()) {
        scheduleData.createdAt = serverTimestamp();
      }

      await setDoc(scheduleRef, scheduleData, { merge: true });
      setMessage('✅ Saved');
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      console.error("Error auto-saving:", err);
      setMessage('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoFill = async () => {
    if (!date) return;
    setIsLoading(true);
    setMessage('Auto-filling...');
    try {
      const monthPrefix = date.substring(0, 7);
      const schedulesRef = collection(db, 'schedules');
      const startOfMonth = `${monthPrefix}-01`;
      const endOfMonth = `${monthPrefix}-31`;
      
      const q = query(schedulesRef, where('date', '>=', startOfMonth), where('date', '<=', endOfMonth));
      const querySnapshot = await getDocs(q);
      const participatedIds = new Set();
      
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.date === date) return; 
        
        if (data.openingPrayer) participatedIds.add(data.openingPrayer);
        if (data.tithesOfferingPrayer) participatedIds.add(data.tithesOfferingPrayer);
        if (data.scriptureReading) participatedIds.add(data.scriptureReading);
        if (data.praiseWorship) participatedIds.add(data.praiseWorship);
        if (data.ushers && Array.isArray(data.ushers)) {
          data.ushers.forEach(id => participatedIds.add(id));
        }
      });
      
      const activeMembers = members?.filter(m => m.status === 'active' || m.status === 'new' || !m.status) || [];
      const currentlySelected = new Set([openingPrayer, tithesOfferingPrayer, scriptureReading, praiseWorship, ...ushers].filter(Boolean));
      
      let unparticipated = activeMembers.filter(m => !participatedIds.has(m.id) && !currentlySelected.has(m.id));
      let currentAll = activeMembers.filter(m => !currentlySelected.has(m.id));
      
      const getRandomMember = (pool) => {
        if (pool.length === 0) return null;
        const index = Math.floor(Math.random() * pool.length);
        const member = pool[index];
        pool.splice(index, 1);
        return member;
      };
      
      const assignRole = (currentValue) => {
        if (currentValue) return currentValue;
        let m = getRandomMember(unparticipated);
        if (!m) {
          m = getRandomMember(currentAll); 
        } else {
          currentAll = currentAll.filter(x => x.id !== m.id);
        }
        return m ? m.id : '';
      };
      
      const newOpeningPrayer = assignRole(openingPrayer);
      const newTithesOfferingPrayer = assignRole(tithesOfferingPrayer);
      const newScriptureReading = assignRole(scriptureReading);
      const newPraiseWorship = assignRole(praiseWorship);
      
      let newUshers = [...ushers];
      while (newUshers.length < 2) {
        let m = getRandomMember(unparticipated) || getRandomMember(currentAll);
        if (m) {
          if (!newUshers.includes(m.id)) {
            newUshers.push(m.id);
          }
        } else {
          break;
        }
      }

      setOpeningPrayer(newOpeningPrayer);
      setTithesOfferingPrayer(newTithesOfferingPrayer);
      setScriptureReading(newScriptureReading);
      setPraiseWorship(newPraiseWorship);
      setUshers(newUshers);
      
      await autoSaveSchedule({
        openingPrayer: newOpeningPrayer,
        tithesOfferingPrayer: newTithesOfferingPrayer,
        scriptureReading: newScriptureReading,
        praiseWorship: newPraiseWorship,
        ushers: newUshers
      });

      setMessage('✨ Auto-fill complete!');
      setTimeout(() => setMessage(''), 3000);
      
    } catch (err) {
      console.error("Error auto-filling:", err);
      setMessage("Error during auto-fill.");
    } finally {
      setIsLoading(false);
    }
  };

  const getMember = (id) => members?.find(m => m.id === id);

  // --- SHEET LOGIC ---
  const openSheet = (roleKey, title, isMulti) => {
    setSheetConfig({ isOpen: true, roleKey, title, isMulti });
    setSearchQuery('');
  };

  const closeSheet = () => {
    setSheetConfig({ ...sheetConfig, isOpen: false });
  };

  const handleSheetSelect = async (memberId) => {
    if (savingMemberId) return; // Prevent multiple clicks
    const { roleKey, isMulti } = sheetConfig;
    
    setSavingMemberId(memberId === '' ? 'clear' : memberId);
    
    if (!isMulti) {
      setters[roleKey].set(memberId);
      await autoSaveSchedule({ [roleKey]: memberId });
      setSavingMemberId(null);
      closeSheet();
    } else {
      const current = setters[roleKey].val;
      let newUshers;
      if (current.includes(memberId)) {
        newUshers = current.filter(id => id !== memberId);
      } else {
        if (roleKey === 'ushers' && current.length >= 2) {
          setMessage('Maximum 2 ushers allowed');
          setTimeout(() => setMessage(''), 3000);
          setSavingMemberId(null);
          return;
        }
        newUshers = [...current, memberId];
      }
      setters[roleKey].set(newUshers);
      await autoSaveSchedule({ [roleKey]: newUshers });
      setSavingMemberId(null);
    }
  };

  const renderSelectionSheet = () => {
    if (!sheetConfig.isOpen) return null;
    const filteredMembers = members?.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase())) || [];
    
    return createPortal(
      <div className="modal-overlay" onClick={closeSheet} style={{ zIndex: 4000 }}>
        <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', paddingBottom: '24px' }}>
          <div style={{ width: '40px', height: '5px', background: 'var(--border)', borderRadius: '10px', margin: '0 auto 20px' }} />
          
          <div className="modal-sheet-header" style={{ marginBottom: '20px' }}>
            <h3 className="modal-sheet-title">{sheetConfig.title}</h3>
            <button className="close-btn" onClick={closeSheet}>
              <X size={20} />
            </button>
          </div>
          
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <Search size={20} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search members..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: '16px', border: '1.5px solid var(--border)', background: 'var(--surface)', outline: 'none', fontSize: '16px', color: 'var(--text-primary)', fontWeight: '500' }}
            />
          </div>

          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '20px' }}>
            {!sheetConfig.isMulti && (
              <div onClick={() => handleSheetSelect('')} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '16px', cursor: savingMemberId ? 'default' : 'pointer', border: '1.5px solid transparent', opacity: savingMemberId && savingMemberId !== 'clear' ? 0.5 : 1 }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#FFF0F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={20} color="var(--primary)" />
                </div>
                <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--primary)', flex: 1 }}>Clear Selection</span>
                {savingMemberId === 'clear' && <div style={{ width: '20px', height: '20px', border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />}
              </div>
            )}
            
            {filteredMembers.map(m => {
              const isSelected = sheetConfig.isMulti 
                ? setters[sheetConfig.roleKey].val.includes(m.id) 
                : setters[sheetConfig.roleKey].val === m.id;
                
              return (
                <div key={m.id} onClick={() => handleSheetSelect(m.id)} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '10px 16px', borderRadius: '20px', cursor: savingMemberId ? 'default' : 'pointer', background: isSelected ? 'rgba(var(--primary-rgb), 0.08)' : 'transparent', border: `1.5px solid ${isSelected ? 'var(--primary)' : 'transparent'}`, transition: 'all 0.2s ease', opacity: savingMemberId && savingMemberId !== m.id ? 0.5 : 1 }}>
                  <img src={m.avatar || DEFAULT_AVATAR} alt="" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', boxShadow: 'var(--shadow-sm)', flexShrink: 0 }} />
                  <span style={{ fontSize: '16px', fontWeight: isSelected ? '800' : '600', color: 'var(--text-primary)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</span>
                  {savingMemberId === m.id ? (
                    <div style={{ width: '20px', height: '20px', border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                  ) : (
                    isSelected && <CheckCircle2 size={24} color="var(--primary)" style={{ animation: 'popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)', flexShrink: 0 }} />
                  )}
                </div>
              );
            })}
            {filteredMembers.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px', fontWeight: '600' }}>No members found.</p>
            )}
          </div>
          
          {sheetConfig.isMulti && (
            <button onClick={closeSheet} className="btn-primary" style={{ padding: '16px', borderRadius: '20px', fontWeight: '800', fontSize: '16px', boxShadow: 'var(--shadow-md)' }}>
              Done ({setters[sheetConfig.roleKey].val.length} Selected)
            </button>
          )}
        </div>
      </div>,
      document.querySelector('.app-container') || document.body
    );
  };

  const renderCalendarModal = () => {
    if (!isCalendarOpen) return null;
    
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    const nextMonth = () => {
      setCalendarViewDate(new Date(year, month + 1, 1));
    };
    
    const prevMonth = () => {
      setCalendarViewDate(new Date(year, month - 1, 1));
    };

    return createPortal(
      <div className="modal-overlay" onClick={closeCalendar} style={{ zIndex: 4000 }}>
        <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', paddingBottom: '32px' }}>
          <div style={{ width: '40px', height: '5px', background: 'var(--border)', borderRadius: '10px', margin: '0 auto 20px' }} />
          
          <div className="modal-sheet-header" style={{ marginBottom: '24px' }}>
            <h3 className="modal-sheet-title">Select Date</h3>
            <button className="close-btn" onClick={closeCalendar}>
              <X size={20} />
            </button>
          </div>
          
          {/* Calendar Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <button onClick={prevMonth} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--surface)', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ChevronRight size={20} style={{ transform: 'rotate(180deg)', color: 'var(--text-primary)' }} />
            </button>
            <h4 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              {monthNames[month]} {year}
            </h4>
            <button onClick={nextMonth} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--surface)', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ChevronRight size={20} color="var(--text-primary)" />
            </button>
          </div>
          
          {/* Days Header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '16px' }}>
            {dayNames.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '13px', fontWeight: '800', color: 'var(--text-secondary)' }}>{d}</div>
            ))}
          </div>
          
          {/* Calendar Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
            {days.map((d, idx) => {
              if (!d) return <div key={`empty-${idx}`} />;
              
              const dateStr = formatLocal(new Date(year, month, d));
              const isSelected = date === dateStr;
              const isToday = dateStr === formatLocal(new Date());
              
              return (
                <button 
                  key={d} 
                  onClick={() => {
                    setDate(dateStr);
                    closeCalendar();
                  }}
                  style={{
                    aspectRatio: '1',
                    borderRadius: '50%',
                    background: isSelected ? 'var(--primary)' : isToday ? 'var(--bg-gradient)' : 'transparent',
                    border: isToday && !isSelected ? '1.5px solid var(--primary)' : 'none',
                    color: isSelected ? '#fff' : isToday ? 'var(--primary)' : 'var(--text-primary)',
                    fontWeight: isSelected || isToday ? '800' : '600',
                    fontSize: '15px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
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
    );
  };

  // --- RENDER HELPERS ---
  const renderRoleCard = (title, value, roleKey) => {
    const member = getMember(value);
    
    return (
      <div 
        className="card" 
        onClick={() => openSheet(roleKey, title, false)}
        style={{ margin: 0, padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '16px', transition: 'transform 0.2s ease, box-shadow 0.2s ease', active: { transform: 'scale(0.98)' } }}
      >
        <h4 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-secondary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</h4>
        
        {member ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img 
              src={member.avatar || DEFAULT_AVATAR} 
              alt="" 
              style={{ width: '48px', height: '48px', borderRadius: '16px', objectFit: 'cover', border: '2px solid var(--surface)', boxShadow: 'var(--shadow-sm)' }} 
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.name}</h3>
              <p style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '700', margin: 0 }}>Assigned</p>
            </div>
            <ChevronRight size={20} color="var(--text-secondary)" opacity={0.5} style={{ flexShrink: 0 }} />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--bg-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border)' }}>
              <User size={20} color="var(--text-secondary)" opacity={0.5} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-secondary)', margin: '0 0 2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Unassigned</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.7, margin: 0 }}>Tap to select</p>
            </div>
            <ChevronRight size={20} color="var(--text-secondary)" opacity={0.5} style={{ flexShrink: 0 }} />
          </div>
        )}
      </div>
    );
  };

  const renderUshersCard = () => {
    return (
      <div 
        className="card" 
        onClick={() => openSheet('ushers', 'Select Ushers', true)}
        style={{ margin: 0, padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '16px', gridColumn: '1 / -1' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-secondary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ushers</h4>
          <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', background: 'rgba(var(--primary-rgb), 0.1)', padding: '4px 10px', borderRadius: '8px' }}>
            {ushers.length} Assigned
          </span>
        </div>
        
        {ushers.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {ushers.slice(0, 4).map((uId, idx) => {
                const m = getMember(uId);
                return (
                  <img 
                    key={uId}
                    src={m?.avatar || DEFAULT_AVATAR} 
                    alt="" 
                    style={{ 
                      width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', 
                      border: '3px solid var(--surface)', boxShadow: 'var(--shadow-sm)',
                      marginLeft: idx > 0 ? '-12px' : '0',
                      zIndex: 10 - idx
                    }} 
                  />
                );
              })}
              {ushers.length > 4 && (
                <div style={{ 
                  width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-gradient)', 
                  border: '3px solid var(--surface)', marginLeft: '-12px', zIndex: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: '800', color: 'var(--text-secondary)'
                }}>
                  +{ushers.length - 4}
                </div>
              )}
            </div>
            <div style={{ flex: 1 }} />
            <ChevronRight size={20} color="var(--text-secondary)" opacity={0.5} />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--bg-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border)' }}>
              <Users size={20} color="var(--text-secondary)" opacity={0.5} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-secondary)', margin: '0 0 2px 0' }}>No ushers assigned</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.7, margin: 0 }}>Tap to select team</p>
            </div>
            <ChevronRight size={20} color="var(--text-secondary)" opacity={0.5} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px' }}>
      
      {/* Modern Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 4px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 2px 0' }}>Duties</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, fontWeight: '500' }}>Plan ministerial roles</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            type="button"
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
            {date ? new Date(date.split('-')[0], date.split('-')[1]-1, date.split('-')[2]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Select'}
          </button>
          
          <button 
            type="button"
            onClick={handleAutoFill}
            disabled={isLoading || isSaving}
            title="Auto-fill schedule"
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '8px', borderRadius: '12px',
              background: 'var(--surface)', border: 'none',
              color: 'var(--primary)',
              boxShadow: 'var(--shadow-sm)', cursor: 'pointer',
              opacity: (isLoading || isSaving) ? 0.7 : 1
            }}
          >
            <Sparkles size={16} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontWeight: '700', color: 'var(--text-secondary)' }}>Loading schedule...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {renderRoleCard("Opening Prayer", openingPrayer, 'openingPrayer')}
          {renderRoleCard("Tithes & Offering Prayer", tithesOfferingPrayer, 'tithesOfferingPrayer')}
          {renderRoleCard("Scripture Reading", scriptureReading, 'scriptureReading')}
          {renderRoleCard("Praise & Worship", praiseWorship, 'praiseWorship')}
          {renderUshersCard()}
        </div>
      )}

      {/* Toast Notification */}
      {message && (
        <div style={{
          position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
          background: message.includes('Failed') || message.includes('Error') || message.includes('Maximum') ? '#FFF9E6' : '#DEF7EC',
          border: message.includes('Failed') || message.includes('Error') || message.includes('Maximum') ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(49, 196, 141, 0.3)',
          color: message.includes('Failed') || message.includes('Error') || message.includes('Maximum') ? '#92400E' : '#03543F',
          padding: '12px 20px', borderRadius: '16px', boxShadow: 'var(--shadow-md)',
          display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '700', fontSize: '14px',
          animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <CheckCircle2 size={18} />
          {message}
        </div>
      )}

      {renderSelectionSheet()}
      {renderCalendarModal()}
    </div>
  );
}
