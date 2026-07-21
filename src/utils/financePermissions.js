import { hasAnyRole, hasRole } from './permissions';

const FINANCE_ADMIN_ROLES = ['super_admin', 'church_admin', 'finance_admin'];
const FINANCE_VIEW_ROLES = ['super_admin', 'church_admin', 'finance_admin', 'pastor'];

/**
 * Check if the user has any access to the Finance module.
 */
export const canAccessFinanceModule = (userProfile) => {
  return hasAnyRole(userProfile, FINANCE_VIEW_ROLES);
};

/**
 * Check if the user can manage (add/edit/delete) Giving records.
 */
export const canManageGiving = (userProfile) => {
  return hasAnyRole(userProfile, FINANCE_ADMIN_ROLES);
};

/**
 * Check if the user can verify (approve/reject) pending Giving records.
 */
export const canVerifyGiving = (userProfile) => {
  return hasAnyRole(userProfile, FINANCE_ADMIN_ROLES);
};

/**
 * Check if the user can manage (add/edit/delete) Expenses.
 */
export const canManageExpenses = (userProfile) => {
  return hasAnyRole(userProfile, FINANCE_ADMIN_ROLES);
};

/**
 * Check if the user can view the top-level Finance Summary Dashboard and Reports.
 */
export const canViewFinanceSummary = (userProfile) => {
  return hasAnyRole(userProfile, FINANCE_VIEW_ROLES);
};

/**
 * Check if the user can manage Finance settings (funds, campaigns, payment methods).
 */
export const canManageFinanceSettings = (userProfile) => {
  return hasAnyRole(userProfile, FINANCE_ADMIN_ROLES);
};

// --- Funds Management Permissions ---

/**
 * Check if the user can fully manage (create/edit/archive) funds.
 */
export const canManageFunds = (userProfile) => {
  return hasAnyRole(userProfile, FINANCE_ADMIN_ROLES);
};

/**
 * Check if the user can view funds.
 */
export const canViewFunds = (userProfile) => {
  return hasAnyRole(userProfile, FINANCE_VIEW_ROLES);
};

/**
 * Check if the user can create a new fund.
 */
export const canCreateFund = (userProfile) => {
  return hasAnyRole(userProfile, FINANCE_ADMIN_ROLES);
};

/**
 * Check if the user can edit an existing fund.
 */
export const canEditFund = (userProfile) => {
  return hasAnyRole(userProfile, FINANCE_ADMIN_ROLES);
};

/**
 * Check if the user can archive a fund.
 */
export const canArchiveFund = (userProfile) => {
  return hasAnyRole(userProfile, FINANCE_ADMIN_ROLES);
};

/**
 * Check if the user can view combined finance reports.
 */
export const canViewFinanceReports = (userProfile) => {
  return hasAnyRole(userProfile, FINANCE_VIEW_ROLES);
};

/**
 * Check if the user can view the new combined reports page.
 * true for super_admin, church_admin, finance_admin.
 * pastor might only see summary based on UI logic.
 */
export const canViewCombinedReports = (userProfile) => {
  return hasAnyRole(userProfile, FINANCE_VIEW_ROLES);
};
