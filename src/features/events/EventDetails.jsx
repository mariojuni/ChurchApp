import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Calendar, MapPin, Clock, ArrowLeft, Users, Shield, CheckCircle2 } from 'lucide-react';

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const docRef = doc(db, 'events', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setEvent({ id: docSnap.id, ...docSnap.data() });
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching event:", error);
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, 'ministryAssignments'), where('eventId', '==', id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAssignments(docs);
    });
    return () => unsubscribe();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-church-slate">Loading event details...</div>;
  if (!event) return <div className="p-8 text-center text-church-slate">Event not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button onClick={() => navigate('/admin/events')} className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-church-navy">{event.title}</h1>
          <div className="flex items-center text-sm text-church-slate mt-1 space-x-4">
            <span className="flex items-center"><Calendar size={14} className="mr-1" /> {event.date || 'TBD'}</span>
            <span className="flex items-center"><Clock size={14} className="mr-1" /> {event.startTime || event.time || 'TBD'}</span>
            <span className="flex items-center"><MapPin size={14} className="mr-1" /> {event.location || 'TBD'}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100 px-6 pt-4 space-x-6">
          {['overview', 'assigned_ministries', 'attendance', 'rsvp'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-sm font-bold capitalize transition-colors border-b-2 ${activeTab === tab ? 'border-church-green text-church-green' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-church-navy text-lg mb-2">Description</h3>
                <p className="text-church-slate">{event.description || 'No description provided.'}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <h4 className="font-bold text-church-navy mb-1">Status</h4>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${event.status === 'Published' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                    {event.status || 'Draft'}
                  </span>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <h4 className="font-bold text-church-navy mb-1">Category</h4>
                  <p className="text-church-slate">{event.category || 'General'}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'assigned_ministries' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-church-navy text-lg">Assigned Ministries</h3>
                <button onClick={() => navigate('/admin/schedules')} className="text-sm text-church-green font-bold hover:underline">
                  Manage in Scheduling
                </button>
              </div>
              {assignments.length === 0 ? (
                <div className="text-center py-8 text-church-slate">No ministries assigned to this event yet.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assignments.map(a => (
                    <div key={a.id} className="p-4 border border-gray-100 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="font-bold text-church-navy">{a.ministryName || a.ministryId}</p>
                        <p className="text-xs text-church-slate mt-1">{a.roleName} - {a.memberName}</p>
                      </div>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${a.status === 'Confirmed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {a.status || 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="text-center py-12 text-church-slate">
              <p>Attendance tracking for this event.</p>
              <button onClick={() => navigate(`/admin/attendance/${event.id}`)} className="mt-4 px-4 py-2 bg-church-green text-white rounded-full text-sm font-bold">
                Take Attendance
              </button>
            </div>
          )}

          {activeTab === 'rsvp' && (
            <div className="text-center py-12 text-church-slate">
              <p>RSVP management coming soon.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
