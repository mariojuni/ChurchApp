import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../firebase';

// Collection references
const getPlansRef = () => collection(db, 'discipleshipPlans');
const getWeeksRef = () => collection(db, 'discipleshipWeeks');
const getProgressRef = () => collection(db, 'discipleshipProgress');

// --- Plans ---

export const getDiscipleshipPlans = async (churchId) => {
  if (!churchId) throw new Error("churchId is required");
  const q = query(
    getPlansRef(), 
    where('churchId', '==', churchId)
  );
  const snapshot = await getDocs(q);
  const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  
  // Sort in memory to avoid requiring a composite index
  return docs.sort((a, b) => {
    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return timeB - timeA;
  });
};

export const getDiscipleshipPlan = async (churchId, planId) => {
  if (!churchId) throw new Error("churchId is required");
  const docRef = doc(db, 'discipleshipPlans', planId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists() && docSnap.data().churchId === churchId) {
    return { ...docSnap.data(), id: docSnap.id };
  }
  return null;
};

export const createDiscipleshipPlan = async (churchId, planData, userId) => {
  if (!churchId) throw new Error("churchId is required");
  const docRef = await addDoc(getPlansRef(), {
    ...planData,
    churchId,
    createdBy: userId,
    updatedBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
};

export const updateDiscipleshipPlan = async (churchId, planId, planData, userId) => {
  if (!churchId) throw new Error("churchId is required");
  const docRef = doc(db, 'discipleshipPlans', planId);
  await updateDoc(docRef, {
    ...planData,
    updatedBy: userId,
    updatedAt: serverTimestamp()
  });
};

export const deleteDiscipleshipPlan = async (churchId, planId) => {
  if (!churchId) throw new Error("churchId is required");
  // Also delete weeks
  const weeks = await getDiscipleshipWeeks(churchId, planId);
  const batch = writeBatch(db);
  
  weeks.forEach(week => {
    batch.delete(doc(db, 'discipleshipWeeks', week.id));
  });
  
  batch.delete(doc(db, 'discipleshipPlans', planId));
  await batch.commit();
};

// --- Weeks ---

export const getDiscipleshipWeeks = async (churchId, planId) => {
  if (!churchId) throw new Error("churchId is required");
  const q = query(
    getWeeksRef(), 
    where('churchId', '==', churchId),
    where('planId', '==', planId)
  );
  const snapshot = await getDocs(q);
  const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  
  // Sort in memory to avoid requiring a composite index
  return docs.sort((a, b) => (a.weekNumber || 0) - (b.weekNumber || 0));
};

export const saveDiscipleshipWeeks = async (churchId, planId, weeks) => {
  if (!churchId) throw new Error("churchId is required");
  
  const batch = writeBatch(db);
  
  weeks.forEach(week => {
    if (week.id) {
      // Update existing week
      const docRef = doc(db, 'discipleshipWeeks', week.id);
      batch.update(docRef, {
        ...week,
        updatedAt: serverTimestamp()
      });
    } else {
      // Create new week
      const docRef = doc(getWeeksRef());
      batch.set(docRef, {
        ...week,
        churchId,
        planId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  });
  
  await batch.commit();
};

export const deleteDiscipleshipWeek = async (churchId, weekId) => {
  if (!churchId) throw new Error("churchId is required");
  await deleteDoc(doc(db, 'discipleshipWeeks', weekId));
};

export const publishAllWeeks = async (churchId, planId) => {
  if (!churchId || !planId) throw new Error("churchId and planId are required");
  
  const q = query(
    getWeeksRef(),
    where('churchId', '==', churchId),
    where('planId', '==', planId)
  );
  
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  
  snapshot.docs.forEach(docSnap => {
    batch.update(docSnap.ref, {
      status: 'published',
      updatedAt: serverTimestamp()
    });
  });
  
  await batch.commit();
};

// --- Progress ---

export const getMemberProgress = async (churchId, planId, memberId) => {
  if (!churchId) throw new Error("churchId is required");
  const q = query(
    getProgressRef(), 
    where('churchId', '==', churchId),
    where('planId', '==', planId),
    where('memberId', '==', memberId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
};

export const markWeekCompleted = async (churchId, planId, weekId, weekNumber, userId, memberId) => {
  if (!churchId) throw new Error("churchId is required");
  
  // Check if already completed
  const q = query(
    getProgressRef(),
    where('churchId', '==', churchId),
    where('planId', '==', planId),
    where('weekId', '==', weekId),
    where('memberId', '==', memberId)
  );
  
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    return snapshot.docs[0].id; // Already completed
  }
  
  const docRef = await addDoc(getProgressRef(), {
    churchId,
    planId,
    weekId,
    userId,
    memberId,
    weekNumber,
    isCompleted: true,
    completedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  
  return docRef.id;
};

export const unmarkWeekCompleted = async (churchId, progressId) => {
  if (!churchId) throw new Error("churchId is required");
  await deleteDoc(doc(db, 'discipleshipProgress', progressId));
};

export const importDiscipleshipPlanJSON = async (churchId, userId, jsonData) => {
  if (!churchId) throw new Error("churchId is required");
  
  const { weeks, ...planData } = jsonData;
  
  // Remove id from planData if present so it doesn't conflict
  delete planData.id;

  const batch = writeBatch(db);
  
  // Create Plan
  const planRef = doc(getPlansRef());
  batch.set(planRef, {
    ...planData,
    churchId,
    status: 'draft', // Force draft
    createdBy: userId,
    updatedBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  
  // Create Weeks
  if (weeks && Array.isArray(weeks)) {
    weeks.forEach(week => {
      // Remove id from week if present
      delete week.id;
      
      const weekRef = doc(getWeeksRef());
      batch.set(weekRef, {
        ...week,
        churchId,
        planId: planRef.id,
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });
  }
  
  await batch.commit();
  return planRef.id;
};
