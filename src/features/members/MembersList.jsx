import React, { useEffect, useState, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, writeBatch, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Search, Plus, MoreVertical, Filter, Edit, Archive, Eye, UploadCloud, Users } from 'lucide-react';
import MemberFormModal from './MemberFormModal';
import MemberProfileModal from './MemberProfileModal';
import * as XLSX from 'xlsx';

export default function MembersList() {
  const { userProfile } = useAuth();
  const CHURCH_ID = userProfile?.churchId || 'YmEc6C69Xz4DKRQaQZBV';
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
    if (!CHURCH_ID) return;
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter in memory to support legacy records that don't have a churchId yet
      docs = docs.filter(d => d.churchId === CHURCH_ID || (!d.churchId && CHURCH_ID === 'YmEc6C69Xz4DKRQaQZBV'));
      
      // Format names: First Name Middle Initial Last Name (Title Case)
      docs = docs.map(d => {
        let displayName = d.name || '';
        
        const toTitleCase = (str) => {
          if (!str) return '';
          return str.split(/[\s-]+/).map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ');
        };

        if (d.firstName || d.lastName) {
            const f = toTitleCase(d.firstName);
            const l = toTitleCase(d.lastName);
            const m = d.middleName ? d.middleName.charAt(0).toUpperCase() + '.' : '';
            displayName = [f, m, l].filter(Boolean).join(' ');
        } else if (d.name) {
            const parts = d.name.split(' ').filter(Boolean);
            if (parts.length > 2) {
                const f = toTitleCase(parts[0]);
                const l = toTitleCase(parts[parts.length - 1]);
                const m = parts[1].charAt(0).toUpperCase() + '.';
                displayName = `${f} ${m} ${l}`;
            } else {
                displayName = toTitleCase(d.name);
            }
        }
        
        return { ...d, displayName };
      });
      
      docs.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
      setMembers(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile?.churchId]);

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
      const data = new Uint8Array(event.target.result);
      await processFile(data);
      setIsImporting(false);
      e.target.value = null; // reset
    };
    reader.readAsArrayBuffer(file);
  };

  const processFile = async (data) => {
    try {
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawArray = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
      
      // Find the header row (some Excel files have title rows at the top)
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(rawArray.length, 20); i++) {
        const rowString = rawArray[i].map(c => String(c || '').toLowerCase()).join('|');
        if (rowString.includes('name') || rowString.includes('first name') || rowString.includes('email')) {
          headerRowIndex = i;
          break;
        }
      }

      if (headerRowIndex === -1) {
         alert("Could not find a header row with 'Name', 'First Name', or 'Email'. Please make sure your column headers are correct.");
         return;
      }

      const headers = rawArray[headerRowIndex].map(h => String(h || '').trim().toLowerCase());
      const newRecords = [];
      const updateRecords = [];
      
      for (let i = headerRowIndex + 1; i < rawArray.length; i++) {
        const rowArray = rawArray[i];
        if (!rowArray || rowArray.length === 0) continue;
        
        const record = {};
        headers.forEach((h, idx) => {
          record[h] = rowArray[idx] !== undefined && rowArray[idx] !== null ? String(rowArray[idx]).trim() : '';
        });
        
        // Skip completely empty rows
        if (Object.values(record).every(v => !v)) continue;
        
        const firstName = record['first name'] || record.firstname || '';
        const middleName = record['middle name'] || record.middlename || '';
        const lastName = record['last name'] || record.lastname || '';
        
        // Combine names if they provided separate columns, or fallback to the full name column
        const computedName = [firstName, middleName, lastName].filter(Boolean).join(' ');
        
        const remarks = record.remarks || record.remark || '';
        let parsedStatus = 'Active';
        if (remarks) {
          const upperRemarks = remarks.toUpperCase();
          if (upperRemarks.includes('FULL MEMBER')) {
            parsedStatus = 'Active';
          } else if (upperRemarks.includes('INACTIVE')) {
            parsedStatus = 'Inactive';
          } else if (upperRemarks.includes('VISITOR')) {
            parsedStatus = 'Visitor';
          }
        }
        
        const baptizedVal = record.baptized || record.baptize || record.betized || record['baptism status'] || '';
        const parsedBaptism = baptizedVal.trim().toLowerCase() === 'yes' ? 'Baptized' : 'Not Baptized';
        
        const sexVal = record.sex || record.gender || '';
        let parsedGender = '';
        if (sexVal.trim().toLowerCase().startsWith('m')) parsedGender = 'Male';
        else if (sexVal.trim().toLowerCase().startsWith('f')) parsedGender = 'Female';
        else parsedGender = sexVal.trim();
        
        // We set raw: false in sheet_to_json, so dates should come as formatted strings
        let parsedBirthday = record.birthday || record.birthdate || record.dob || '';

        // Map common CSV headers to our schema
        const newMember = {
          firstName: firstName,
          middleName: middleName,
          lastName: lastName,
          name: computedName || record.name || record['full name'] || '',
          email: record.email || '',
          phone: record.phone || record['contact number'] || record['contact #'] || '',
          gender: parsedGender,
          birthday: parsedBirthday,
          role: 'member',
          membershipStatus: parsedStatus,
          baptismStatus: parsedBaptism,
          notes: remarks,
          churchId: userProfile?.churchId || 'YmEc6C69Xz4DKRQaQZBV',
          createdAt: new Date()
        };

        if (newMember.name) {
          // Duplicate Check
          const existingMember = members.find(m => 
            (m.email && newMember.email && m.email.toLowerCase() === newMember.email.toLowerCase()) ||
            (m.name && m.name.toLowerCase() === newMember.name.toLowerCase())
          );
          
          if (!existingMember) {
            newRecords.push(newMember);
          } else {
            // Update missing fields on existing member
            const updates = {};
            for (const [key, value] of Object.entries(newMember)) {
              if (value && (
                  !existingMember[key] || 
                  existingMember[key] === 'Not Baptized' || 
                  existingMember[key] === 'Unknown' ||
                  existingMember[key] === 'Active' // Might update status if it changed
              )) {
                // Prevent overwriting core fields
                if (key !== 'createdAt' && key !== 'churchId' && key !== 'role' && key !== 'name' && key !== 'membershipStatus') {
                  updates[key] = value;
                }
              }
            }
            
            // Special handling for membership status changes
            if (newMember.membershipStatus && newMember.membershipStatus !== 'Active' && existingMember.membershipStatus !== newMember.membershipStatus) {
                updates.membershipStatus = newMember.membershipStatus;
            }

            if (Object.keys(updates).length > 0) {
              updates.updatedAt = new Date();
              updateRecords.push({ id: existingMember.id, data: updates });
            }
          }
        }
      }

      if (newRecords.length === 0 && updateRecords.length === 0) {
        alert(`Found ${rawArray.length - headerRowIndex - 1} data rows, but all members are already perfectly up-to-date!`);
        return;
      }

      // Batch write to Firestore
      const batch = writeBatch(db);
      newRecords.forEach(record => {
        const docRef = doc(collection(db, 'users'));
        batch.set(docRef, record);
      });
      updateRecords.forEach(record => {
        const docRef = doc(db, 'users', record.id);
        batch.update(docRef, record.data);
      });
      await batch.commit();

      alert(`Successfully imported ${newRecords.length} new members and updated ${updateRecords.length} existing members!`);
    } catch (err) {
      console.error(err);
      alert("Error parsing file. Please ensure it has a header row like: first name, middle name, last name, email, phone");
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-church-navy">Members Directory</h1>
          <p className="text-sm text-church-slate mt-1">Manage church members, profiles, and data.</p>
        </div>
        <div className="flex items-center space-x-3">
          <input 
            type="file" 
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
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
            {isImporting ? 'Importing...' : 'Import Data'}
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

      <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 flex-1 flex flex-col min-h-0 overflow-hidden">
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
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="border-b border-gray-200 text-xs font-bold text-church-slate uppercase tracking-wider">
                <th className="p-4 pl-6 bg-gray-50">Member Details</th>
                <th className="p-4 bg-gray-50">Contact</th>
                <th className="p-4 bg-gray-50">Status / Role</th>
                <th className="p-4 bg-gray-50">Group</th>
                <th className="p-4 text-right pr-6 bg-gray-50">Actions</th>
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
                          {member.displayName?.charAt(0) || 'U'}
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-bold text-church-navy group-hover:text-church-green transition-colors">{member.displayName}</p>
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
