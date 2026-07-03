import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Users, BookOpen, Monitor, Mic, Guitar, Drum, Piano, GraduationCap, Shield, Music, Heart, Star, Settings, Check } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

const normalizeRole = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

const getRoleIcon = (roleName) => {
  const norm = normalizeRole(roleName);
  switch(norm) {
    case 'openingprayer': return <Users size={16} color="#818CF8" />;
    case 'tithesofferingprayer': return <BookOpen size={16} color="#4D8BFF" />;
    case 'techaudio': 
    case 'tech': 
    case 'audio': return <Monitor size={16} color="#6B7280" />;
    case 'presider': return <Users size={16} color="#FF6596" />;
    case 'scripturereading': return <BookOpen size={16} color="#F59E0B" />;
    case 'preacher': return <Mic size={16} color="#FF6596" />;
    case 'vocalist': return <Mic size={16} color="#818CF8" />;
    case 'bassguitar': return <Guitar size={16} color="#4D8BFF" />;
    case 'drummer': return <Drum size={16} color="#EF4444" />;
    case 'piano': return <Piano size={16} color="#10B981" />;
    case 'electricguitar': return <Guitar size={16} color="#F59E0B" />;
    case 'kids': return <GraduationCap size={16} color="#F59E0B" />;
    case 'youth': return <GraduationCap size={16} color="#4D8BFF" />;
    case 'adults': return <GraduationCap size={16} color="#10B981" />;
    default: return <Users size={16} color="#9CA3AF" />;
  }
};

const getRoleBg = (roleName) => {
  const norm = normalizeRole(roleName);
  switch(norm) {
    case 'openingprayer': return '#E0E7FF';
    case 'tithesofferingprayer': return '#E8F0FF';
    case 'techaudio': 
    case 'tech': 
    case 'audio': return '#F3F4F6';
    case 'presider': return '#FFE8F0';
    case 'scripturereading': return '#FEF3C7';
    case 'preacher': return '#FFE8F0';
    case 'vocalist': return '#E0E7FF';
    case 'bassguitar': return '#E8F0FF';
    case 'drummer': return '#FEE2E2';
    case 'piano': return '#D1FAE5';
    case 'electricguitar': return '#FEF3C7';
    case 'kids': return '#FEF3C7';
    case 'youth': return '#E8F0FF';
    case 'adults': return '#D1FAE5';
    default: return '#F3F4F6';
  }
};

const PALETTE = [
  '#E0E7FF', '#E8F0FF', '#F3F4F6', '#FFE8F0', '#FEF3C7', '#FEE2E2', '#D1FAE5', '#F3EEFF'
];

const AVAILABLE_ICONS = [
  { name: 'Users', Icon: Users },
  { name: 'Shield', Icon: Shield },
  { name: 'Mic', Icon: Mic },
  { name: 'Monitor', Icon: Monitor },
  { name: 'BookOpen', Icon: BookOpen },
  { name: 'Guitar', Icon: Guitar },
  { name: 'Drum', Icon: Drum },
  { name: 'Piano', Icon: Piano },
  { name: 'GraduationCap', Icon: GraduationCap },
  { name: 'Music', Icon: Music },
  { name: 'Heart', Icon: Heart },
  { name: 'Star', Icon: Star },
  { name: 'Settings', Icon: Settings },
];

