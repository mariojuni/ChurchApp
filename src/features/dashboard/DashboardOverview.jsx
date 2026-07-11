import React, { useEffect, useState, useMemo } from 'react';
import { Users, HeartHandshake, CreditCard, Calendar, ArrowRight, UserPlus, Clock, ClipboardCheck } from 'lucide-react';
import { collection, query, getDocs, limit, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canManageGiving } from '../../utils/permissions';

export default function DashboardOverview() {
  const { userProfile } = useAuth();
  const CHURCH_ID = userProfile?.churchId || 'YmEc6C69Xz4DKRQaQZBV';
  
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
        if (!userProfile) return;
        if (!CHURCH_ID) {
          setLoading(false);
          return;
        }

        let membersCount = 0;
        try {
          const membersQ = query(collection(db, 'users'), where('churchId', '==', CHURCH_ID));
          const membersSnap = await getDocs(membersQ);
          membersCount = membersSnap.docs.length;
        } catch (e) { console.error("Error fetching members:", e); }

        // 2. Fetch recent giving for "This Week"
        let totalGivingThisWeek = 0;
        try {
          const givingQ = query(collection(db, 'givingRecords'), where('churchId', '==', CHURCH_ID));
          const givingSnap = await getDocs(givingQ);
          const now = new Date();
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          givingSnap.docs.forEach(doc => {
            const data = doc.data();
            if (data.date) {
              const dateObj = new Date(data.date + 'T00:00:00');
              if (dateObj >= oneWeekAgo && dateObj <= now) {
                totalGivingThisWeek += (data.amount || 0);
              }
            }
          });
        } catch (e) { console.error("Error fetching giving:", e); }

        // 3. Fetch expenses
        let totalExpenses = 0;
        try {
          const expensesQ = query(collection(db, 'givingExpenses'), where('churchId', '==', CHURCH_ID));
          const expensesSnap = await getDocs(expensesQ);
          expensesSnap.forEach(doc => {
            totalExpenses += (doc.data().amount || 0);
          });
        } catch (e) { console.error("Error fetching expenses:", e); }

        // 4. Fetch pending prayer requests
        let pendingPrayers = 0;
        try {
          const prayerSnap = await getDocs(collection(db, 'churches', CHURCH_ID, 'prayer_requests'));
          prayerSnap.forEach(doc => {
            if (doc.data().status === 'pending') pendingPrayers++;
          });
        } catch (e) { console.error("Error fetching prayers:", e); }

        // 5. Fetch upcoming events (next 5)
        let upcomingEvents = [];
        try {
          const eventsQ = query(collection(db, 'events'), where('churchId', '==', CHURCH_ID));
          const eventsSnap = await getDocs(eventsQ);
          const allEvents = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          upcomingEvents = allEvents
            .filter(e => e.date) // ensure it has a date
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .filter(e => new Date(e.date + 'T23:59:59') >= new Date()) // only future/today events
            .slice(0, 4); // Take top 4
        } catch (e) { console.error("Error fetching events:", e); }

        // 6. Fetch recent attendance
        let recentAtt = 0;
        try {
          const attendanceQ = query(
            collection(db, 'attendance'),
            where('churchId', '==', CHURCH_ID),
            orderBy('date', 'desc'),
            limit(100)
          );
          const attendanceSnap = await getDocs(attendanceQ);
          const validAttendance = attendanceSnap.docs.map(d => d.data());
          if (validAttendance.length > 0) {
            const mostRecentDate = validAttendance[0].date;
            recentAtt = validAttendance.filter(d => d.date === mostRecentDate).length;
          }
        } catch (e) { console.error("Error fetching attendance:", e); }

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
  }, [userProfile?.churchId]);

  const canSeeGiving = canManageGiving(userProfile);

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
