import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Logs a system role change to the roleAuditLogs collection.
 * Accepts both legacy single-role strings and new multi-role arrays.
 * 
 * @param {string} churchId 
 * @param {string} targetUserId 
 * @param {string|string[]} previousRoles - previous role(s)
 * @param {string|string[]} newRoles - new role(s)
 * @param {string} changedByUid - the UID of the admin making the change
 * @param {string} reason 
 */
export const logRoleChange = async (churchId, targetUserId, previousRoles, newRoles, changedByUid, reason = '') => {
  // Normalise: accept either a single string or an array
  const prevArr = Array.isArray(previousRoles)
    ? previousRoles
    : [previousRoles || 'none'];
  const newArr = Array.isArray(newRoles)
    ? newRoles
    : [newRoles || 'none'];

  try {
    await addDoc(collection(db, 'roleAuditLogs'), {
      churchId,
      targetUserId,
      previousRoles: prevArr,
      newRoles: newArr,
      // Keep legacy fields for backward-compat with existing audit log readers
      previousRole: prevArr[0] || 'none',
      newRole: newArr[0] || 'none',
      changedBy: changedByUid,
      changedAt: serverTimestamp(),
      reason
    });
  } catch (error) {
    console.error("Failed to log role change:", error);
  }
};
