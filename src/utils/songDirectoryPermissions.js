import { hasRole, hasAnyRole } from './permissions';

/**
 * Checks if user can view the web Song Library.
 * Roles with access: super_admin, church_admin, pastor, ministry_leader, secretary (if allowed by existing policy).
 * finance_admin and viewer are denied web management access.
 */
export function canViewSongLibrary(userProfile) {
  if (!userProfile || !userProfile.churchId) return false;

  return hasAnyRole(userProfile, [
    'super_admin',
    'church_admin',
    'pastor',
    'ministry_leader',
    'secretary'
  ]);
}

/**
 * Checks if user can edit/create songs in the web Song Library.
 * Rules:
 * - super_admin, church_admin: true for all songs in their church.
 * - ministry_leader: true only if song has a ministryId inside userProfile.managedMinistryIds (or true if song has no ministryId restriction).
 * - secretary: true if part of event/worship management policy.
 * - pastor, finance_admin, viewer: false by default for editing.
 */
export function canEditSong(userProfile, song) {
  if (!userProfile || !userProfile.churchId) return false;
  if (song && song.churchId && song.churchId !== userProfile.churchId) return false;

  if (hasAnyRole(userProfile, ['super_admin', 'church_admin', 'secretary'])) {
    return true;
  }

  if (hasRole(userProfile, 'ministry_leader')) {
    if (!song || !song.ministryId) return true; // Default church-wide song or unassigned
    const managed = Array.isArray(userProfile.managedMinistryIds)
      ? userProfile.managedMinistryIds
      : [];
    return managed.includes(song.ministryId);
  }

  return false;
}

/**
 * Checks if user can manage Community Directory Settings (Directory Visibility, Allow Lyrics in Directory).
 * Rules:
 * - super_admin, church_admin: true for all songs in church.
 * - ministry_leader: true only if song.ministryId is in managedMinistryIds (or unassigned).
 * - pastor, secretary, finance_admin, viewer: false.
 */
export function canManageSongDirectorySettings(userProfile, song) {
  if (!userProfile || !userProfile.churchId) return false;
  if (song && song.churchId && song.churchId !== userProfile.churchId) return false;

  if (hasAnyRole(userProfile, ['super_admin', 'church_admin'])) {
    return true;
  }

  if (hasRole(userProfile, 'ministry_leader')) {
    if (!song || !song.ministryId) return true;
    const managed = Array.isArray(userProfile.managedMinistryIds)
      ? userProfile.managedMinistryIds
      : [];
    return managed.includes(song.ministryId);
  }

  return false;
}

/**
 * Checks if user can publish a song to the Community Songs Directory (Members Only / Public).
 */
export function canPublishSongToDirectory(userProfile, song) {
  return canManageSongDirectorySettings(userProfile, song);
}
