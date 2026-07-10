import React, { useState, useEffect } from 'react';
import { X, User, Phone, Mail, MapPin, Calendar, HeartHandshake, CreditCard, Clock, CheckCircle, ClipboardCheck } from 'lucide-react';
import { collection, collectionGroup, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { logRoleChange } from '../../utils/roleAudit';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const SYSTEM_ROLES = [
  'super_admin',
  'church_admin',
  'pastor',
  'ministry_leader',
  'finance_admin',
  'secretary',
  'viewer'
];

export default function MemberProfileModal({ isOpen, onClose, member = null }) {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [givingHistory, setGivingHistory] = useState([]);
  const [loadingGiving, setLoadingGiving] = useState(false);
  
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  const [newRole, setNewRole] = useState('');
  const [reason, setReason] = useState('');
  const [savingRole, setSavingRole] = useState(false);

  useEffect(() => {
    if (isOpen && member) {
      setActiveTab('profile');
      setNewRole(member.role || 'viewer');
      setReason('');
      
      const canSeeGiving = ['super_admin', 'church_admin', 'finance_admin'].includes(userProfile?.role?.toLowerCase());
      if (canSeeGiving && member.name) {
        fetchGivingHistory(member.name);
      }
      if (member.id) {
        fetchAttendanceHistory(member.id);
      }
    }
  }, [isOpen, member, userProfile]);

  const fetchGivingHistory = async (name) => {
    setLoadingGiving(true);
    try {
      const q = query(collection(db, 'giving'), where('donorName', '==', name));
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort latest first
      setGivingHistory(docs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingGiving(false);
    }
  };

  const fetchAttendanceHistory = async (memberId) => {
    setLoadingAttendance(true);
    try {
      // Use a collectionGroup query to find records across all sessions
      const q = query(collectionGroup(db, 'records'), where('memberId', '==', memberId));
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort by timestamp descending
      docs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setAttendanceHistory(docs);
    } catch (e) {
      console.error("Error fetching attendance, you may need to build an index:", e);
    } finally {
      setLoadingAttendance(false);
    }
  };

  if (!isOpen || !member) return null;

  const canSeeGiving = ['super_admin', 'church_admin', 'finance_admin'].includes(userProfile?.role?.toLowerCase());
  
  const calculateAge = (birthday) => {
    if (!birthday) return 'N/A';
    const ageDifMs = Date.now() - new Date(birthday).getTime();
    const ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const myRole = userProfile?.role?.toLowerCase() || 'viewer';
  
  const canAssignRole = (role) => {
    if (myRole === 'super_admin') return true;
    if (myRole === 'church_admin') return role !== 'super_admin';
    return false;
  };

  const availableRoles = SYSTEM_ROLES.filter(canAssignRole);
  const canManageRoles = ['super_admin', 'church_admin'].includes(myRole);

  const handleSaveRole = async () => {
    if (member.id === userProfile?.uid) {
      alert("You cannot change your own role.");
      return;
    }
    setSavingRole(true);
    try {
      const userRef = doc(db, 'users', member.id);
      await updateDoc(userRef, {
        role: newRole,
        roleUpdatedBy: userProfile.uid,
        roleUpdatedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await logRoleChange(
        member.churchId || userProfile.churchId,
        member.id,
        member.role,
        newRole,
        userProfile.uid,
        reason
      );

      // We mutate member object directly for immediate UI update, or let parent handle refresh
      member.role = newRole;
      alert("Role updated successfully.");
      setReason('');
    } catch (e) {
      console.error(e);
      alert("Failed to update role. Please ensure you have permissions.");
    } finally {
      setSavingRole(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-church-soft overflow-hidden flex flex-col my-8 max-h-[90vh]">
        
        {/* Header / Cover */}
        <div className="bg-church-navy text-white relative">
          <div className="absolute top-4 right-4 z-10">
            <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="p-8 pb-0 flex items-end">
            <div className="w-24 h-24 rounded-full border-4 border-white bg-church-green flex items-center justify-center text-3xl font-bold text-white shadow-md relative translate-y-6">
              {member.name?.charAt(0) || 'U'}
            </div>
            <div className="ml-6 mb-2">
              <h1 className="text-3xl font-bold">{member.name}</h1>
              <div className="flex items-center text-church-slate mt-1 space-x-3">
                <span className="flex items-center"><Mail size={14} className="mr-1"/> {member.email}</span>
                {member.phone && <span className="flex items-center"><Phone size={14} className="mr-1"/> {member.phone}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-8 mt-10 border-b border-gray-100 flex space-x-6">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`pb-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'profile' ? 'border-church-green text-church-green' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            Profile Details
          </button>
          <button 
            onClick={() => setActiveTab('ministry')}
            className={`pb-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'ministry' ? 'border-church-green text-church-green' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            Ministry & Discipleship
          </button>
          <button 
            onClick={() => setActiveTab('attendance')}
            className={`pb-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'attendance' ? 'border-church-green text-church-green' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            Attendance
          </button>
          {canSeeGiving && (
            <button 
              onClick={() => setActiveTab('giving')}
              className={`pb-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'giving' ? 'border-church-green text-church-green' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              Giving History
            </button>
          )}
          <button 
            onClick={() => setActiveTab('access')}
            className={`pb-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'access' ? 'border-church-green text-church-green' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            Access & Role
          </button>
        </div>

        {/* Content Area */}
        <div className="p-8 flex-1 overflow-y-auto bg-gray-50/50">
          
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="text-sm font-bold text-church-green uppercase tracking-wider mb-4 flex items-center">
                    <User size={16} className="mr-2" /> Demographics
                  </h3>
                  <dl className="space-y-3">
                    <div className="grid grid-cols-3"><dt className="text-sm text-gray-500">Gender</dt><dd className="col-span-2 text-sm font-medium text-church-navy">{member.gender || 'Not specified'}</dd></div>
                    <div className="grid grid-cols-3"><dt className="text-sm text-gray-500">Birthday</dt><dd className="col-span-2 text-sm font-medium text-church-navy">{member.birthday || 'Not specified'}</dd></div>
                    <div className="grid grid-cols-3"><dt className="text-sm text-gray-500">Age</dt><dd className="col-span-2 text-sm font-medium text-church-navy">{calculateAge(member.birthday)}</dd></div>
                    <div className="grid grid-cols-3"><dt className="text-sm text-gray-500">Address</dt><dd className="col-span-2 text-sm font-medium text-church-navy">{member.address || 'Not specified'}</dd></div>
                  </dl>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="text-sm font-bold text-church-green uppercase tracking-wider mb-4 flex items-center">
                    <Phone size={16} className="mr-2" /> Emergency Contact
                  </h3>
                  {member.emergencyContact ? (
                    <p className="text-sm font-medium text-church-navy">{member.emergencyContact}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No emergency contact provided.</p>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="text-sm font-bold text-church-green uppercase tracking-wider mb-4 flex items-center">
                    <CheckCircle size={16} className="mr-2" /> Church Status
                  </h3>
                  <dl className="space-y-3">
                    <div className="grid grid-cols-3"><dt className="text-sm text-gray-500">Status</dt>
                      <dd className="col-span-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          member.membershipStatus === 'Active' ? 'bg-green-100 text-green-800' : 
                          member.membershipStatus === 'Fellowship' ? 'bg-emerald-100 text-emerald-800' : 
                          (member.membershipStatus === 'Visitor') ? 'bg-blue-100 text-blue-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {member.membershipStatus || 'Active'}
                        </span>
                      </dd>
                    </div>
                    <div className="grid grid-cols-3"><dt className="text-sm text-gray-500">Role</dt>
                      <dd className="col-span-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 capitalize">
                          {member.role?.replace('_', ' ') || 'Member'}
                        </span>
                      </dd>
                    </div>
                    <div className="grid grid-cols-3"><dt className="text-sm text-gray-500">Baptism</dt><dd className="col-span-2 text-sm font-medium text-church-navy">{member.baptismStatus || 'Not specified'}</dd></div>
                    <div className="grid grid-cols-3"><dt className="text-sm text-gray-500">Joined</dt><dd className="col-span-2 text-sm font-medium text-church-navy">{member.createdAt?.toDate ? member.createdAt.toDate().toLocaleDateString() : 'N/A'}</dd></div>
                  </dl>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="text-sm font-bold text-church-green uppercase tracking-wider mb-4 flex items-center">
                    <HeartHandshake size={16} className="mr-2" /> Notes
                  </h3>
                  <p className="text-sm text-church-navy whitespace-pre-wrap">{member.notes || 'No notes available.'}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'access' && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-2xl mx-auto space-y-6">
              <div>
                <h2 className="text-lg font-bold text-church-navy">System Access</h2>
                <p className="text-sm text-gray-500">Manage what this user can access in the admin portal.</p>
              </div>

              {canManageRoles ? (
                <div className="space-y-6">
                  <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl text-sm flex items-start border border-yellow-200">
                    <p>
                      You are about to change this user's system role. This may change what they can access in the admin portal.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-church-navy mb-2">System Role</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      disabled={member.id === userProfile?.uid}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green bg-white capitalize disabled:bg-gray-100"
                    >
                      {availableRoles.map(role => (
                        <option key={role} value={role}>{role.replace('_', ' ')}</option>
                      ))}
                    </select>
                    {member.id === userProfile?.uid && (
                      <p className="text-xs text-red-500 mt-1">You cannot change your own role.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-church-navy mb-2">Reason for Change (Optional)</label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Why is this role being changed?"
                      rows="2"
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green resize-none"
                    />
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={handleSaveRole}
                      disabled={savingRole || newRole === member.role || member.id === userProfile?.uid}
                      className="px-6 py-2 bg-church-navy text-white rounded-full font-bold text-sm hover:bg-church-navy/90 transition-colors disabled:opacity-50"
                    >
                      {savingRole ? 'Saving...' : 'Update Role'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 text-blue-700 capitalize font-bold text-lg mb-4 border border-blue-100">
                    {member.role?.replace('_', ' ') || 'Viewer'}
                  </div>
                  <p className="text-gray-500">You do not have permission to change system roles.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'ministry' && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center space-y-4">
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <HeartHandshake size={32} />
              </div>
              <h2 className="text-lg font-bold text-church-navy">Family Group & Ministries</h2>
              <p className="text-sm text-church-slate max-w-md mx-auto">
                {member.name} is part of the <strong>{member.familyGroup || 'General'}</strong> family group.
              </p>
              
              {/* Future Expansion: Query `ministries` collection where members array includes this member's ID */}
              <div className="mt-8 p-6 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-sm text-gray-500 italic">Ministry assignments are managed globally from the Ministries module. Syncing specific ministry assignments to the profile view is coming soon.</p>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-sm font-bold text-church-green uppercase tracking-wider flex items-center">
                  <ClipboardCheck size={16} className="mr-2" /> Attendance History
                </h3>
              </div>
              
              {loadingAttendance ? (
                <div className="p-8 text-center text-gray-500">Loading records...</div>
              ) : attendanceHistory.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No attendance records found for {member.name}.</div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {attendanceHistory.map(record => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-church-slate">{new Date(record.timestamp).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-sm font-medium">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            record.status === 'Present' ? 'bg-green-100 text-green-700' : 
                            record.status === 'Absent' ? 'bg-red-100 text-red-700' :
                            record.status === 'Late' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'giving' && canSeeGiving && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-sm font-bold text-church-green uppercase tracking-wider flex items-center">
                  <CreditCard size={16} className="mr-2" /> Giving Records
                </h3>
                <div className="text-sm font-bold text-church-navy">
                  Total: ₱{givingHistory.reduce((sum, r) => sum + (r.amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
              
              {loadingGiving ? (
                <div className="p-8 text-center text-gray-500">Loading records...</div>
              ) : givingHistory.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No giving records found under the exact name "{member.name}".</div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Fund</th>
                      <th className="px-6 py-3">Method</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {givingHistory.map(record => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-church-slate">{new Date(record.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-sm font-medium text-church-navy">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            {record.fundType}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-church-slate">{record.method}</td>
                        <td className="px-6 py-4 text-sm font-bold text-green-600 text-right">
                          ₱{(record.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
