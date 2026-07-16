import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import ModernDropdown from '../../components/ui/ModernDropdown';
import ModernDatePicker from '../../components/ui/ModernDatePicker';

export default function MemberFormModal({ isOpen, onClose, member = null }) {
  const { userProfile, currentUser } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
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
      const parts = (member.name || '').split(' ');
      const fallbackFirst = parts[0] || '';
      const fallbackLast = parts.length > 1 ? parts.slice(1).join(' ') : '';
      
      setFormData({
        firstName: member.firstName || fallbackFirst,
        middleName: member.middleName || '',
        lastName: member.lastName || fallbackLast,
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
        firstName: '',
        middleName: '',
        lastName: '',
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
      const computedName = [formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(' ');
      const dataToSave = {
        ...formData,
        name: computedName
      };

      if (member) {
        // Update existing member
        const docRef = doc(db, 'users', member.id);
        await updateDoc(docRef, {
          ...dataToSave,
          updatedAt: serverTimestamp(),
          updatedBy: currentUser?.uid || null
        });
      } else {
        // Add new member profile
        await addDoc(collection(db, 'users'), {
          ...dataToSave,
          createdAt: serverTimestamp(),
          createdBy: currentUser?.uid || null,
          churchId: userProfile?.churchId || 'YmEc6C69Xz4DKRQaQZBV' 
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
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-church-navy mb-1">First Name *</label>
                    <input type="text" name="firstName" required value={formData.firstName} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-church-navy mb-1">Middle Name</label>
                    <input type="text" name="middleName" value={formData.middleName} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-church-navy mb-1">Last Name *</label>
                    <input type="text" name="lastName" required value={formData.lastName} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-1">Birthday</label>
                  <ModernDatePicker 
                    name="birthday" 
                    value={formData.birthday} 
                    onChange={handleChange} 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-1">Gender</label>
                  <ModernDropdown
                    value={formData.gender}
                    onChange={(val) => handleChange({ target: { name: 'gender', value: val } })}
                    options={[
                      { value: 'Male', label: 'Male' },
                      { value: 'Female', label: 'Female' }
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-sm font-bold text-church-green uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-1">Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green focus:border-transparent transition-shadow" />
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
                  <ModernDropdown
                    value={formData.membershipStatus}
                    onChange={(val) => handleChange({ target: { name: 'membershipStatus', value: val } })}
                    options={[
                      { value: 'Active', label: 'Active' },
                      { value: 'Inactive', label: 'Inactive' },
                      { value: 'Visitor', label: 'Visitor' },
                      { value: 'Fellowship', label: 'Fellowship' },
                      { value: 'Transferred', label: 'Transferred' },
                      { value: 'Deceased', label: 'Deceased' },
                      { value: 'Archived', label: 'Archived' }
                    ]}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-1">System Role</label>
                  <ModernDropdown
                    value={formData.role}
                    onChange={(val) => handleChange({ target: { name: 'role', value: val } })}
                    options={[
                      { value: 'member', label: 'Member' },
                      { value: 'ministry_leader', label: 'Ministry Leader' },
                      { value: 'pastor', label: 'Pastor' },
                      { value: 'secretary', label: 'Secretary' },
                      { value: 'finance_admin', label: 'Finance Admin' },
                      { value: 'church_admin', label: 'Church Admin' }
                    ]}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-church-navy mb-1">Baptism Status</label>
                  <ModernDropdown
                    value={formData.baptismStatus}
                    onChange={(val) => handleChange({ target: { name: 'baptismStatus', value: val } })}
                    options={[
                      { value: 'Not Baptized', label: 'Not Baptized' },
                      { value: 'Baptized', label: 'Baptized' }
                    ]}
                  />
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
