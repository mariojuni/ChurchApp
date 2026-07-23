import { getSystemRoles, hasAnyRole, hasRole } from './permissions';

/**
 * Checks if a user can view ministry applications list.
 * Roles: super_admin, church_admin, pastor, ministry_leader, secretary
 */
export function canViewMinistryApplications(userProfile) {
  if (!userProfile || !userProfile.churchId) return false;
  return hasAnyRole(userProfile, [
    'super_admin',
    'church_admin',
    'pastor',
    'ministry_leader',
    'secretary',
  ]);
}

/**
 * Checks if a user can review (approve or decline) a given application.
 * - super_admin, church_admin, pastor can review all applications for their church.
 * - ministry_leader can review only if application.ministryId is in managedMinistryIds.
 * - secretary, finance_admin, viewer return false.
 */
export function canReviewMinistryApplication(userProfile, application) {
  if (!userProfile || !application) return false;
  if (!userProfile.churchId || userProfile.churchId !== application.churchId) return false;

  if (hasAnyRole(userProfile, ['super_admin', 'church_admin', 'pastor'])) {
    return true;
  }

  if (hasRole(userProfile, 'ministry_leader')) {
    const managed = Array.isArray(userProfile.managedMinistryIds)
      ? userProfile.managedMinistryIds
      : [];
    return managed.includes(application.ministryId);
  }

  return false;
}

/**
 * Alias for canReviewMinistryApplication for approving.
 */
export function canApproveMinistryApplication(userProfile, application) {
  return canReviewMinistryApplication(userProfile, application);
}

/**
 * Alias for canReviewMinistryApplication for declining.
 */
export function canDeclineMinistryApplication(userProfile, application) {
  return canReviewMinistryApplication(userProfile, application);
}