export default function MinistryFormModal({ isOpen, onClose, ministry = null }) {
  const { userProfile } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'Active',
    roles: ['Leader', 'Member'],
    roleDetails: {}
  });
  const [newRole, setNewRole] = useState('');
  const [selectedColor, setSelectedColor] = useState(PALETTE[0]);
  const [selectedIcon, setSelectedIcon] = useState('Users');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ministry) {
      setFormData({
        name: ministry.name || '',
        description: ministry.description || '',
        status: ministry.status || 'Active',
        roles: ministry.roles || ['Leader', 'Member'],
        roleDetails: ministry.roleDetails || {}
      });
    } else {
      setFormData({
        name: '',
        description: '',
        status: 'Active',
        roles: ['Leader', 'Member'],
        roleDetails: {}
      });
    }
    setError('');
    setNewRole('');
    setSelectedColor(PALETTE[0]);
    setSelectedIcon('Users');
  }, [ministry, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddRole = (e) => {
    e.preventDefault();
    if (newRole.trim() && !formData.roles.includes(newRole.trim())) {
      const roleName = newRole.trim();
      setFormData(prev => ({
        ...prev,
        roles: [...prev.roles, roleName],
        roleDetails: {
          ...prev.roleDetails,
          [roleName]: { color: selectedColor, icon: selectedIcon }
        }
      }));
      setNewRole('');
    }
  };

  const handleRemoveRole = (roleToRemove) => {
    setFormData(prev => {
      const newRoleDetails = { ...prev.roleDetails };
      delete newRoleDetails[roleToRemove];
      return {
        ...prev,
        roles: prev.roles.filter(r => r !== roleToRemove),
        roleDetails: newRoleDetails
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (ministry) {
        await updateDoc(doc(db, 'ministries', ministry.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'ministries'), {
          ...formData,
          members: [],
          createdAt: serverTimestamp(),
          churchId: userProfile?.churchId || 'YmEc6C69Xz4DKRQaQZBV' 
        });
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save ministry data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-church-soft overflow-hidden flex flex-col my-8">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-church-navy">{ministry ? 'Edit Ministry' : 'Create Ministry'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors bg-white p-2 rounded-full shadow-sm">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 overflow-y-auto">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium text-church-navy mb-1">Ministry Name *</label>
            <input type="text" name="name" required value={formData.name} onChange={handleChange} placeholder="e.g. Praise and Worship" className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green" />
          </div>

          <div>
            <label className="block text-sm font-medium text-church-navy mb-1">Description</label>
            <textarea name="description" rows="3" value={formData.description} onChange={handleChange} placeholder="What is the purpose of this ministry?" className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green resize-none"></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-church-navy mb-1">Status</label>
            <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-church-green bg-white">
              <option value="Active">Active</option>
              <option value="Archived">Archived</option>
            </select>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <label className="block text-sm font-medium text-church-navy mb-2">Custom Roles</label>
            <p className="text-xs text-church-slate mb-3">Define the specific roles members can have in this ministry (e.g. Vocalist, Drummer, Sound Tech).</p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {formData.roles.map(role => {
                const customDetails = formData.roleDetails?.[role];
                const bg = customDetails?.color || getRoleBg(role);
                const iconName = customDetails?.icon;
                const SelectedIconComp = iconName ? AVAILABLE_ICONS.find(i => i.name === iconName)?.Icon : null;
                const iconNode = SelectedIconComp ? <SelectedIconComp size={16} color="#6B7280" /> : getRoleIcon(role);
                
                return (
                  <div 
                    key={role} 
                    className="flex items-center px-3 py-1.5 rounded-full text-sm font-medium shadow-sm border border-black/5"
                    style={{ backgroundColor: bg }}
                  >
                    <span className="mr-2 opacity-80">{iconNode}</span>
                    <span className="text-gray-800">{role}</span>
                    <button type="button" onClick={() => handleRemoveRole(role)} className="ml-2 text-gray-400 hover:text-gray-700 focus:outline-none transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div className="flex space-x-2">
                <input 
                  type="text" 
                  value={newRole} 
                  onChange={(e) => setNewRole(e.target.value)} 
                  placeholder="New Role Name" 
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-church-green"
                  onKeyDown={(e) => { if(e.key === 'Enter') handleAddRole(e); }}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Role Color</label>
                  <div className="flex flex-wrap gap-2">
                    {PALETTE.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className="w-6 h-6 rounded-full shadow-sm border border-black/10 flex items-center justify-center transition-transform hover:scale-110"
                        style={{ backgroundColor: color }}
                      >
                        {selectedColor === color && <Check size={12} color="#1F2937" />}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Role Icon</label>
                  <div className="flex items-center">
                    <select
                      value={selectedIcon}
                      onChange={(e) => setSelectedIcon(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-church-green bg-white mr-2"
                    >
                      {AVAILABLE_ICONS.map(icon => (
                        <option key={icon.name} value={icon.name}>{icon.name}</option>
                      ))}
                    </select>
                    {(() => {
                      const IconComp = AVAILABLE_ICONS.find(i => i.name === selectedIcon)?.Icon;
                      return IconComp ? <div className="w-8 h-8 flex flex-shrink-0 items-center justify-center bg-white border border-gray-200 rounded-lg"><IconComp size={16} color="#4B5563" /></div> : null;
                    })()}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button type="button" onClick={handleAddRole} className="px-4 py-2 bg-church-navy text-white rounded-lg text-sm font-bold shadow-sm hover:bg-church-navy/90">
                  Add Role
                </button>
              </div>
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-gray-100 flex justify-end space-x-3 bg-gray-50/50">
          <button type="button" onClick={onClose} disabled={loading} className="px-5 py-2.5 bg-white border border-gray-300 rounded-full text-sm font-bold text-church-slate hover:bg-gray-100 transition-colors">
            Cancel
          </button>
          <button type="submit" onClick={handleSubmit} disabled={loading} className="px-6 py-2.5 bg-church-green text-white rounded-full text-sm font-bold hover:bg-church-green/90 transition-colors disabled:opacity-50 shadow-md">
            {loading ? 'Saving...' : 'Save Ministry'}
          </button>
        </div>
      </div>
    </div>
  );
}
