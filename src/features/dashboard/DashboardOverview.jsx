import React, { useEffect, useState, useMemo } from 'react';
import { Users, HeartHandshake, CreditCard, Calendar, ArrowRight, UserPlus, Clock, ClipboardCheck } from 'lucide-react';
import { collection, query, getDocs, limit, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const CHURCH_ID = 'casubiduan';

export default function DashboardOverview() {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState({
    members: 0,
    givingThisWeek: 0,
    expenses: 0,
    prayerRequests: 0,
    upcomingEvents: [],
    recentAttendance: 0
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // 1. Fetch Members count
        const membersSnap = await getDocs(collection(db, 'users'));
        const membersCount = membersSnap.size;

        // 2. Fetch recent giving for "This Week" (Simplified logic: just fetch all and filter in memory for MVP)
        const givingSnap = await getDocs(collection(db, 'giving'));
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        let totalGivingThisWeek = 0;
        givingSnap.forEach(doc => {
          const data = doc.data();
          if (data.date) {
            const dateObj = new Date(data.date + 'T00:00:00');
            if (dateObj >= oneWeekAgo && dateObj <= now) {
              totalGivingThisWeek += (data.amount || 0);
            }
          }
        });

        // 3. Fetch expenses
        const expensesSnap = await getDocs(collection(db, 'churches', CHURCH_ID, 'expenses'));
        let totalExpenses = 0;
        expensesSnap.forEach(doc => {
          totalExpenses += (doc.data().amount || 0);
        });

        // 4. Fetch pending prayer requests
        const prayerSnap = await getDocs(collection(db, 'churches', CHURCH_ID, 'prayer_requests'));
        let pendingPrayers = 0;
        prayerSnap.forEach(doc => {
          if (doc.data().status === 'pending') {
            pendingPrayers++;
          }
        });

        // 5. Fetch upcoming events (next 5)
        // Note: For a real app, query by date > now. For MVP, we'll fetch all, sort, and slice.
        const eventsSnap = await getDocs(collection(db, 'events'));
        const allEvents = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const upcomingEvents = allEvents
          .filter(e => e.date) // ensure it has a date
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .filter(e => new Date(e.date + 'T23:59:59') >= new Date()) // only future/today events
          .slice(0, 4); // Take top 4

        // 6. Fetch recent attendance
        const attendanceSnap = await getDocs(query(collection(db, 'attendance_sessions'), orderBy('date', 'desc'), limit(1)));
        let recentAtt = 0;
        if (!attendanceSnap.empty) {
          const m = attendanceSnap.docs[0].data().metrics || {};
          recentAtt = (m.present || 0) + (m.visitors || 0);
        }

        setStats({
          members: membersCount,
          givingThisWeek: totalGivingThisWeek,
          expenses: totalExpenses,
          prayerRequests: pendingPrayers,
          upcomingEvents: upcomingEvents,
          recentAttendance: recentAtt
        });
        
        setLoading(false);
      } catch (e) {
        console.error("Failed to fetch stats", e);
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const canSeeGiving = ['super_admin', 'church_admin', 'finance_admin'].includes(userProfile?.role?.toLowerCase());

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const options = { month: 'short', day: 'numeric' };
    const dateObj = new Date(dateStr + 'T00:00:00'); 
    return dateObj.toLocaleDateString(undefined, options);
  };

  return (
    <div className="space-y-6 flex flex-col h-full overflow-y-auto pb-8">
      
      {/* Welcome Banner */}
      <div className="bg-white rounded-3xl p-8 shadow-church-soft border border-gray-100 flex justify-between items-center relative overflow-hidden">
        <div className="z-10 relative">
          <h1 className="text-3xl font-bold text-church-navy">Welcome back, {userProfile?.name || 'Admin'}!</h1>
          <p className="text-sm text-church-slate mt-2">
            Current {new Date().toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </p>
          <p className="text-sm text-church-navy font-medium mt-1">Here is what is happening at the church today.</p>
        </div>
        {/* Decorative elements */}
        <div className="absolute right-0 top-0 bottom-0 w-64 bg-church-green/5 rounded-l-full -mr-16 transform -skew-x-12 hidden md:block"></div>
        <div className="absolute right-10 top-1/2 -translate-y-1/2 hidden md:block opacity-10">
          <Calendar size={120} />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Members */}
        <div className="bg-white p-6 rounded-3xl shadow-church-soft border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <p className="text-sm font-bold text-church-navy uppercase tracking-wide">Total Members</p>
            <div className="p-2 bg-gray-50 text-gray-400 rounded-xl">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-4xl font-bold text-church-navy">
              {loading ? '...' : stats.members}
            </h3>
            <p className="text-xs text-church-green font-bold mt-2">Active records synced</p>
          </div>
        </div>

        {/* Recent Attendance */}
        <div className="bg-white p-6 rounded-3xl shadow-church-soft border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <p className="text-sm font-bold text-church-navy uppercase tracking-wide">Last Attendance</p>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <ClipboardCheck size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <h3 className="text-4xl font-bold text-church-navy">
                {loading ? '...' : stats.recentAttendance}
              </h3>
              <p className="text-xs text-church-purple font-bold mt-2">Latest service</p>
            </div>
            <Link to="/admin/attendance" className="text-xs font-bold text-blue-600 hover:underline">
              Take Roll
            </Link>
          </div>
        </div>

        {/* Weekly Giving (Protected) */}
        {canSeeGiving && (
          <div className="bg-white p-6 rounded-3xl shadow-church-soft border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <p className="text-sm font-bold text-church-navy uppercase tracking-wide">Weekly Giving (PHP)</p>
              <div className="p-2 bg-green-50 text-church-green rounded-xl">
                <CreditCard size={20} />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold text-church-navy">
                {loading ? '...' : formatCurrency(stats.givingThisWeek)}
              </h3>
              <p className="text-xs text-church-green font-bold mt-2 flex items-center">
                <ArrowRight size={12} className="mr-1 -rotate-45" /> View breakdown
              </p>
            </div>
          </div>
        )}

        {/* Expenses (Protected) */}
        {canSeeGiving && (
          <div className="bg-white p-6 rounded-3xl shadow-church-soft border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <p className="text-sm font-bold text-church-navy uppercase tracking-wide">Total Expenses</p>
              <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                <CreditCard size={20} />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold text-church-navy">
                {loading ? '...' : formatCurrency(stats.expenses)}
              </h3>
              <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-red-500 h-1.5 rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Prayer Requests */}
        <div className="bg-white p-6 rounded-3xl shadow-church-soft border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <p className="text-sm font-bold text-church-navy uppercase tracking-wide">Prayer Requests</p>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <HeartHandshake size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <h3 className="text-4xl font-bold text-church-navy">
                {loading ? '...' : stats.prayerRequests}
              </h3>
              <p className="text-xs text-church-slate font-medium mt-1">Pending approval</p>
            </div>
            <Link to="/admin/prayer" className="text-xs font-bold text-blue-600 hover:underline">
              Review
            </Link>
          </div>
        </div>

      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        
        {/* Left Column: Events */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-church-soft border border-gray-100 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-church-navy">Upcoming Events & Ministries</h2>
            <Link to="/admin/events" className="text-sm font-bold text-church-green hover:underline">
              View Calendar
            </Link>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {loading ? (
              <div className="text-church-slate text-sm">Loading events...</div>
            ) : stats.upcomingEvents.length === 0 ? (
              <div className="text-church-slate text-sm text-center py-10">No upcoming events scheduled.</div>
            ) : (
              stats.upcomingEvents.map(event => (
                <div key={event.id} className="flex items-center p-4 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-church-green/10 flex flex-col items-center justify-center shrink-0 mr-4">
                    <span className="text-[10px] font-bold text-church-green uppercase">{new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                    <span className="text-lg font-bold text-church-navy leading-none">{new Date(event.date).getDate()}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-bold text-church-navy">{event.title}</h4>
                    <div className="flex items-center text-xs text-church-slate mt-1 space-x-3">
                      <span className="flex items-center"><Clock size={12} className="mr-1" /> {event.time || 'All Day'}</span>
                      <span className="flex items-center"><Users size={12} className="mr-1" /> {event.location || 'Church Campus'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Right Column: Quick Actions */}
        <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 p-6 flex flex-col">
          <h2 className="text-xl font-bold text-church-navy mb-6">Quick Actions</h2>
          
          <div className="space-y-3 flex-1">
            <Link to="/admin/members" className="flex items-center p-4 bg-church-navy text-white rounded-2xl hover:bg-church-navy/90 transition-colors font-bold text-sm">
              <UserPlus size={18} className="mr-3" /> Add New Member
            </Link>
            
            <Link to="/admin/events" className="flex items-center p-4 bg-church-green text-white rounded-2xl hover:bg-church-green/90 transition-colors font-bold text-sm">
              <Calendar size={18} className="mr-3" /> Schedule Event
            </Link>
            
            {canSeeGiving && (
              <Link to="/admin/giving" className="flex items-center p-4 bg-white border-2 border-church-green text-church-green rounded-2xl hover:bg-green-50 transition-colors font-bold text-sm">
                <CreditCard size={18} className="mr-3" /> Create Donation Entry
              </Link>
            )}
            
            <Link to="/admin/prayer" className="flex items-center p-4 bg-gray-50 border border-gray-200 text-church-navy rounded-2xl hover:bg-gray-100 transition-colors font-bold text-sm">
              <HeartHandshake size={18} className="mr-3" /> Review Prayer Wall
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
