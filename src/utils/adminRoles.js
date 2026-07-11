/**
 * Canonical list of roles that are permitted to access the admin portal.
 * Values must match what is stored in Firestore users/{uid}.role (snake_case).
 */
export const ADMIN_ROLES = [
  'super_admin',
  'church_admin',
  'pastor',
  'ministry_leader',
  'finance_admin',
  'secretary',
  'discipleship_coordinator',
  'discipler_leader',
];

/**
 * Returns true if the given role string is an allowed admin portal role.
 * @param {string|undefined} role
 */
export function isAdminRole(role) {
  if (!role) return false;
  return ADMIN_ROLES.includes(role.toLowerCase());
}

/**
 * Helper to get normalized roles from a user account for checking admin access
 */
function getNormalizedRoles(userAccount) {
  if (!userAccount) return ['viewer'];
  if (Array.isArray(userAccount.systemRoles) && userAccount.systemRoles.length > 0) {
    return userAccount.systemRoles.map(r => r.toLowerCase());
  }
  if (userAccount.role) {
    return [userAccount.role.toLowerCase()];
  }
  return ['viewer'];
}

/**
 * Returns true if the user account is authorized for the admin portal.
 * Rules:
 * - status must be 'active'
 * - role must be in ADMIN_ROLES
 * - non-superAdmins must have a churchId
 *
 * @param {{ role?: string, status?: string, churchId?: string }|null} userAccount
 */
export function isAuthorizedAdminUser(userAccount) {
  if (!userAccount) return false;
  // Block explicitly disabled or unlinked accounts; treat missing status as active
  if (userAccount.status === 'disabled') return false;
  if (userAccount.status === 'pendingChurchLink') return false;
  
  const roles = getNormalizedRoles(userAccount);
  const hasAdminRole = ADMIN_ROLES.some(r => roles.includes(r));
  if (!hasAdminRole) return false;
  
  if (!roles.includes('super_admin') && !userAccount.churchId) return false;
  return true;
}
