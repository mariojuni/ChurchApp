import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

export default function DeclineApplicationModal({
  isOpen,
  onClose,
  onConfirm,
  processing,
}) {
  const [declineReason, setDeclineReason] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!declineReason.trim()) {
      setError('Please provide a reason for declining.');
      return;
    }
    setError('');
    onConfirm({ declineReason: declineReason.trim(), reviewNote: reviewNote.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-church-soft overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-bold text-church-navy">Decline Application</h3>
          <button onClick={onClose} disabled={processing} className="text-gray-400 hover:text-gray-600 transition-colors bg-white p-2 rounded-full shadow-sm">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-center">
              <AlertCircle size={16} className="mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-church-navy mb-1">
              Decline Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Provide reason for declining this application..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-church-navy mb-1">
              Internal Review Note <span className="text-xs text-gray-400">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Optional notes for admin records..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-church-green/20 focus:border-church-green text-sm"
            />
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              className="px-5 py-2.5 bg-white border border-gray-300 rounded-full text-sm font-bold text-church-slate hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processing}
              className="px-6 py-2.5 bg-red-600 text-white rounded-full text-sm font-bold hover:bg-red-700 transition-colors shadow-md disabled:opacity-50"
            >
              {processing ? 'Processing...' : 'Confirm Decline'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
