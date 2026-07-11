/**
 * @typedef {"super_admin"|"church_admin"|"pastor"|"secretary"|"finance_admin"|"ministry_leader"|"viewer"} SystemRole
 */

/** All valid system roles in priority order. */
export const SYSTEM_ROLES = [
  'super_admin',
  'church_admin',
  'pastor',
  'secretary',
  'finance_admin',
  'ministry_leader',
  'viewer',
];

/**
 * Normalise a user profile so it always has a `systemRoles` array.
 * - If `systemRoles` already exists, return as-is.
 * - If legacy `role` string exists, wrap it: ["finance_admin"].
 * - Otherwise default to ["viewer"].
 *
 * @param {object|null} userProfile
 * @returns {string[]}
 */
export function getSystemRoles(userProfile) {
  if (!userProfile) return ['viewer'];

  if (Array.isArray(userProfile.systemRoles) && userProfile.systemRoles.length > 0) {
    return userProfile.systemRoles.map(r => r.toLowerCase());
  }

  // Legacy fallback: single role string
  if (userProfile.role) {
    return [userProfile.role.toLowerCase()];
  }

  return ['viewer'];
}

/**
 * Returns the primary (display) role for a user.
 * Uses `primaryRole` if set, otherwise the first role in `systemRoles`.
 *
 * @param {object|null} userProfile
 * @returns {SystemRole}
 */
export function getPrimaryRole(userProfile) {
  if (!userProfile) return 'viewer';

  if (userProfile.primaryRole) {
    return userProfile.primaryRole.toLowerCase();
  }

  const roles = getSystemRoles(userProfile);
  return roles[0] || 'viewer';
}

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the user has the specified role.
 *
 * @param {object|null} userProfile
 * @param {SystemRole} role
 * @returns {boolean}
 */
export function hasRole(userProfile, role) {
  return getSystemRoles(userProfile).includes(role.toLowerCase());
}

/**
 * Returns true if the user has **any** of the specified roles.
 *
 * @param {object|null} userProfile
 * @param {SystemRole[]} roles
 * @returns {boolean}
 */
export function hasAnyRole(userProfile, roles) {
  const userRoles = getSystemRoles(userProfile);
  return roles.some(r => userRoles.includes(r.toLowerCase()));
}

// ---------------------------------------------------------------------------
// Domain-specific helpers
// ---------------------------------------------------------------------------

/**
 * Can manage giving records, campaigns, expenses, payment methods, and finance reports.
 * Roles: super_admin, church_admin, finance_admin
 */
export function canManageGiving(userProfile) {
  return hasAnyRole(userProfile, ['super_admin', 'church_admin', 'finance_admin']);
}

/**
 * Can manage a specific ministry.
 * - super_admin / church_admin / pastor → can manage ALL ministries.
 * - ministry_leader → can only manage ministries listed in their `managedMinistryIds`.
 *
 * @param {object|null} userProfile
 * @param {string} ministryId
 * @returns {boolean}
 */
export function canManageMinistry(userProfile, ministryId) {
  if (!userProfile) return false;

  if (hasAnyRole(userProfile, ['super_admin', 'church_admin', 'pastor'])) {
    return true;
  }

  if (hasRole(userProfile, 'ministry_leader')) {
    const managed = Array.isArray(userProfile.managedMinistryIds)
      ? userProfile.managedMinistryIds
      : [];
    return managed.includes(ministryId);
  }

  return false;
}

/**
 * Can view, approve, reject, and moderate prayer requests (including leaders_only visibility).
 * Roles: super_admin, church_admin, pastor
 */
export function canModeratePrayerRequests(userProfile) {
  return hasAnyRole(userProfile, ['super_admin', 'church_admin', 'pastor']);
}

/**
 * Can access the admin portal (any non-viewer role).
 * viewer can use normal mobile features but not manage admin modules.
 */
export function canAccessAdminPortal(userProfile) {
  return hasAnyRole(userProfile, [
    'super_admin',
    'church_admin',
    'pastor',
    'secretary',
    'finance_admin',
    'ministry_leader',
  ]);
}

/**
 * Can assign and change system roles for other users.
 * Roles: super_admin, church_admin
 */
export function canManageRoles(userProfile) {
  return hasAnyRole(userProfile, ['super_admin', 'church_admin']);
}

/**
 * Returns which roles the current user is allowed to assign to others.
 * - super_admin → any role
 * - church_admin → any role except super_admin
 *
 * @param {object|null} userProfile - the current admin's profile
 * @returns {SystemRole[]}
 */
export function getAssignableRoles(userProfile) {
  if (hasRole(userProfile, 'super_admin')) return [...SYSTEM_ROLES];
  if (hasRole(userProfile, 'church_admin')) return SYSTEM_ROLES.filter(r => r !== 'super_admin');
  return [];
}
