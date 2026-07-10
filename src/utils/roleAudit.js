import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Logs a system role change to the roleAuditLogs collection.
 * 
 * @param {string} churchId 
 * @param {string} targetUserId 
 * @param {string} previousRole 
 * @param {string} newRole 
 * @param {string} changedByUid - The UID of the admin making the change
 * @param {string} reason 
 */
export const logRoleChange = async (churchId, targetUserId, previousRole, newRole, changedByUid, reason = '') => {
  try {
    await addDoc(collection(db, 'roleAuditLogs'), {
      churchId,
      targetUserId,
      previousRole: previousRole || 'None',
      newRole,
      changedBy: changedByUid,
      changedAt: serverTimestamp(),
      reason
    });
  } catch (error) {
    console.error("Failed to log role change:", error);
  }
};
