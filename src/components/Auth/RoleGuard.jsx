import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { hasAnyRole } from '../../utils/permissions';

/**
 * RoleGuard — protects routes by checking if the user holds at least one
 * of the `allowedRoles`. Works with the new multi-role systemRoles[] model.
 *
 * @param {string[]} allowedRoles - list of SystemRole values that may enter
 * @param {React.ReactNode} children - optional children; renders <Outlet /> if omitted
 */
export default function RoleGuard({ allowedRoles, children }) {
  const { userProfile, currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAnyRole(userProfile, allowedRoles)) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
        <p className="text-gray-600 mb-4">You do not have permission to view this page.</p>
        <button 
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  return children ? children : <Outlet />;
}
