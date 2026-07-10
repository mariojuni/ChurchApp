import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { ArrowLeft, Users, Shield, Calendar, Plus, MoreVertical, Trash2, Edit, BookOpen, Monitor, Mic, Guitar, Drum, Piano, GraduationCap, Music, Heart, Star, Settings } from 'lucide-react';
import AssignMemberModal from './AssignMemberModal';
import MinistryFormModal from './MinistryFormModal';

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

const ICON_COLORS = {
  '#E0E7FF': '#818CF8', // Indigo
  '#E8F0FF': '#4D8BFF', // Blue
  '#F3F4F6': '#6B7280', // Gray
  '#FFE8F0': '#FF6596', // Pink
  '#FEF3C7': '#F59E0B', // Amber
  '#FEE2E2': '#EF4444', // Red
  '#D1FAE5': '#10B981', // Emerald
  '#F3EEFF': '#8B6FE8', // Purple
};

export default function MinistryDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [ministry, setMinistry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('roster');
  
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [activeMenuId, setActiveMenuId] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'ministries', id), (docSnap) => {
      if (docSnap.exists()) {
        setMinistry({ id: docSnap.id, ...docSnap.data() });
      } else {
        // Ministry not found or deleted
        navigate('/admin/ministries');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id, navigate]);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading ministry details...</div>;
  if (!ministry) return null;

  const members = ministry.members || [];
  
  // Basic stats
  const totalMembers = members.length;

  const handleRemoveMember = async (memberToRemove) => {
    if (window.confirm(`Remove ${memberToRemove.memberName} from ${ministry.name}?`)) {
      try {
        const updatedMembers = members.filter(m => m.memberId !== memberToRemove.memberId);
        await updateDoc(doc(db, 'ministries', ministry.id), {
          members: updatedMembers,
          updatedAt: new Date()
        });
      } catch (err) {
        console.error(err);
        alert("Failed to remove member");
      }
    }
  };

  const handleToggleLeader = async (memberId, makeLeader) => {
    try {
      let currentLeaders = ministry.leaderIds || [];
      if (makeLeader) {
        if (!currentLeaders.includes(memberId)) currentLeaders = [...currentLeaders, memberId];
      } else {
        currentLeaders = currentLeaders.filter(id => id !== memberId);
      }
      await updateDoc(doc(db, 'ministries', ministry.id), {
        leaderIds: currentLeaders,
        updatedAt: new Date()
      });
    } catch (err) {
      console.error(err);
      alert("Failed to update leader status");
    }
  };

  const handleSetServingRole = async (member) => {
    const newRole = window.prompt("Enter serving role (e.g. Drummer, Vocalist):", member.servingRole || '');
    if (newRole !== null) {
      try {
        const updatedMembers = members.map(m => 
          m.memberId === member.memberId ? { ...m, servingRole: newRole.trim() } : m
        );
        await updateDoc(doc(db, 'ministries', ministry.id), {
          members: updatedMembers,
          updatedAt: new Date()
        });
      } catch (err) {
        console.error(err);
        alert("Failed to update serving role");
      }
    }
  };

  const toggleMenu = (memberId) => {
    setActiveMenuId(activeMenuId === memberId ? null : memberId);
  };

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <button 
        onClick={() => navigate('/admin/ministries')}
        className="flex items-center text-sm font-bold text-gray-400 hover:text-church-navy transition-colors"
      >
        <ArrowLeft size={16} className="mr-1" /> Back to Ministries
      </button>

      {/* Header */}
      <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 overflow-hidden relative">
        <div className="bg-church-navy px-8 py-10 relative">
          <div className="absolute top-6 right-6 flex space-x-3">
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm font-bold transition-colors"
            >
              Edit Details
            </button>
          </div>

          <div className="flex items-center text-white">
            <div className="w-16 h-16 bg-church-green rounded-2xl flex items-center justify-center shadow-lg">
              <Shield size={32} />
            </div>
            <div className="ml-5">
              <h1 className="text-3xl font-bold">{ministry.name}</h1>
              <p className="text-gray-300 mt-1 max-w-2xl">{ministry.description || 'No description'}</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-8 border-b border-gray-100 flex space-x-6 pt-4">
          <button 
            onClick={() => setActiveTab('roster')}
            className={`pb-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'roster' ? 'border-church-green text-church-green' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            Team Roster
          </button>
          <button 
            onClick={() => setActiveTab('schedule')}
            className={`pb-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'schedule' ? 'border-church-green text-church-green' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            Schedules
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'roster' && (
            <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-bold text-church-navy">Volunteers & Leaders</h3>
                <button 
                  onClick={() => setIsAssignModalOpen(true)}
                  className="flex items-center px-4 py-2 bg-church-navy text-white rounded-full shadow-sm text-sm font-bold hover:bg-church-navy/90 transition-opacity"
                >
                  <Plus size={16} className="mr-2" />
                  Assign Member
                </button>
              </div>

              {members.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="flex justify-center text-gray-300 mb-4"><Users size={40} /></div>
                  <p className="text-church-navy font-bold text-lg">No members assigned</p>
                  <p className="text-church-slate text-sm">Assign someone to this ministry to start building your team.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-gray-100 text-xs font-bold text-church-slate uppercase tracking-wider">
                      <th className="p-4 pl-6">Member Name</th>
                      <th className="p-4 text-right pr-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {members.map(member => (
                      <tr key={member.memberId} className="hover:bg-gray-50/50 group">
                        <td className="p-4 pl-6">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-church-green/10 flex items-center justify-center text-church-green font-bold text-sm uppercase shrink-0">
                              {member.memberName?.charAt(0) || 'U'}
                            </div>
                            <div className="ml-3">
                              <span className="font-bold text-church-navy">{member.memberName}</span>
                              {(ministry.leaderIds || []).includes(member.memberId) && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
                                  Leader
                               </span>
                              )}
                              <div className="text-xs text-gray-500 mt-0.5">{member.servingRole || 'Volunteer'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-right pr-6 relative">
                          <button 
                            onClick={() => toggleMenu(member.memberId)}
                            className="text-gray-400 hover:text-church-navy p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <MoreVertical size={20} />
                          </button>
                          
                          {activeMenuId === member.memberId && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                              <div className="absolute right-8 top-10 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1 text-left">
                                <button 
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    handleToggleLeader(member.memberId, !(ministry.leaderIds || []).includes(member.memberId));
                                  }}
                                  className="w-full flex items-center px-4 py-2 text-sm font-medium text-church-navy hover:bg-gray-50"
                                >
                                  <Shield size={16} className="mr-2" /> {(ministry.leaderIds || []).includes(member.memberId) ? 'Remove Leader' : 'Make Leader'}
                                </button>
                                <button 
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    handleSetServingRole(member);
                                  }}
                                  className="w-full flex items-center px-4 py-2 text-sm font-medium text-church-navy hover:bg-gray-50"
                                >
                                  <Edit size={16} className="mr-2" /> Set Serving Role
                                </button>
                                <div className="border-t border-gray-100 my-1"></div>
                                <button 
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    handleRemoveMember(member);
                                  }}
                                  className="w-full flex items-center px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 size={16} className="mr-2" /> Remove
                                </button>
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 p-16 text-center">
               <div className="flex justify-center text-gray-300 mb-4"><Calendar size={40} /></div>
                <p className="text-church-navy font-bold text-lg">Scheduling Coming Soon</p>
                <p className="text-church-slate text-sm max-w-md mx-auto mt-2">
                  We will be linking the Events module here so you can schedule specific members of {ministry.name} for upcoming services!
                </p>
            </div>
          )}
        </div>

        {/* Right column: Quick Stats / Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-church-green uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Ministry Snapshot</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Status</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${ministry.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                  {ministry.status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Total Members</span>
                <span className="text-sm font-bold text-church-navy">{totalMembers}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-church-green uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Available Roles</h3>
            <div className="flex flex-wrap gap-2">
              {ministry.roles?.map(role => {
                const customDetails = ministry.roleDetails?.[role];
                const bg = customDetails?.color || getRoleBg(role);
                const iconName = customDetails?.icon;
                const iconColor = ICON_COLORS[bg] || '#6B7280';
                const SelectedIconComp = iconName ? AVAILABLE_ICONS.find(i => i.name === iconName)?.Icon : null;
                const iconNode = SelectedIconComp ? <SelectedIconComp size={16} color={iconColor} /> : getRoleIcon(role);

                return (
                  <div 
                    key={role} 
                    className="flex items-center px-3 py-1.5 rounded-full text-sm font-medium shadow-sm border border-black/5"
                    style={{ backgroundColor: bg }}
                  >
                    <span className="mr-2 opacity-80">{iconNode}</span>
                    <span className="text-gray-800">{role}</span>
                  </div>
                );
              })}
              {(!ministry.roles || ministry.roles.length === 0) && (
                <span className="text-sm text-gray-400 italic">No custom roles defined.</span>
              )}
            </div>
          </div>
        </div>

      </div>

      <AssignMemberModal 
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        ministry={ministry}
      />
      
      <MinistryFormModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        ministry={ministry}
      />
    </div>
  );
}
