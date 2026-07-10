import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Shield, AlertCircle, Edit, Search } from 'lucide-react';
import { logRoleChange } from '../../utils/roleAudit';

const SYSTEM_ROLES = [
  'super_admin',
  'church_admin',
  'pastor',
  'ministry_leader',
  'finance_admin',
  'secretary',
  'viewer'
];

export default function SettingsUsersAndRoles() {
  const { userProfile, activeChurchId } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingUser, setEditingUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [activeChurchId]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('churchId', '==', activeChurchId || 'YmEc6C69Xz4DKRQaQZBV'));
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(docs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const myRole = userProfile?.role?.toLowerCase() || 'viewer';
  
  const canAssignRole = (role) => {
    if (myRole === 'super_admin') return true;
    if (myRole === 'church_admin') return role !== 'super_admin';
    return false;
  };

  const getAvailableRoles = () => {
    return SYSTEM_ROLES.filter(canAssignRole);
  };

  const handleEditClick = (user) => {
    if (user.id === userProfile?.uid) {
      alert("You cannot change your own role.");
      return;
    }
    setEditingUser(user);
    setNewRole(user.role || 'viewer');
    setReason('');
  };

  const handleSaveRole = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      // 1. Update user document
      const userRef = doc(db, 'users', editingUser.id);
      await updateDoc(userRef, {
        role: newRole,
        roleUpdatedBy: userProfile.uid,
        roleUpdatedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 2. Log audit
      await logRoleChange(
        editingUser.churchId || activeChurchId,
        editingUser.id,
        editingUser.role,
        newRole,
        userProfile.uid,
        reason
      );

      // Update local state
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, role: newRole } : u));
      setEditingUser(null);
    } catch (e) {
      console.error(e);
      alert("Failed to update role. Please ensure you have permissions.");
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-church-soft border border-gray-100 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-church-navy">Users & Roles</h1>
          <p className="text-sm text-church-slate">Manage system access levels for your team.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">System Role</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Last Updated</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-church-green text-white flex items-center justify-center font-bold text-sm mr-3">
                        {user.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div className="font-bold text-church-navy text-sm">{user.name || 'Unnamed User'}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize border border-blue-100">
                      <Shield size={12} className="mr-1" />
                      {user.role?.replace('_', ' ') || 'Viewer'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {user.roleUpdatedAt?.toDate ? user.roleUpdatedAt.toDate().toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleEditClick(user)}
                      className="text-gray-400 hover:text-church-navy transition-colors"
                      title="Edit Role"
                    >
                      <Edit size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    No users found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-church-soft overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-church-navy">Change System Role</h2>
              <p className="text-sm text-gray-500 mt-1">For {editingUser.name}</p>
            </div>
            
            <div className="p-6 space-y-4 bg-gray-50/50">
              <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl text-sm flex items-start border border-yellow-200">
                <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" />
                <p>
                  You are about to change this user's system role. This may change what they can access in the admin portal.
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-church-navy mb-2">New System Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green bg-white capitalize"
                >
                  {getAvailableRoles().map(role => (
                    <option key={role} value={role}>{role.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-church-navy mb-2">Reason (Optional)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why is this role being changed?"
                  rows="2"
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end space-x-3 bg-white">
              <button 
                onClick={() => setEditingUser(null)}
                disabled={saving}
                className="px-6 py-2.5 rounded-full font-bold text-gray-500 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveRole}
                disabled={saving}
                className="px-6 py-2.5 rounded-full font-bold text-white bg-church-navy hover:bg-church-navy/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Confirm Change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
