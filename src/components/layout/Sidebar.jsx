import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  Home, 
  Users, 
  BookOpen, 
  Calendar, 
  CreditCard, 
  HeartHandshake, 
  Settings,
  Bell,
  Search,
  Menu,
  X,
  Shield,
  LayoutDashboard,
  ClipboardCheck,
  Megaphone
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, roles: ['super_admin', 'church_admin', 'pastor', 'ministry_leader', 'finance_admin', 'secretary', 'viewer'] },
  { name: 'Team', path: '/admin/members', icon: Users, roles: ['super_admin', 'church_admin', 'secretary', 'pastor', 'viewer'] },
  { name: 'Attendance', path: '/admin/attendance', icon: ClipboardCheck, roles: ['super_admin', 'church_admin', 'secretary', 'pastor', 'viewer'] },
  { name: 'Announcements', path: '/admin/announcements', icon: Megaphone, roles: ['super_admin', 'church_admin', 'secretary', 'pastor', 'viewer'] },
  { name: 'Ministries', path: '/admin/ministries', icon: Shield, roles: ['super_admin', 'church_admin', 'pastor', 'ministry_leader', 'viewer'] },
  { name: 'Events', path: '/admin/events', icon: Calendar, roles: ['super_admin', 'church_admin', 'secretary', 'pastor', 'viewer'] },
  { name: 'Giving', path: '/admin/giving', icon: CreditCard, roles: ['super_admin', 'church_admin', 'finance_admin', 'viewer'] },
  { name: 'Expenses', path: '/admin/expenses', icon: CreditCard, roles: ['super_admin', 'church_admin', 'finance_admin', 'viewer'] },
  { name: 'Sermons', path: '/admin/sermons', icon: BookOpen, roles: ['super_admin', 'church_admin', 'pastor', 'viewer'] },
  { name: 'Bible Plans', path: '/admin/bible', icon: BookOpen, roles: ['super_admin', 'church_admin', 'pastor', 'viewer'] },
  { name: 'Prayer Wall', path: '/admin/prayer', icon: HeartHandshake, roles: ['super_admin', 'church_admin', 'pastor', 'viewer'] },
  { name: 'Settings', path: '/admin/settings', icon: Settings, roles: ['super_admin', 'church_admin', 'viewer'] },
];

export default function Sidebar({ isOpen, setIsOpen }) {
  const { userProfile } = useAuth();
  
  // Basic fallback role if none is defined
  const userRole = userProfile?.role?.toLowerCase() || 'viewer';

  const filteredNavItems = navItems.filter(item => item.roles.includes(userRole));

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-church-navy/20 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white rounded-2xl transform transition-transform duration-300 ease-in-out shadow-church-soft
        lg:translate-x-0 lg:static lg:inset-0 lg:h-[calc(100vh-2rem)] flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center justify-between h-20 px-6">
            <span className="text-xl font-bold text-church-navy flex items-center">
              <div className="w-8 h-8 bg-church-green rounded-full mr-2 flex items-center justify-center">
                <span className="text-white text-xs">C</span>
              </div>
              ChurchAdmin
            </span>
            <button className="lg:hidden text-gray-500 hover:text-gray-700" onClick={() => setIsOpen(false)}>
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            <div className="text-xs font-semibold text-gray-400 mb-4 ml-2 tracking-wider">MENU</div>
            {navItems.map((item) => {
              if (!item.roles.includes(userRole)) return null;
              const Icon = item.icon;
              
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  end={item.path === '/admin'}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-3 mb-1 rounded-xl transition-all duration-200 border-l-4 ${
                      isActive
                        ? 'border-church-green bg-church-green/5 text-church-green font-bold'
                        : 'border-transparent text-church-slate hover:bg-gray-50 hover:text-church-navy font-medium'
                    }`
                  }
                >
                  <Icon size={20} className="mr-3" />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="mt-auto p-4 m-4 bg-gray-50 rounded-2xl">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-church-green flex items-center justify-center text-white font-bold shadow-sm">
                {userProfile?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="ml-3 truncate">
                <p className="text-sm font-bold text-church-navy truncate">
                  {userProfile?.name || 'User'}
                </p>
                <p className="text-xs text-church-slate uppercase font-medium">
                  {userRole.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
