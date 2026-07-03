import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

export default function ChurchFormModal({ isOpen, onClose, church = null }) {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    email: '',
    phone: '',
    status: 'Active'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (church) {
      setFormData({
        name: church.name || '',
        address: church.address || '',
        email: church.contact?.email || '',
        phone: church.contact?.phone || '',
        status: church.status || 'Active'
      });
    } else {
      setFormData({ name: '', address: '', email: '', phone: '', status: 'Active' });
    }
  }, [church, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        address: formData.address,
        contact: { email: formData.email, phone: formData.phone },
        status: formData.status,
      };

      if (church) {
        await updateDoc(doc(db, 'churches', church.id), {
          ...payload,
          updatedAt: serverTimestamp(),
          updatedBy: currentUser?.uid || null
        });
      } else {
        await addDoc(collection(db, 'churches'), {
          ...payload,
          createdAt: serverTimestamp(),
          createdBy: currentUser?.uid || null
        });
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save church.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-church-soft overflow-hidden flex flex-col my-8 max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-church-navy">{church ? 'Edit Tenant' : 'New Church Tenant'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:bg-gray-50 p-2 rounded-full"><X size={20} /></button>
        </div>
        
        <form id="church-form" onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-church-navy mb-1">Church Name *</label>
            <input type="text" name="name" required value={formData.name} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-church-green focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-church-navy mb-1">Address</label>
            <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-church-green focus:border-transparent" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-church-navy mb-1">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-church-green focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-church-navy mb-1">Phone</label>
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-church-green focus:border-transparent" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-church-navy mb-1">Status</label>
            <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-church-green focus:border-transparent">
              <option value="Active">Active</option>
              <option value="Disabled">Disabled</option>
            </select>
          </div>
        </form>

        <div className="p-6 border-t border-gray-100 flex justify-end space-x-3 bg-gray-50">
          <button type="button" onClick={onClose} disabled={loading} className="px-5 py-2.5 bg-white border border-gray-300 rounded-full text-sm font-bold text-church-slate hover:bg-gray-100">
            Cancel
          </button>
          <button type="submit" form="church-form" disabled={loading} className="px-6 py-2.5 bg-church-green text-white rounded-full text-sm font-bold hover:bg-church-green/90 shadow-md">
            {loading ? 'Saving...' : 'Save Church'}
          </button>
        </div>
      </div>
    </div>
  );
}
