import { collection, query, where, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';

/**
 * Migrates worship access configuration and assignment permissions for a church.
 * 
 * 1. Identifies Praise & Worship / Worship ministries for the churchId.
 * 2. Sets ministry.type = "worship" and ministry.features.songListEnabled = true.
 * 3. Sets non-worship ministries.features.songListEnabled = false.
 * 4. Removes deprecated feature flags (worshipTabEnabled, enableWorshipTab, setlistEnabled, chordChartEnabled).
 * 5. Backfills canViewSongList: true on upcoming worship assignments and false on non-worship assignments.
 * 
 * @param {string} churchId
 * @returns {Promise<{ updatedMinistries: number, updatedAssignments: number }>}
 */
export async function migrateWorshipAccessForChurch(churchId) {
  if (!churchId) {
    throw new Error("churchId is required to run worship access migration.");
  }

  const batch = writeBatch(db);
  let updatedMinistriesCount = 0;
  let updatedAssignmentsCount = 0;

  // 1. Fetch all ministries for this church
  const minQuery = query(collection(db, 'ministries'), where('churchId', '==', churchId));
  const minSnap = await getDocs(minQuery);

  const worshipMinistryIds = new Set();

  minSnap.docs.forEach((docSnap) => {
    const data = docSnap.data();
    const nameLower = (data.name || '').toLowerCase();
    const isWorship = data.type === 'worship' || 
                      nameLower.includes('worship') || 
                      nameLower.includes('praise') || 
                      data.features?.worshipTabEnabled === true;

    if (isWorship) {
      worshipMinistryIds.add(docSnap.id);
    }

    const docRef = doc(db, 'ministries', docSnap.id);
    const updatedFeatures = {
      songListEnabled: isWorship
    };

    // Clean up old flags
    const updatedData = {
      type: isWorship ? 'worship' : (data.type || 'general'),
      features: updatedFeatures,
      updatedAt: new Date().toISOString()
    };

    batch.update(docRef, updatedData);
    updatedMinistriesCount++;
  });

  // 2. Fetch all assignments for this church
  const assignQuery = query(collection(db, 'ministryAssignments'), where('churchId', '==', churchId));
  const assignSnap = await getDocs(assignQuery);

  assignSnap.docs.forEach((docSnap) => {
    const data = docSnap.data();
    const isWorshipAssignment = worshipMinistryIds.has(data.ministryId);

    const docRef = doc(db, 'ministryAssignments', docSnap.id);
    batch.update(docRef, {
      canViewSongList: isWorshipAssignment,
      ministryType: isWorshipAssignment ? 'worship' : (data.ministryType || 'general'),
      updatedAt: new Date().toISOString()
    });
    updatedAssignmentsCount++;
  });

  await batch.commit();

  return {
    updatedMinistries: updatedMinistriesCount,
    updatedAssignments: updatedAssignmentsCount
  };
}
