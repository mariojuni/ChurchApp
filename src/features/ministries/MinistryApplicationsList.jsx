import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Shield,
  AlertCircle,
  FileText,
} from 'lucide-react';
import MinistryApplicationDetailModal from './MinistryApplicationDetailModal';
import DeclineApplicationModal from './DeclineApplicationModal';
import {
  canViewMinistryApplications,
  canReviewMinistryApplication,
} from '../../utils/ministryApplicationPermissions';
import { hasAnyRole, hasRole } from '../../utils/permissions';
import { formatStandardName } from '../../utils/nameUtils';

export default function MinistryApplicationsList() {
  const { userProfile } = useAuth();
  const CHURCH_ID = userProfile?.churchId;

  const [applications, setApplications] = useState([]);
  const [ministries, setMinistries] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [ministryFilter, setMinistryFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');

  // Modals state
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [applicationToDecline, setApplicationToDecline] = useState(null);

  // Toast Helper
  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch ministries for filter dropdown
  useEffect(() => {
    if (!CHURCH_ID) return;
    const qMin = query(collection(db, 'ministries'), where('churchId', '==', CHURCH_ID));
    const unsub = onSnapshot(qMin, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMinistries(docs);
    });
    return () => unsub();
  }, [CHURCH_ID]);

  // Fetch Users for standard name resolution
  useEffect(() => {
    if (!CHURCH_ID) return;
    const qUsers = query(collection(db, 'users'), where('churchId', '==', CHURCH_ID));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      const map = {};
      snap.forEach((d) => {
        const u = d.data();
        map[d.id] = { id: d.id, ...u };
      });
      setUsersMap(map);
    });
    return () => unsubUsers();
  }, [CHURCH_ID]);

  // Helper to format applicant standard display name according to userId / member document
  const getApplicantDisplayName = (app) => {
    if (!app) return 'Unnamed Member';
    const userId = app.userId || app.memberId;
    const userDoc = usersMap[userId];
    if (userDoc) {
      return formatStandardName(userDoc);
    }
    return formatStandardName({
      firstName: app.applicantFirstName,
      middleName: app.applicantMiddleName,
      lastName: app.applicantLastName,
      name: app.applicantName || app.displayName,
    });
  };

  const getApplicantPhoto = (app) => {
    if (!app) return null;
    const userId = app.userId || app.memberId;
    const userDoc = usersMap[userId];
    return userDoc?.photoURL || userDoc?.profilePicture || app.applicantPhotoUrl || null;
  };

  // Fetch Applications
  useEffect(() => {
    if (!userProfile) {
      setLoading(false);
      return;
    }

    if (!CHURCH_ID || !canViewMinistryApplications(userProfile)) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'ministryApplications'), where('churchId', '==', CHURCH_ID));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let docs = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        // Ministry leader scoping check
        const isGlobalAdmin = hasAnyRole(userProfile, ['super_admin', 'church_admin', 'pastor']);
        if (!isGlobalAdmin && hasRole(userProfile, 'ministry_leader')) {
          const managedIds = Array.isArray(userProfile.managedMinistryIds)
            ? userProfile.managedMinistryIds
            : [];
          docs = docs.filter((app) => managedIds.includes(app.ministryId));
        }

        // Sort: Pending first, then by submittedAt DESC
        docs.sort((a, b) => {
          if (a.status === 'pending' && b.status !== 'pending') return -1;
          if (a.status !== 'pending' && b.status === 'pending') return 1;

          const dateA = a.submittedAt?.seconds || a.createdAt?.seconds || 0;
          const dateB = b.submittedAt?.seconds || b.createdAt?.seconds || 0;
          return dateB - dateA;
        });

        setApplications(docs);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching applications:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [CHURCH_ID, userProfile]);

  // Filtering Logic
  const filteredApplications = applications.filter((app) => {
    const applicantName = getApplicantDisplayName(app);

    // Search by applicant name or ministry name
    const matchesSearch =
      applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.ministryName || '').toLowerCase().includes(searchTerm.toLowerCase());

    // Status Filter
    const matchesStatus = statusFilter === 'all' ? true : app.status === statusFilter;

    // Ministry Filter
    const matchesMinistry = ministryFilter === 'all' ? true : app.ministryId === ministryFilter;

    // Date Range Filter
    let matchesDate = true;
    if (dateRangeFilter !== 'all') {
      const appDate = app.submittedAt?.toDate
        ? app.submittedAt.toDate()
        : new Date(app.submittedAt || app.createdAt);
      const now = new Date();

      if (dateRangeFilter === '7days') {
        const past = new Date();
        past.setDate(now.getDate() - 7);
        matchesDate = appDate >= past;
      } else if (dateRangeFilter === '30days') {
        const past = new Date();
        past.setDate(now.getDate() - 30);
        matchesDate = appDate >= past;
      }
    }

    return matchesSearch && matchesStatus && matchesMinistry && matchesDate;
  });

  // Approve Flow
  const handleApprove = async (app) => {
    if (!canReviewMinistryApplication(userProfile, app)) {
      alert('Permission denied: You cannot approve this application.');
      return;
    }

    if (app.status !== 'pending') {
      alert('Only pending applications can be approved.');
      return;
    }

    if (!app.churchId || app.churchId !== CHURCH_ID) {
      alert('Invalid church scoping.');
      return;
    }

    setProcessing(true);
    try {
      const memberDocId = `${app.ministryId}_${app.memberId || app.userId}`;
      const applicantName = getApplicantDisplayName(app);

      // 1. Create or update ministryMembers record
      const memberRef = doc(db, 'ministryMembers', memberDocId);
      await setDoc(
        memberRef,
        {
          id: memberDocId,
          churchId: CHURCH_ID,
          ministryId: app.ministryId,
          memberId: app.memberId || app.userId,
          userId: app.userId || app.memberId,
          status: 'active',
          ministryRole:
            app.preferredRoleNames && app.preferredRoleNames.length > 0
              ? app.preferredRoleNames[0]
              : 'Member',
          joinedAt: serverTimestamp(),
          approvedBy: userProfile.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // 2. Update Application document
      const appRef = doc(db, 'ministryApplications', app.id);
      await updateDoc(appRef, {
        status: 'approved',
        applicantName,
        reviewedBy: userProfile.uid,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 3. Sync legacy ministries doc (members array)
      const ministryRef = doc(db, 'ministries', app.ministryId);
      const ministrySnap = await getDoc(ministryRef);
      if (ministrySnap.exists()) {
        const currentMembers = ministrySnap.data().members || [];
        const existingIdx = currentMembers.findIndex(
          (m) => m.memberId === (app.memberId || app.userId)
        );

        let updatedMembers = [...currentMembers];
        const newMemberItem = {
          memberId: app.memberId || app.userId,
          memberName: applicantName,
          servingRole:
            app.preferredRoleNames && app.preferredRoleNames.length > 0
              ? app.preferredRoleNames[0]
              : '',
        };

        if (existingIdx >= 0) {
          updatedMembers[existingIdx] = newMemberItem;
        } else {
          updatedMembers.push(newMemberItem);
        }

        await updateDoc(ministryRef, {
          members: updatedMembers,
          updatedAt: serverTimestamp(),
        });
      }

      showToast('Application approved. The member has been added to the ministry.', 'success');
      setIsDetailModalOpen(false);
      setSelectedApplication(null);
    } catch (err) {
      console.error('Approve error:', err);
      showToast('Failed to approve application: ' + err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Decline Flow Trigger
  const handleTriggerDecline = (app) => {
    setApplicationToDecline(app);
    setIsDeclineModalOpen(true);
  };

  // Confirm Decline
  const handleConfirmDecline = async ({ declineReason, reviewNote }) => {
    const app = applicationToDecline;
    if (!app) return;

    if (!canReviewMinistryApplication(userProfile, app)) {
      alert('Permission denied: You cannot decline this application.');
      return;
    }

    setProcessing(true);
    try {
      const appRef = doc(db, 'ministryApplications', app.id);
      await updateDoc(appRef, {
        status: 'declined',
        declineReason,
        reviewNote: reviewNote || '',
        reviewedBy: userProfile.uid,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      showToast('Application declined.', 'success');
      setIsDeclineModalOpen(false);
      setIsDetailModalOpen(false);
      setApplicationToDecline(null);
      setSelectedApplication(null);
    } catch (err) {
      console.error('Decline error:', err);
      showToast('Failed to decline application: ' + err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!canViewMinistryApplications(userProfile)) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-gray-100 shadow-church-soft">
        <AlertCircle size={40} className="mx-auto text-amber-500 mb-3" />
        <h3 className="text-lg font-bold text-church-navy">Access Denied</h3>
        <p className="text-sm text-church-slate mt-1">
          You do not have permission to view ministry applications.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 px-6 py-3.5 rounded-2xl shadow-xl border flex items-center space-x-3 text-sm font-bold transition-all ${
            toastMessage.type === 'success'
              ? 'bg-church-navy text-white border-church-green'
              : 'bg-red-600 text-white border-red-700'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle size={18} className="text-church-green" />
          ) : (
            <AlertCircle size={18} className="text-white" />
          )}
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* Header Controls & Filters */}
      <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search size={18} className="absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search applicant or ministry..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-full border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-church-green/20"
            />
          </div>

          {/* Filters dropdowns */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-xs font-bold text-church-navy focus:outline-none"
            >
              <option value="all">Status: All</option>
              <option value="pending">Status: Pending</option>
              <option value="approved">Status: Approved</option>
              <option value="declined">Status: Declined</option>
              <option value="withdrawn">Status: Withdrawn</option>
            </select>

            {/* Ministry Filter */}
            <select
              value={ministryFilter}
              onChange={(e) => setMinistryFilter(e.target.value)}
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-xs font-bold text-church-navy focus:outline-none max-w-[200px] truncate"
            >
              <option value="all">All Ministries</option>
              {ministries.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            {/* Date Filter */}
            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-xs font-bold text-church-navy focus:outline-none"
            >
              <option value="all">Date: All Time</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 overflow-hidden min-h-[350px]">
        {loading ? (
          <div className="p-16 text-center text-gray-400 text-sm">Loading applications...</div>
        ) : filteredApplications.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <FileText size={40} className="mx-auto text-gray-300" />
            <h4 className="font-bold text-church-navy">No applications found</h4>
            <p className="text-xs text-church-slate">
              There are no applications matching your current filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-bold text-church-slate uppercase tracking-wider">
                  <th className="py-3.5 px-6">Applicant</th>
                  <th className="py-3.5 px-6">Ministry</th>
                  <th className="py-3.5 px-6">Preferred Role</th>
                  <th className="py-3.5 px-6">Submitted Date</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredApplications.map((app) => {
                  const canReviewThis =
                    canReviewMinistryApplication(userProfile, app) && app.status === 'pending';
                  const applicantName = getApplicantDisplayName(app);
                  const applicantPhotoUrl = getApplicantPhoto(app);

                  return (
                    <tr key={app.id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Applicant */}
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          {applicantPhotoUrl ? (
                            <img
                              src={applicantPhotoUrl}
                              alt={applicantName}
                              className="w-9 h-9 rounded-full object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-church-navy/10 text-church-navy flex items-center justify-center font-bold text-xs">
                              {(applicantName || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="font-bold text-church-navy">
                            {applicantName}
                          </span>
                        </div>
                      </td>

                      {/* Ministry */}
                      <td className="py-4 px-6 text-church-slate font-medium">
                        {app.ministryName}
                      </td>

                      {/* Preferred Role */}
                      <td className="py-4 px-6 text-church-slate">
                        {app.preferredRoleNames && app.preferredRoleNames.length > 0 ? (
                          <span className="inline-block px-2.5 py-1 bg-gray-100 rounded-md text-xs font-semibold text-church-navy">
                            {app.preferredRoleNames[0]}
                            {app.preferredRoleNames.length > 1
                              ? ` (+${app.preferredRoleNames.length - 1})`
                              : ''}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-xs">Any</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-4 px-6 text-church-slate text-xs">
                        {formatDate(app.submittedAt || app.createdAt)}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        {app.status === 'approved' && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 inline-flex items-center">
                            <CheckCircle size={12} className="mr-1" /> Approved
                          </span>
                        )}
                        {app.status === 'declined' && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 inline-flex items-center">
                            <XCircle size={12} className="mr-1" /> Declined
                          </span>
                        )}
                        {app.status === 'pending' && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 inline-flex items-center">
                            <Clock size={12} className="mr-1" /> Pending
                          </span>
                        )}
                        {app.status === 'withdrawn' && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                            Withdrawn
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => {
                            setSelectedApplication(app);
                            setIsDetailModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-church-navy rounded-full text-xs font-bold transition-colors inline-flex items-center"
                        >
                          <Eye size={13} className="mr-1" /> View
                        </button>

                        {canReviewThis && (
                          <>
                            <button
                              onClick={() => handleApprove(app)}
                              disabled={processing}
                              className="px-3 py-1.5 bg-church-green/10 hover:bg-church-green/20 text-church-green rounded-full text-xs font-bold transition-colors inline-flex items-center"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleTriggerDecline(app)}
                              disabled={processing}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-full text-xs font-bold transition-colors inline-flex items-center"
                            >
                              Decline
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <MinistryApplicationDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedApplication(null);
        }}
        application={selectedApplication}
        applicantName={selectedApplication ? getApplicantDisplayName(selectedApplication) : ''}
        applicantPhotoUrl={selectedApplication ? getApplicantPhoto(selectedApplication) : null}
        userProfile={userProfile}
        onApprove={handleApprove}
        onDecline={handleTriggerDecline}
        processing={processing}
      />

      {/* Decline Reason Modal */}
      <DeclineApplicationModal
        isOpen={isDeclineModalOpen}
        onClose={() => {
          setIsDeclineModalOpen(false);
          setApplicationToDecline(null);
        }}
        onConfirm={handleConfirmDecline}
        processing={processing}
      />
    </div>
  );
}
