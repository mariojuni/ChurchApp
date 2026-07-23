import React from 'react';
import { X, CheckCircle, XCircle, Clock, Shield, Calendar, User, FileText, Check } from 'lucide-react';
import { canReviewMinistryApplication } from '../../utils/ministryApplicationPermissions';
import { formatStandardName } from '../../utils/nameUtils';

export default function MinistryApplicationDetailModal({
  isOpen,
  onClose,
  application,
  userProfile,
  applicantName: customApplicantName,
  applicantPhotoUrl: customApplicantPhotoUrl,
  onApprove,
  onDecline,
  processing,
}) {
  if (!isOpen || !application) return null;

  const canReview = canReviewMinistryApplication(userProfile, application) && application.status === 'pending';
  const applicantName = customApplicantName || formatStandardName(application);
  const applicantPhotoUrl = customApplicantPhotoUrl || application.applicantPhotoUrl;

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
            <CheckCircle size={14} className="mr-1" /> Approved
          </span>
        );
      case 'declined':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
            <XCircle size={14} className="mr-1" /> Declined
          </span>
        );
      case 'withdrawn':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
            Withdrawn
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
            <Clock size={14} className="mr-1" /> Pending Review
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-church-soft overflow-hidden flex flex-col my-8">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-church-navy/10 flex items-center justify-center text-church-navy">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-church-navy">Ministry Application Detail</h2>
              <p className="text-xs text-church-slate">Submitted on {formatDate(application.submittedAt || application.createdAt)}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors bg-white p-2 rounded-full shadow-sm">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {/* Top Info Header */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="flex items-center space-x-4">
              {applicantPhotoUrl ? (
                <img
                  src={applicantPhotoUrl}
                  alt={applicantName}
                  className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-church-navy text-white flex items-center justify-center font-bold text-xl shadow-sm">
                  {(applicantName || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="text-lg font-bold text-church-navy">{applicantName}</h3>
                <div className="flex items-center text-xs text-church-slate mt-1 space-x-2">
                  <span className="flex items-center"><Shield size={13} className="mr-1 text-church-green" /> {application.ministryName}</span>
                </div>
              </div>
            </div>
            <div>{getStatusBadge(application.status)}</div>
          </div>

          {/* Details Grid */}
          <div className="space-y-4">
            {/* Preferred Roles */}
            <div>
              <label className="block text-xs font-bold text-church-slate uppercase tracking-wider mb-2">Preferred Roles</label>
              <div className="flex flex-wrap gap-2">
                {application.preferredRoleNames && application.preferredRoleNames.length > 0 ? (
                  application.preferredRoleNames.map((roleName, idx) => (
                    <span key={idx} className="px-3 py-1 bg-church-navy/5 text-church-navy text-sm font-semibold rounded-lg border border-church-navy/10">
                      {roleName}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500 italic">No specific role preferred</span>
                )}
              </div>
            </div>

            {/* Reason for Joining */}
            <div>
              <label className="block text-xs font-bold text-church-slate uppercase tracking-wider mb-1">Reason for Joining</label>
              <div className="p-3.5 bg-gray-50 rounded-xl text-sm text-church-navy border border-gray-100 whitespace-pre-wrap">
                {application.reason || application.reasonForJoining || <span className="text-gray-400 italic">None provided</span>}
              </div>
            </div>

            {/* Experience */}
            <div>
              <label className="block text-xs font-bold text-church-slate uppercase tracking-wider mb-1">Relevant Experience</label>
              <div className="p-3.5 bg-gray-50 rounded-xl text-sm text-church-navy border border-gray-100 whitespace-pre-wrap">
                {application.experience || <span className="text-gray-400 italic">None provided</span>}
              </div>
            </div>

            {/* Availability */}
            <div>
              <label className="block text-xs font-bold text-church-slate uppercase tracking-wider mb-1">Availability</label>
              <div className="p-3.5 bg-gray-50 rounded-xl text-sm text-church-navy border border-gray-100">
                {application.availability || <span className="text-gray-400 italic">None provided</span>}
              </div>
            </div>

            {/* Review Information if reviewed */}
            {application.status !== 'pending' && (
              <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-2 mt-4">
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Review History</h4>
                <div className="text-xs text-blue-800">
                  <p><span className="font-semibold">Reviewed At:</span> {formatDate(application.reviewedAt)}</p>
                  {application.reviewNote && (
                    <p className="mt-1"><span className="font-semibold">Note:</span> {application.reviewNote}</p>
                  )}
                  {application.declineReason && (
                    <p className="mt-1 text-red-600"><span className="font-semibold">Decline Reason:</span> {application.declineReason}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="px-5 py-2.5 bg-white border border-gray-300 rounded-full text-sm font-bold text-church-slate hover:bg-gray-100 transition-colors"
          >
            Close
          </button>

          {canReview && (
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => onDecline(application)}
                disabled={processing}
                className="px-5 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-full text-sm font-bold hover:bg-red-100 transition-colors disabled:opacity-50 flex items-center"
              >
                <XCircle size={16} className="mr-1.5" />
                Decline Application
              </button>
              <button
                type="button"
                onClick={() => onApprove(application)}
                disabled={processing}
                className="px-6 py-2.5 bg-church-green text-white rounded-full text-sm font-bold hover:bg-church-green/90 transition-colors disabled:opacity-50 shadow-md flex items-center"
              >
                <CheckCircle size={16} className="mr-1.5" />
                Approve Application
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
