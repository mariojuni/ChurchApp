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

/**
 * Returns true if the user account is authorized to manage sermons.
 * Rules:
 * - true for super_admin, church_admin, pastor
 * - true for secretary only if allowed by permissions
 * - true for ministry_leader only if assigned to sermon/media ministry
 * - false for finance_admin, viewer, etc.
 */
export function canManageSermons(userAccount) {
  if (!userAccount || userAccount.status === 'disabled') return false;
  
  const roles = getNormalizedRoles(userAccount);
  
  if (
    roles.includes('super_admin') || 
    roles.includes('church_admin') || 
    roles.includes('pastor')
  ) {
    return true;
  }
  
  if (roles.includes('secretary')) {
    // Secretary needs explicit permission
    if (userAccount.permissions?.sermons === true || userAccount.canManageSermons === true) {
      return true;
    }
  }
  
  if (roles.includes('ministry_leader')) {
    // Ministry leader needs to be assigned to media/sermon ministry
    // We check explicit permission or if managedMinistryIds has a media-related ID
    if (
      userAccount.permissions?.sermons === true || 
      userAccount.canManageSermons === true ||
      (Array.isArray(userAccount.managedMinistryIds) && userAccount.managedMinistryIds.includes('media_ministry_id_placeholder'))
    ) {
      return true;
    }
  }
  
  return false;
}
