import React, { useState, useEffect } from 'react';
import { QrCode, Search, Award, Users, ShieldAlert } from 'lucide-react';
import ScheduleTab from '../components/ScheduleTab';
import AttendanceTab from '../components/AttendanceTab';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const Staff = ({ isStaff, members = [], setActiveTab }) => {

  const [activeTab, setActiveTabLocal] = useState('history'); // history, dashboard
  
  // Preload schedule for next Sunday to eliminate lag, keeping it synced via onSnapshot
  const [preloadedSchedule, setPreloadedSchedule] = useState(null);
  useEffect(() => {
    const getNextSunday = () => {
      const d = new Date();
      d.setDate(d.getDate() + (7 - d.getDay()) % 7);
      if (d.getDay() !== 0) d.setDate(d.getDate() + (7 - d.getDay())); 
      return d.toISOString().split('T')[0];
    };
    
    let unsubscribe = () => {};
    import('firebase/firestore').then(({ doc, onSnapshot }) => {
      unsubscribe = onSnapshot(doc(db, 'schedules', getNextSunday()), (snap) => {
        setPreloadedSchedule(snap.exists() ? snap.data() : { empty: true });
      }, (err) => {
        console.error("Prefetch sync error:", err);
      });
    });

    return () => unsubscribe();
  }, []);
  
  // Data State
  const [historicalServices, setHistoricalServices] = useState([]);
  const [todayCheckins, setTodayCheckins] = useState([]);
  
  // Demo Kiosk/Staff Mode
  const [demoStaffMode, setDemoStaffMode] = useState(false);
  const showStaffFeatures = isStaff || demoStaffMode;

  // Firestore sync listeners
  useEffect(() => {
    // 1. Historical services sync
    const qServices = query(collection(db, 'services'), orderBy('date', 'asc'));
    const unsubscribeServices = onSnapshot(qServices, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistoricalServices(data);
    }, (error) => {
      console.error("Error fetching services history:", error);
    });

    // 2. Today's active checkins sync (used for Analytics/Today stats)
    const todayStr = getTodayStr();
    const qCheckins = query(collection(db, 'attendance'), where('date', '==', todayStr));
    const unsubscribeCheckins = onSnapshot(qCheckins, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTodayCheckins(data);
    }, (error) => {
      console.error("Error fetching today check-ins:", error);
    });

    return () => {
      unsubscribeServices();
      unsubscribeCheckins();
    };
  }, []);



  // Compute metrics dynamically from todayCheckins
  const checkedInMembers = todayCheckins.filter(c => c.type === 'member');
  
  // Count first-time visitors who checked in today
  const firstTimeVisitorsToday = todayCheckins.filter(
    c => c.role === 'First-time Visitor' || c.status === 'new'
  );

  const todayTotalAttendance = checkedInMembers.length;

  // Compile line chart data
  const lineLabels = historicalServices.map(s => {
    const parts = s.date.split('-');
    if (parts.length === 3) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[parseInt(parts[1], 10) - 1]} ${parseInt(parts[2], 10)}`;
    }
    return s.date;
  });
  
  const lineDataPoints = historicalServices.map(s => s.totalAttendance);

  // Append Today to history line chart
  lineLabels.push('Today');
  lineDataPoints.push(todayTotalAttendance);

  const lineChartData = {
    labels: lineLabels,
    datasets: [
      {
        fill: true,
        label: 'Attendance',
        data: lineDataPoints,
        borderColor: '#FF6596',
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return null;
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(255, 101, 150, 0.35)');
          gradient.addColorStop(1, 'rgba(255, 101, 150, 0.0)');
          return gradient;
        },
        tension: 0.4,
        borderWidth: 3,
        pointBackgroundColor: '#FFFFFF',
        pointBorderColor: '#FF6596',
        pointBorderWidth: 2,
        pointRadius: 4,
      }
    ]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'var(--surface)',
        titleColor: 'var(--text-primary)',
        bodyColor: 'var(--primary)',
        padding: 10,
        boxPadding: 4,
        borderColor: 'rgba(255, 101, 150, 0.1)',
        borderWidth: 1,
        usePointStyle: true,
        callbacks: {
          label: (context) => ` Attendance: ${context.parsed.y}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: 'var(--text-secondary)', font: { size: 10, weight: '600' } }
      },
      y: {
        border: { display: false },
        grid: { color: 'var(--border)' },
        ticks: { color: 'var(--text-secondary)', font: { size: 10 } }
      }
    }
  };

  // Compile bar chart data for first-time visitors
  const barLabels = historicalServices.map(s => {
    const parts = s.date.split('-');
    if (parts.length === 3) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[parseInt(parts[1], 10) - 1]} ${parseInt(parts[2], 10)}`;
    }
    return s.date;
  });
  const barDataPoints = historicalServices.map(s => s.firstTimeVisitors);

  barLabels.push('Today');
  barDataPoints.push(firstTimeVisitorsToday.length);

  const barChartData = {
    labels: barLabels,
    datasets: [
      {
        data: barDataPoints,
        backgroundColor: (context) => {
          const index = context.dataIndex;
          if (index === barDataPoints.length - 1) return '#FF6596'; // Highlight today
          return '#B66DFF';
        },
        borderRadius: 6,
        barThickness: 8,
      }
    ]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'var(--surface)',
        titleColor: 'var(--text-primary)',
        bodyColor: 'var(--secondary)',
        padding: 8,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: 'var(--text-secondary)', font: { size: 9, weight: '600' } }
      },
      y: {
        display: false
      }
    }
  };

  // Doughnut chart for Member Check-in ratio
  const totalRegisteredMembers = members.length || 12;
  const checkedInMembersCount = checkedInMembers.length;
  const absentMembersCount = Math.max(0, totalRegisteredMembers - checkedInMembersCount);
  const checkedInRatio = totalRegisteredMembers > 0 ? Math.round((checkedInMembersCount / totalRegisteredMembers) * 100) : 0;

  const doughnutChartData = {
    labels: ['Checked In', 'Absent'],
    datasets: [
      {
        data: [checkedInMembersCount, absentMembersCount],
        backgroundColor: ['#4ADE80', '#E2E8F0'],
        borderWidth: 0,
        hoverOffset: 2
      }
    ]
  };

  const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }
    }
  };

  return (
    <section className="screen">
      <div className="scroll-content" style={{ paddingTop: 0 }}>
        {/* Unified Sticky Header */}
        <div style={{
          position: 'sticky',
          top: '-572px',
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
              onClick={() => setActiveTab('qr-scanner')}
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
              <QrCode size={20} color="var(--text-primary)" />
            </button>
          </div>

          {/* Large Left-Aligned Title */}
          <h1 style={{ 
            fontSize: '34px', 
            fontWeight: '900', 
            margin: '0 0 20px 0',
            color: 'var(--text-primary)',
            letterSpacing: '-0.5px'
          }}>
            Staff
          </h1>

          {/* Filters Wrapper */}
          <div style={{ paddingBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="filter-pills" style={{ overflow: 'auto', flexWrap: 'nowrap', margin: 0, paddingBottom: 0, gap: '16px', flex: 1 }}>
              <button className={`pill ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTabLocal('history')}>
                Attendance
              </button>
              {isStaff && (
                <button className={`pill ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTabLocal('schedule')}>
                  Schedule
                </button>
              )}
              <button className={`pill ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTabLocal('reports')}>
                Reports
              </button>
            </div>
            {demoStaffMode && (
              <span style={{ fontSize: '10px', background: 'var(--primary)', color: '#fff', padding: '3px 8px', borderRadius: '8px', fontWeight: 'bold', marginLeft: '12px', flexShrink: 0 }}>
                DEMO STAFF MODE ACTIVE
              </span>
            )}
          </div>
        </div>

        {/* ---------------- REPORTS TAB ---------------- */}
        {activeTab === 'reports' && (
          <div>
            {/* Live Counts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div className="card" style={{ margin: 0, padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', background: '#FFE8F0', color: 'var(--primary)', borderRadius: '10px' }}>
                  <Users size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>Members</h3>
                  <h2 style={{ fontSize: '18px', color: 'var(--text-primary)', fontWeight: '800' }}>{checkedInMembers.length}</h2>
                </div>
              </div>
              
              <div className="card" style={{ margin: 0, padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', background: '#E8F0FF', color: 'var(--tertiary)', borderRadius: '10px' }}>
                  <Award size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>First-time Visitors</h3>
                  <h2 style={{ fontSize: '18px', color: 'var(--text-primary)', fontWeight: '800' }}>{firstTimeVisitorsToday.length}</h2>
                </div>
              </div>
            </div>

            {/* Attendance Line Chart Card */}
            <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700' }}>Service Attendance History</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Last 6 services</span>
              </div>
              <div style={{ height: '160px', position: 'relative' }}>
                <Line options={lineChartOptions} data={lineChartData} />
              </div>
            </div>

            {/* Bento Bottom Row: Visitors & Ratios */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              
              {/* First time Visitors Trends */}
              <div className="card" style={{ margin: 0, padding: '14px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '10px' }}>New Visitors</h3>
                <div style={{ height: '90px', position: 'relative', marginBottom: '8px' }}>
                  <Bar options={barChartOptions} data={barChartData} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Today's Visitors</span>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--primary)' }}>+{firstTimeVisitorsToday.length}</span>
                </div>
              </div>

              {/* Check-in Ratios Doughnut */}
              <div className="card" style={{ margin: 0, padding: '14px', position: 'relative' }}>
                <h3 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>Check-in Ratio</h3>
                <div style={{ height: '90px', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <div style={{ width: '90px', height: '90px' }}>
                    <Doughnut options={doughnutChartOptions} data={doughnutChartData} />
                  </div>
                  <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '16px', fontWeight: '800', color: '#4ADE80', lineHeight: 1 }}>{checkedInRatio}%</span>
                    <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>checked in</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                  <span>Present: {checkedInMembersCount}</span>
                  <span>Total: {totalRegisteredMembers}</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ---------------- HISTORY TAB ---------------- */}
        {activeTab === 'history' && (
          <AttendanceTab 
            members={members} 
            todayCheckins={todayCheckins} 
            showStaffFeatures={showStaffFeatures} 
            setDemoStaffMode={setDemoStaffMode} 
          />
        )}

        {/* ---------------- SCHEDULE TAB ---------------- */}
        {activeTab === 'schedule' && isStaff && (
          <ScheduleTab members={members} preloadedSchedule={preloadedSchedule} />
        )}
        
        <div className="bottom-spacer" style={{ height: 100 }}></div>
      </div>
    </section>
  );
};

export default Staff;
