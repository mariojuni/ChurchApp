import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, collection, query, orderBy, getDocs, writeBatch, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { ArrowLeft, Search, CheckCircle, XCircle, Clock, FileWarning, Users, QrCode } from 'lucide-react';

export default function TakeAttendance() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // All active members from roster
  const [members, setMembers] = useState([]);
  
  // Local state of attendance marks: { memberId: 'Present' | 'Absent' | 'Late' | 'Excused' }
  const [marks, setMarks] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [filterType, setFilterType] = useState('All'); // All, Unmarked, Present, Absent, Late, Excused

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    // Listen to session doc
    const unsubscribeSession = onSnapshot(doc(db, 'attendance_sessions', id), (docSnap) => {
      if (docSnap.exists()) {
        setSession({ id: docSnap.id, ...docSnap.data() });
      } else {
        navigate('/admin/attendance');
      }
    });

    // Fetch existing records for this session to populate initial marks
    const fetchExistingRecords = async () => {
      const recordsQ = query(collection(db, 'attendance_sessions', id, 'records'));
      const recordsSnap = await getDocs(recordsQ);
      const initialMarks = {};
      recordsSnap.forEach(r => {
        const data = r.data();
        if (data.type === 'Member') {
          initialMarks[data.memberId] = data.status;
        }
      });
      setMarks(initialMarks);
    };

    // Fetch roster
    const fetchMembers = async () => {
      const q = query(collection(db, 'users'), orderBy('name', 'asc'));
      const snap = await getDocs(q);
      const activeMembers = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(m => m.membershipStatus !== 'Archived');
      setMembers(activeMembers);
    };

    Promise.all([fetchExistingRecords(), fetchMembers()]).then(() => setLoading(false));
    
    return () => unsubscribeSession();
  }, [id, navigate]);

  const handleMark = (memberId, status) => {
    if (session?.status === 'Closed') return;
    setMarks(prev => ({
      ...prev,
      [memberId]: status
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      
      // Calculate metrics
      const newMetrics = {
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        visitors: session.metrics?.visitors || 0
      };

      Object.entries(marks).forEach(([memberId, status]) => {
        const docRef = doc(db, 'attendance_sessions', id, 'records', memberId);
        
        // Find member name
        const memberName = members.find(m => m.id === memberId)?.name || 'Unknown';
        
        batch.set(docRef, {
          memberId,
          memberName,
          status,
          type: 'Member',
          timestamp: new Date().toISOString()
        }, { merge: true });

        if (status === 'Present') newMetrics.present++;
        if (status === 'Absent') newMetrics.absent++;
        if (status === 'Late') newMetrics.late++;
        if (status === 'Excused') newMetrics.excused++;
      });

      // Update session metrics
      const sessionRef = doc(db, 'attendance_sessions', id);
      batch.update(sessionRef, {
        metrics: newMetrics
      });

      await batch.commit();
      alert("Attendance saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save attendance.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSessionStatus = async () => {
    const newStatus = session.status === 'Open' ? 'Closed' : 'Open';
    if (newStatus === 'Closed' && !window.confirm("Close this session? You won't be able to edit it unless you reopen it.")) return;
    
    try {
      await updateDoc(doc(db, 'attendance_sessions', id), {
        status: newStatus
      });
    } catch (err) {
      console.error(err);
    }
  };

  const filteredMembers = members.filter(m => {
    const matchesSearch = (m.name || m.displayName || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    
    const currentMark = marks[m.id];
    let matchesFilter = true;
    
    if (filterType === 'Unmarked') matchesFilter = !currentMark;
    else if (filterType !== 'All') matchesFilter = currentMark === filterType;

    return matchesSearch && matchesFilter;
  });

  if (loading) return <div className="p-8 text-center text-gray-500">Loading roster...</div>;
  if (!session) return null;

  const isClosed = session.status === 'Closed';

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <button 
            onClick={() => navigate('/admin/attendance')}
            className="mr-4 p-2 bg-white rounded-full shadow-sm text-gray-400 hover:text-church-navy transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-church-navy flex items-center">
              {session.eventName}
              <span className={`ml-4 inline-flex items-center px-2.5 py-0.5 rounded text-sm font-bold ${session.status === 'Open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                {session.status}
              </span>
            </h1>
            <p className="text-sm text-church-slate mt-1">{new Date(session.date).toLocaleDateString()}</p>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button 
            onClick={toggleSessionStatus}
            className="px-4 py-2 bg-white border border-gray-300 text-church-navy rounded-full text-sm font-bold hover:bg-gray-50 transition-colors"
          >
            {isClosed ? 'Reopen Session' : 'Close Session'}
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving || isClosed}
            className="px-6 py-2 bg-church-green text-white rounded-full text-sm font-bold shadow-md hover:bg-church-green/90 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-3xl shadow-church-soft border border-gray-100 flex flex-col overflow-hidden">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex space-x-4 flex-1">
            <div className="relative w-80">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-church-green bg-white"
                placeholder="Search roster..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center border border-gray-300 rounded-full bg-white px-1 py-1 shadow-sm">
              <span className="text-xs font-bold text-gray-400 pl-3 pr-2 uppercase">Show:</span>
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="text-sm font-bold text-church-navy bg-transparent focus:outline-none pr-3 py-1 cursor-pointer"
              >
                <option value="All">All Members</option>
                <option value="Unmarked">Unmarked Only</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Late">Late</option>
                <option value="Excused">Excused</option>
              </select>
            </div>
          </div>

          <div className="flex space-x-3">
            <button 
              onClick={() => alert('QR Scanner coming soon! This will activate device camera for fast check-in.')}
              className="flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-bold hover:bg-blue-100 transition-colors"
            >
              <QrCode size={16} className="mr-2" /> QR Scanner
            </button>
            <button 
              onClick={() => {
                const visitorName = prompt("Enter visitor name:");
                if(visitorName) {
                  // Save a visitor immediately to the subcollection
                  const docRef = doc(collection(db, 'attendance_sessions', id, 'records'));
                  writeBatch(db).set(docRef, {
                    memberId: `visitor_${Date.now()}`,
                    memberName: visitorName,
                    status: 'Present',
                    type: 'Visitor',
                    timestamp: new Date().toISOString()
                  }).update(doc(db, 'attendance_sessions', id), {
                    'metrics.visitors': (session.metrics?.visitors || 0) + 1
                  }).commit();
                }
              }}
              disabled={isClosed}
              className="flex items-center px-4 py-2 bg-white border border-gray-300 text-church-navy rounded-full text-sm font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Users size={16} className="mr-2" /> Log Visitor
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2 max-w-4xl mx-auto">
            {filteredMembers.map(member => {
              const mark = marks[member.id];
              return (
                <div key={member.id} className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 hover:border-church-green/30 transition-all hover:shadow-sm bg-white">
                  <div className="flex flex-col">
                    <span className="font-bold text-church-navy">{member.name}</span>
                    <span className="text-xs text-gray-400">{member.role?.replace('_', ' ')}</span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleMark(member.id, 'Present')}
                      disabled={isClosed}
                      className={`flex items-center px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
                        mark === 'Present' ? 'bg-green-100 text-green-700 border-2 border-green-200' : 'bg-gray-50 text-gray-500 hover:bg-green-50 border-2 border-transparent'
                      }`}
                    >
                      <CheckCircle size={16} className="mr-1.5" /> Present
                    </button>
                    
                    <button 
                      onClick={() => handleMark(member.id, 'Late')}
                      disabled={isClosed}
                      className={`flex items-center px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
                        mark === 'Late' ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-200' : 'bg-gray-50 text-gray-500 hover:bg-yellow-50 border-2 border-transparent'
                      }`}
                    >
                      <Clock size={16} className="mr-1.5" /> Late
                    </button>

                    <button 
                      onClick={() => handleMark(member.id, 'Absent')}
                      disabled={isClosed}
                      className={`flex items-center px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
                        mark === 'Absent' ? 'bg-red-100 text-red-700 border-2 border-red-200' : 'bg-gray-50 text-gray-500 hover:bg-red-50 border-2 border-transparent'
                      }`}
                    >
                      <XCircle size={16} className="mr-1.5" /> Absent
                    </button>

                    <button 
                      onClick={() => handleMark(member.id, 'Excused')}
                      disabled={isClosed}
                      className={`flex items-center px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
                        mark === 'Excused' ? 'bg-purple-100 text-purple-700 border-2 border-purple-200' : 'bg-gray-50 text-gray-500 hover:bg-purple-50 border-2 border-transparent'
                      }`}
                    >
                      <FileWarning size={16} className="mr-1.5" /> Excused
                    </button>
                  </div>
                </div>
              );
            })}
            
            {filteredMembers.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No members found matching your filters.
              </div>
            )}
          </div>
        </div>

        {/* Footer Summary */}
        <div className="p-4 border-t border-gray-100 bg-white flex justify-between items-center text-sm">
          <div className="flex space-x-6 font-medium text-church-slate">
            <span>Marked: <span className="text-church-navy font-bold">{Object.keys(marks).length} / {members.length}</span></span>
            <span className="text-green-600">Present: {Object.values(marks).filter(v => v === 'Present').length}</span>
            <span className="text-yellow-600">Late: {Object.values(marks).filter(v => v === 'Late').length}</span>
            <span className="text-red-600">Absent: {Object.values(marks).filter(v => v === 'Absent').length}</span>
            <span className="text-blue-600">Visitors: {session.metrics?.visitors || 0}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
