import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }) {
  const { isLoading, isAuthorizedAdmin } = useAuth();

  // Auth check in progress — render a neutral loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-church-bg">
        <div className="flex flex-col items-center gap-3 text-church-slate">
          <Loader2 size={28} className="animate-spin text-church-green" />
          <span className="text-sm">Verifying access…</span>
        </div>
      </div>
    );
  }

  // Not authorized (not authenticated, wrong role, disabled, no churchId, etc.)
  if (!isAuthorizedAdmin) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
