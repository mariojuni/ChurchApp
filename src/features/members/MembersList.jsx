import React, { useEffect, useState, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import { Search, Plus, MoreVertical, Filter, Edit, Archive, Eye, UploadCloud, Users } from 'lucide-react';
import MemberFormModal from './MemberFormModal';
import MemberProfileModal from './MemberProfileModal';

export default function MembersList() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  
  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  
  // Action menu state
  const [activeMenuId, setActiveMenuId] = useState(null);
  
  // File upload ref
  const fileInputRef = useRef(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMembers(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredMembers = members.filter(m => {
    // Search match
    const searchMatch = 
      m.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phone?.includes(searchTerm);
      
    // Status match
    const statusMatch = filterStatus === 'All' 
      ? m.membershipStatus !== 'Archived' // Hide archived by default if "All" is selected
      : m.membershipStatus === filterStatus;

    // Exception: If they explicitly filter by Archived, show archived.
    if (filterStatus === 'Archived') {
      return searchMatch && m.membershipStatus === 'Archived';
    }

    return searchMatch && statusMatch;
  });

  const handleAddClick = () => {
    setSelectedMember(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (member) => {
    setSelectedMember(member);
    setIsFormOpen(true);
    setActiveMenuId(null);
  };

  const handleViewProfile = (member) => {
    setSelectedMember(member);
    setIsProfileOpen(true);
    setActiveMenuId(null);
  };

  const handleArchiveClick = async (member) => {
    setActiveMenuId(null);
    if (window.confirm(`Are you sure you want to archive ${member.name}? They will no longer appear in the active roster.`)) {
      try {
        await updateDoc(doc(db, 'users', member.id), {
          membershipStatus: 'Archived',
          updatedAt: new Date()
        });
      } catch (error) {
        console.error("Error archiving document: ", error);
        alert("Failed to archive member.");
      }
    }
  };

  const toggleMenu = (id) => {
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  // -------------------------------------------------------------
  // CSV Import Logic
  // -------------------------------------------------------------
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      await processCSV(text);
      setIsImporting(false);
      e.target.value = null; // reset
    };
    reader.readAsText(file);
  };

  const processCSV = async (text) => {
    try {
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const newRecords = [];
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',').map(v => v.trim());
        const record = {};
        headers.forEach((h, idx) => {
          record[h] = values[idx] || '';
        });
        
        // Map common CSV headers to our schema
        const newMember = {
          name: record.name || record['full name'] || '',
          email: record.email || '',
          phone: record.phone || record['contact number'] || '',
          role: 'member',
          membershipStatus: 'Active',
          churchId: 'casubiduan',
          createdAt: new Date()
        };

        if (newMember.name) {
          // Duplicate Check
          const isDup = members.some(m => 
            (m.email && newMember.email && m.email.toLowerCase() === newMember.email.toLowerCase()) ||
            (m.name.toLowerCase() === newMember.name.toLowerCase())
          );
          
          if (!isDup) {
            newRecords.push(newMember);
          }
        }
      }

      if (newRecords.length === 0) {
        alert("No valid new records found. They may be duplicates or missing required fields (Name).");
        return;
      }

      // Batch write to Firestore
      const batch = writeBatch(db);
      newRecords.forEach(record => {
        const docRef = doc(collection(db, 'users'));
        batch.set(docRef, record);
      });
      await batch.commit();

      alert(`Successfully imported ${newRecords.length} new members!`);
    } catch (err) {
      console.error(err);
      alert("Error parsing CSV file. Please ensure it has a header row like: name, email, phone");
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-church-navy">Members Directory</h1>
          <p className="text-sm text-church-slate mt-1">Manage church members, profiles, and data.</p>
        </div>
        <div className="flex items-center space-x-3">
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileUpload} 
          />
          <button 
            onClick={triggerFileInput}
            disabled={isImporting}
            className="flex items-center px-4 py-2.5 bg-white border border-gray-300 text-church-navy rounded-full shadow-sm text-sm font-bold hover:bg-gray-50 transition-opacity disabled:opacity-50"
          >
            <UploadCloud size={18} className="mr-2" />
            {isImporting ? 'Importing...' : 'Import CSV'}
          </button>
          
          <button 
            onClick={handleAddClick}
            className="flex items-center px-5 py-2.5 bg-church-green text-white rounded-full shadow-md text-sm font-bold hover:bg-church-green/90 transition-opacity"
          >
            <Plus size={18} className="mr-2" />
            Add Member
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-3xl shadow-church-soft border border-gray-100 overflow-hidden flex flex-col relative">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-4 flex-1">
            <div className="relative w-80">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-church-green"
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center border border-gray-300 rounded-full bg-white px-1 py-1 shadow-sm">
              <span className="text-xs font-bold text-gray-400 pl-3 pr-2 uppercase">Status:</span>
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-sm font-bold text-church-navy bg-transparent focus:outline-none pr-3 py-1 cursor-pointer"
              >
                <option value="All">Active & Inactive</option>
                <option value="Active">Active Only</option>
                <option value="Visitor">Visitors</option>
                <option value="Fellowship">Fellowship</option>
                <option value="Transferred">Transferred</option>
                <option value="Deceased">Deceased</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse min-h-[300px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-bold text-church-slate uppercase tracking-wider">
                <th className="p-4 pl-6">Member Details</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Status / Role</th>
                <th className="p-4">Group</th>
                <th className="p-4 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-church-slate">Loading members...</td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-16 text-center">
                    <div className="flex justify-center text-gray-300 mb-4"><Users size={40} /></div>
                    <p className="text-church-navy font-bold text-lg">No members found</p>
                    <p className="text-church-slate text-sm">Try adjusting your filters or search term.</p>
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-4 pl-6">
                      <div className="flex items-center cursor-pointer" onClick={() => handleViewProfile(member)}>
                        <div className="w-12 h-12 rounded-full bg-church-green/10 flex items-center justify-center text-church-green font-bold text-lg uppercase shrink-0">
                          {member.name?.charAt(0) || 'U'}
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-bold text-church-navy group-hover:text-church-green transition-colors">{member.name}</p>
                          <p className="text-xs text-church-slate">{member.gender || 'Unknown'} • {member.birthday ? new Date(member.birthday).toLocaleDateString() : 'No birthday'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-medium text-church-navy">{member.email}</p>
                      <p className="text-xs text-church-slate mt-0.5">{member.phone || '-'}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col items-start space-y-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                          member.membershipStatus === 'Active' ? 'bg-green-100 text-green-800' :
                          member.membershipStatus === 'Fellowship' ? 'bg-emerald-100 text-emerald-800' :
                          (member.membershipStatus === 'Archived' || member.membershipStatus === 'Deceased' || member.membershipStatus === 'Transferred') ? 'bg-gray-100 text-gray-600' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {member.membershipStatus || 'Active'}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-gray-400">
                          {member.role?.replace('_', ' ') || 'Member'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-sm font-medium text-church-navy">
                      {member.familyGroup || '-'}
                    </td>
                    <td className="p-4 text-right pr-6 relative">
                      <button 
                        onClick={() => toggleMenu(member.id)}
                        className="text-gray-400 hover:text-church-navy p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <MoreVertical size={20} />
                      </button>
                      
                      {activeMenuId === member.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setActiveMenuId(null)}
                          />
                          <div className="absolute right-8 top-10 mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1 text-left">
                            <button 
                              onClick={() => handleViewProfile(member)}
                              className="w-full flex items-center px-4 py-2 text-sm font-medium text-church-navy hover:bg-gray-50"
                            >
                              <Eye size={16} className="mr-2" /> View Profile
                            </button>
                            <button 
                              onClick={() => handleEditClick(member)}
                              className="w-full flex items-center px-4 py-2 text-sm font-medium text-church-navy hover:bg-gray-50"
                            >
                              <Edit size={16} className="mr-2" /> Edit Details
                            </button>
                            
                            {member.membershipStatus !== 'Archived' && (
                              <button 
                                onClick={() => handleArchiveClick(member)}
                                className="w-full flex items-center px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 border-t border-gray-50 mt-1"
                              >
                                <Archive size={16} className="mr-2" /> Archive
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white text-sm font-bold text-church-slate rounded-b-3xl">
          <div>Showing {filteredMembers.length} profiles</div>
        </div>
      </div>

      <MemberFormModal 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        member={selectedMember}
      />
      
      <MemberProfileModal 
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        member={selectedMember}
      />
    </div>
  );
}
