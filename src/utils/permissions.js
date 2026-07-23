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

/**
 * Can manage events (create, edit, delete, generate).
 * Roles: super_admin, church_admin, pastor, secretary
 */
export function canManageEvents(userProfile) {
  return hasAnyRole(userProfile, ['super_admin', 'church_admin', 'pastor', 'secretary']);
}

/**
 * Can manage ministry settings (type, description, general configuration).
 * Rules:
 * - Must belong to same church (churchId must match).
 * - super_admin, church_admin: true for all within church.
 * - ministry_leader: true ONLY if ministry.id is in userProfile.managedMinistryIds.
 * - pastor, secretary, finance_admin, viewer: false.
 */
export function canManageMinistrySettings(userProfile, ministry) {
  if (!userProfile || !userProfile.churchId || !ministry) return false;
  const ministryChurchId = ministry.churchId || ministry.church_id;
  if (ministryChurchId && ministryChurchId !== userProfile.churchId) return false;

  if (hasAnyRole(userProfile, ['super_admin', 'church_admin'])) return true;

  if (hasRole(userProfile, 'ministry_leader')) {
    const managed = Array.isArray(userProfile.managedMinistryIds)
      ? userProfile.managedMinistryIds
      : [];
    const minId = ministry.id || ministry.ministryId;
    return Boolean(minId && managed.includes(minId));
  }

  return false;
}

/**
 * Can manage song list access flag (songListEnabled).
 */
export function canManageSongListAccess(userProfile, ministry) {
  return canManageMinistrySettings(userProfile, ministry);
}

/**
 * Can create ministry assignment for an event.
 */
export function canCreateMinistryAssignment(userProfile, ministry) {
  if (!userProfile || !userProfile.churchId || !ministry) return false;
  const ministryChurchId = ministry.churchId || ministry.church_id;
  if (ministryChurchId && ministryChurchId !== userProfile.churchId) return false;

  if (hasAnyRole(userProfile, ['super_admin', 'church_admin', 'secretary'])) return true;

  if (hasRole(userProfile, 'ministry_leader')) {
    const managed = Array.isArray(userProfile.managedMinistryIds)
      ? userProfile.managedMinistryIds
      : [];
    const minId = ministry.id || ministry.ministryId;
    return Boolean(minId && managed.includes(minId));
  }

  return false;
}

/**
 * Can update an existing assignment.
 */
export function canUpdateMinistryAssignment(userProfile, assignment) {
  if (!userProfile || !userProfile.churchId || !assignment) return false;
  if (assignment.churchId && assignment.churchId !== userProfile.churchId) return false;

  if (hasAnyRole(userProfile, ['super_admin', 'church_admin', 'secretary'])) return true;

  if (hasRole(userProfile, 'ministry_leader')) {
    const managed = Array.isArray(userProfile.managedMinistryIds)
      ? userProfile.managedMinistryIds
      : [];
    return Boolean(assignment.ministryId && managed.includes(assignment.ministryId));
  }

  return false;
}

/**
 * Can manage official worship setlist (create, edit, delete, publish).
 */
export function canManageOfficialWorshipSetlist(userProfile, setlist) {
  if (!userProfile || !userProfile.churchId) return false;
  if (setlist && setlist.churchId && setlist.churchId !== userProfile.churchId) return false;

  if (hasAnyRole(userProfile, ['super_admin', 'church_admin', 'pastor'])) return true;

  if (hasRole(userProfile, 'ministry_leader')) {
    const managed = Array.isArray(userProfile.managedMinistryIds)
      ? userProfile.managedMinistryIds
      : [];
    if (setlist && setlist.ministryId) {
      return managed.includes(setlist.ministryId);
    }
    return managed.length > 0;
  }

  return false;
}

/**
 * Can view worship song list, lyrics, chords, key, capo, tempo from assignment.
 * Criteria:
 * - user is active
 * - user has churchId
 * - user has memberId
 * - assignment belongs to current user/member
 * - assignment.status is not declined or cancelled
 * - assignment.ministryType == worship
 * - ministry.features.songListEnabled == true
 * - assignment.canViewSongList == true
 * - event is published
 * - event is upcoming or currently active
 * - worship setlist is published
 */
export function canViewSongListFromAssignment(userProfile, assignment, ministry, event, setlist) {
  if (!userProfile) return false;
  if (userProfile.status && userProfile.status.toLowerCase() !== 'active') return false;
  if (!userProfile.churchId || !userProfile.memberId) return false;

  if (!assignment || !ministry || !event || !setlist) return false;

  // Data scoped by churchId
  if (assignment.churchId && assignment.churchId !== userProfile.churchId) return false;
  if (ministry.churchId && ministry.churchId !== userProfile.churchId) return false;
  if (event.churchId && event.churchId !== userProfile.churchId) return false;
  if (setlist.churchId && setlist.churchId !== userProfile.churchId) return false;

  // Assignment belongs to current user / member
  const isUserAssignment =
    (assignment.memberId && assignment.memberId === userProfile.memberId) ||
    (assignment.userId && assignment.userId === (userProfile.uid || userProfile.id));
  if (!isUserAssignment) return false;

  // Assignment status check
  const statusLower = (assignment.status || '').toLowerCase();
  if (statusLower === 'declined' || statusLower === 'cancelled') return false;

  // Ministry type & flag check
  const ministryType = (assignment.ministryType || ministry.type || '').toLowerCase();
  if (ministryType !== 'worship') return false;
  if (ministry.features?.songListEnabled !== true) return false;
  if (assignment.canViewSongList !== true) return false;

  // Event status and date check
  if (event.status && event.status !== 'published') return false;
  
  if (event.date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(event.date);
    if (!isNaN(eventDate.getTime()) && eventDate < today) {
      return false;
    }
  }

  // Setlist status check
  if (setlist.status !== 'published') return false;

  return true;
}

/**
 * Personal arrangements can only be saved if user has song list access from assignment.
 */
export function canSavePersonalArrangement(userProfile, assignment, ministry, event, setlist) {
  return canViewSongListFromAssignment(userProfile, assignment, ministry, event, setlist);
}

/**
 * Do not give regular members access to Staff Management.
 */
export function canViewStaffManagement(userProfile) {
  if (!userProfile || !userProfile.churchId) return false;
  if (userProfile.status && userProfile.status.toLowerCase() === 'disabled') return false;

  // Regular members/viewers do not have staff management access
  return hasAnyRole(userProfile, [
    'super_admin',
    'church_admin',
    'pastor',
    'secretary',
    'finance_admin',
    'ministry_leader',
  ]);
}

export * from './ministryApplicationPermissions';



