import React, { useState } from 'react';
import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CreditCard, 
  ClipboardCheck, 
  Receipt, 
  Wallet, 
  Target, 
  Activity 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  canAccessFinanceModule, 
  canManageGiving, 
  canVerifyGiving, 
  canManageExpenses,
  canViewFinanceSummary,
  canManageFinanceSettings,
  canViewFinanceReports
} from '../../utils/financePermissions';

import FinanceDashboard from './FinanceDashboard';
import GivingRecords from '../giving/GivingRecords';
import PendingVerification from './PendingVerification';
import ExpensesList from '../expenses/ExpensesList';
import GivingCampaigns from '../giving/GivingCampaigns';

import FundsList from '../funds/FundsList';
import CombinedReports from './reports/CombinedReports';

export default function FinanceLayout() {
  const { userProfile } = useAuth();
  
  if (!canAccessFinanceModule(userProfile)) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl shadow-sm border border-gray-100 max-w-2xl mx-auto mt-12">
        <h2 className="text-2xl font-bold text-church-navy mb-4">Access Denied</h2>
        <p className="text-gray-500">You do not have permission to view the Finance module.</p>
      </div>
    );
  }

  const tabs = [];

  if (canViewFinanceSummary(userProfile)) {
    tabs.push({ name: 'Overview', path: '/admin/finance', icon: LayoutDashboard, exact: true });
  }
  
  if (canManageGiving(userProfile) || canViewFinanceSummary(userProfile)) {
    tabs.push({ name: 'Giving', path: '/admin/finance/giving', icon: CreditCard, exact: false });
  }

  if (canVerifyGiving(userProfile)) {
    tabs.push({ name: 'Verification', path: '/admin/finance/verification', icon: ClipboardCheck, exact: false });
  }

  if (canManageExpenses(userProfile) || canViewFinanceSummary(userProfile)) {
    tabs.push({ name: 'Expenses', path: '/admin/finance/expenses', icon: Receipt, exact: false });
  }

  if (canManageFinanceSettings(userProfile)) {
    tabs.push({ name: 'Funds', path: '/admin/finance/funds', icon: Wallet, exact: false });
    tabs.push({ name: 'Campaigns', path: '/admin/finance/campaigns', icon: Target, exact: false });
  }

  if (canViewFinanceReports(userProfile)) {
    tabs.push({ name: 'Reports', path: '/admin/finance/reports', icon: Activity, exact: false });
  }

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto pb-10">
      
      {/* Top Navigation Tabs */}
      <div className="bg-white rounded-3xl shadow-church-soft border border-gray-100 mb-6 p-2 overflow-x-auto custom-scrollbar">
        <nav className="flex space-x-1 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.name}
                to={tab.path}
                end={tab.exact}
                className={({ isActive }) =>
                  `flex items-center px-4 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-church-green text-white shadow-sm'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-church-navy'
                  }`
                }
              >
                <Icon size={18} className="mr-2" />
                {tab.name}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Tab Content Routing */}
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<FinanceDashboard />} />
          <Route path="giving" element={<GivingRecords />} />
          <Route path="verification" element={<PendingVerification />} />
          <Route path="expenses" element={<ExpensesList />} />
          <Route path="funds" element={<FundsList />} />
          <Route path="campaigns" element={<GivingCampaigns />} />
          <Route path="reports" element={<CombinedReports />} />
          <Route path="*" element={<Navigate to="/admin/finance" replace />} />
        </Routes>
      </div>
    </div>
  );
}
