import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { ClipboardCheck, Plus, Calendar, Users, ArrowRight } from 'lucide-react';

export default function AttendanceDashboard() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, 'attendance_sessions'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSessions(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateSession = async () => {
    setIsCreating(true);
    const eventName = prompt("Enter the name of this service or event (e.g. Sunday Service - Morning):");
    
    if (eventName && eventName.trim()) {
      try {
        const newDoc = await addDoc(collection(db, 'attendance_sessions'), {
          eventName: eventName.trim(),
          date: new Date().toISOString(),
          status: 'Open',
          metrics: {
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            visitors: 0
          },
          createdAt: serverTimestamp(),
          churchId: 'YmEc6C69Xz4DKRQaQZBV'
        });
        navigate(`/admin/attendance/${newDoc.id}`);
      } catch (err) {
        console.error(err);
        alert("Failed to create attendance session.");
        setIsCreating(false);
      }
    } else {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-church-navy">Attendance</h1>
          <p className="text-sm text-church-slate mt-1">Track service participation and monitor church growth.</p>
        </div>
        <button 
          onClick={handleCreateSession}
          disabled={isCreating}
          className="flex items-center px-5 py-2.5 bg-church-green text-white rounded-full shadow-md text-sm font-bold hover:bg-church-green/90 transition-opacity disabled:opacity-50"
        >
          <Plus size={18} className="mr-2" />
          {isCreating ? 'Creating...' : 'New Session'}
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 overflow-hidden min-h-[400px]">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="font-bold text-church-navy flex items-center">
            <Calendar size={18} className="mr-2 text-church-green" /> 
            Recent Sessions
          </h2>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center text-church-slate py-12">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-16">
              <div className="flex justify-center text-gray-300 mb-4"><ClipboardCheck size={40} /></div>
              <p className="text-church-navy font-bold text-lg">No attendance records yet</p>
              <p className="text-church-slate text-sm">Click "New Session" to start tracking attendance for your next service.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessions.map(session => {
                const dateObj = new Date(session.date);
                const isToday = dateObj.toDateString() === new Date().toDateString();
                
                return (
                  <div 
                    key={session.id} 
                    onClick={() => navigate(`/admin/attendance/${session.id}`)}
                    className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-church-green/30 transition-all cursor-pointer group flex flex-col"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                          {isToday ? 'Today' : dateObj.toLocaleDateString()}
                        </span>
                        <h3 className="text-lg font-bold text-church-navy group-hover:text-church-green transition-colors line-clamp-1">{session.eventName}</h3>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${session.status === 'Open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {session.status}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4 flex-1">
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">Total Present</div>
                        <div className="text-2xl font-black text-church-navy">
                          {(session.metrics?.present || 0) + (session.metrics?.visitors || 0)}
                        </div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col justify-center">
                        <div className="text-xs text-gray-500 mb-1 flex justify-between">
                          <span>Members:</span>
                          <span className="font-bold text-church-navy">{session.metrics?.present || 0}</span>
                        </div>
                        <div className="text-xs text-gray-500 flex justify-between">
                          <span>Visitors:</span>
                          <span className="font-bold text-church-navy">{session.metrics?.visitors || 0}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-gray-100 flex items-center text-sm font-bold text-church-green">
                      View Details <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
