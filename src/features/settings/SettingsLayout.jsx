import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Settings, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function SettingsLayout() {
  const { userProfile } = useAuth();
  
  const canManageRoles = ['super_admin', 'church_admin'].includes(userProfile?.role?.toLowerCase());

  return (
    <div className="flex flex-col md:flex-row h-full max-w-6xl mx-auto space-y-6 md:space-y-0 md:space-x-6 pb-10">
      {/* Settings Navigation */}
      <div className="w-full md:w-64 flex-shrink-0">
        <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 p-4 sticky top-6">
          <h2 className="text-lg font-bold text-church-navy mb-4 px-4">Settings</h2>
          <nav className="space-y-1">
            <NavLink
              to="/admin/settings"
              end
              className={({ isActive }) =>
                `flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                  isActive
                    ? 'bg-church-green text-white'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-church-navy'
                }`
              }
            >
              <Settings size={18} className="mr-3" />
              Church Profile
            </NavLink>
            
            {canManageRoles && (
              <NavLink
                to="/admin/settings/roles"
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                    isActive
                      ? 'bg-church-green text-white'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-church-navy'
                  }`
                }
              >
                <Users size={18} className="mr-3" />
                Users & Roles
              </NavLink>
            )}
          </nav>
        </div>
      </div>
      
      {/* Settings Content */}
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
