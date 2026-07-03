import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

export default function MemberFormModal({ isOpen, onClose, member = null }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'member',
    familyGroup: '',
    birthday: '',
    gender: 'Male',
    address: '',
    membershipStatus: 'Active',
    baptismStatus: 'Not Baptized',
    emergencyContact: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name || '',
        email: member.email || '',
        phone: member.phone || '',
        role: member.role || 'member',
        familyGroup: member.familyGroup || '',
        birthday: member.birthday || '',
        gender: member.gender || 'Male',
        address: member.address || '',
        membershipStatus: member.membershipStatus || 'Active',
        baptismStatus: member.baptismStatus || 'Not Baptized',
        emergencyContact: member.emergencyContact || '',
        notes: member.notes || ''
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: 'member',
        familyGroup: '',
        birthday: '',
        gender: 'Male',
        address: '',
        membershipStatus: 'Active',
        baptismStatus: 'Not Baptized',
        emergencyContact: '',
        notes: ''
      });
    }
    setError('');
  }, [member, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (member) {
        // Update existing member
        const docRef = doc(db, 'users', member.id);
        await updateDoc(docRef, {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        // Add new member profile
        await addDoc(collection(db, 'users'), {
          ...formData,
          createdAt: serverTimestamp(),
          churchId: 'casubiduan' 
        });
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save member data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-church-soft overflow-hidden flex flex-col my-8 max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-church-navy">{member ? 'Edit Member' : 'Add New Member'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 p-2 rounded-full">
            <X size={20} />
          </button>
        </div>
        
        <div className="overflow-y-auto flex-1">
          <form id="member-form" onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
            
            {/* Personal Details */}
            <div>
              <h3 className="text-sm font-bold text-church-green uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Personal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-church-navy mb-1">Full Name *</label>
                  <input type="text" name="name" required value={formData.name} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-1">Birthday</label>
                  <input type="date" name="birthday" value={formData.birthday} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-1">Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow bg-white">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-sm font-bold text-church-green uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-1">Email *</label>
                  <input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-1">Phone Number</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-church-navy mb-1">Address</label>
                  <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow" />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-church-navy mb-1">Emergency Contact (Name & Phone)</label>
                  <input type="text" name="emergencyContact" value={formData.emergencyContact} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow" />
                </div>
              </div>
            </div>

            {/* Church Information */}
            <div>
              <h3 className="text-sm font-bold text-church-green uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Church Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-1">Status</label>
                  <select name="membershipStatus" value={formData.membershipStatus} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow bg-white">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Visitor">Visitor</option>
                    <option value="Fellowship">Fellowship</option>
                    <option value="Transferred">Transferred</option>
                    <option value="Deceased">Deceased</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-1">System Role</label>
                  <select name="role" value={formData.role} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow bg-white">
                    <option value="member">Member</option>
                    <option value="ministry_leader">Ministry Leader</option>
                    <option value="pastor">Pastor</option>
                    <option value="secretary">Secretary</option>
                    <option value="finance_admin">Finance Admin</option>
                    <option value="church_admin">Church Admin</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-1">Baptism Status</label>
                  <select name="baptismStatus" value={formData.baptismStatus} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow bg-white">
                    <option value="Not Baptized">Not Baptized</option>
                    <option value="Baptized">Baptized</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-1">Family / Small Group</label>
                  <input type="text" name="familyGroup" value={formData.familyGroup} onChange={handleChange} placeholder="e.g. Grace Group" className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow" />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <h3 className="text-sm font-bold text-church-green uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Notes</h3>
              <textarea name="notes" rows="3" value={formData.notes} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow resize-none" placeholder="Any additional notes..."></textarea>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end space-x-3 bg-gray-50">
          <button type="button" onClick={onClose} disabled={loading} className="px-5 py-2.5 bg-white border border-gray-300 rounded-full text-sm font-bold text-church-slate hover:bg-gray-100 transition-colors">
            Cancel
          </button>
          <button type="submit" form="member-form" disabled={loading} className="px-6 py-2.5 bg-church-green text-white rounded-full text-sm font-bold hover:bg-church-green/90 transition-colors disabled:opacity-50 shadow-md">
            {loading ? 'Saving...' : 'Save Member Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}
