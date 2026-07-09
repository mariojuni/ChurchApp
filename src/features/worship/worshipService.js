import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

// Songs
export const getSongs = async (churchId) => {
  const q = query(
    collection(db, 'songs'),
    where('churchId', '==', churchId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getSong = async (id) => {
  const docRef = doc(db, 'songs', id);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() };
  }
  return null;
};

export const createSong = async (songData) => {
  const docRef = await addDoc(collection(db, 'songs'), {
    ...songData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  return docRef.id;
};

export const updateSong = async (id, songData) => {
  const docRef = doc(db, 'songs', id);
  await updateDoc(docRef, {
    ...songData,
    updatedAt: new Date().toISOString()
  });
};

export const deleteSong = async (id) => {
  await deleteDoc(doc(db, 'songs', id));
};

// Song Versions
export const createSongVersion = async (versionData) => {
  const docRef = await addDoc(collection(db, 'songVersions'), {
    ...versionData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  return docRef.id;
};

// Duplicate Check
export const checkDuplicateSong = async (churchId, title, ccliSongNumber) => {
  if (!churchId || (!title && !ccliSongNumber)) return [];
  
  // Firestore doesn't support OR queries across different fields perfectly without compound queries, 
  // so we fetch by churchId and filter in memory, or we can fetch by title separately.
  // We'll query by churchId and title first.
  const qTitle = query(
    collection(db, 'songs'),
    where('churchId', '==', churchId),
    where('title', '==', title)
  );
  const snapshotTitle = await getDocs(qTitle);
  let duplicates = snapshotTitle.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  if (ccliSongNumber) {
    const qCcli = query(
      collection(db, 'songs'),
      where('churchId', '==', churchId),
      where('ccliSongNumber', '==', ccliSongNumber)
    );
    const snapshotCcli = await getDocs(qCcli);
    snapshotCcli.docs.forEach(doc => {
      if (!duplicates.find(d => d.id === doc.id)) {
        duplicates.push({ id: doc.id, ...doc.data() });
      }
    });
  }

  return duplicates;
};

// Import Settings
export const getSongImportSettings = async (churchId) => {
  if (!churchId) return null;
  const q = query(
    collection(db, 'songImportSettings'),
    where('churchId', '==', churchId)
  );
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  }
  return null;
};

export const updateSongImportSettings = async (churchId, settingsData) => {
  const existing = await getSongImportSettings(churchId);
  if (existing) {
    const docRef = doc(db, 'songImportSettings', existing.id);
    await updateDoc(docRef, {
      ...settingsData,
      updatedAt: new Date().toISOString()
    });
    return existing.id;
  } else {
    const docRef = await addDoc(collection(db, 'songImportSettings'), {
      churchId,
      ...settingsData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return docRef.id;
  }
};

// Setlists
export const getSetlists = async (churchId) => {
  const q = query(
    collection(db, 'worshipSetlists'),
    where('churchId', '==', churchId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getSetlist = async (id) => {
  const docRef = doc(db, 'worshipSetlists', id);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() };
  }
  return null;
};

export const getSetlistByEvent = async (eventId) => {
  const q = query(
    collection(db, 'worshipSetlists'),
    where('eventId', '==', eventId)
  );
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  }
  return null;
};

export const createSetlist = async (setlistData) => {
  const docRef = await addDoc(collection(db, 'worshipSetlists'), {
    ...setlistData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  return docRef.id;
};

export const updateSetlist = async (id, setlistData) => {
  const docRef = doc(db, 'worshipSetlists', id);
  await updateDoc(docRef, {
    ...setlistData,
    updatedAt: new Date().toISOString()
  });
};

export const deleteSetlist = async (id) => {
  await deleteDoc(doc(db, 'worshipSetlists', id));
};

// Setlist Items
export const getSetlistItems = async (setlistId) => {
  const q = query(
    collection(db, 'worshipSetlistItems'),
    where('setlistId', '==', setlistId),
    orderBy('order', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const createSetlistItem = async (itemData) => {
  const docRef = await addDoc(collection(db, 'worshipSetlistItems'), {
    ...itemData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  return docRef.id;
};

export const updateSetlistItem = async (id, itemData) => {
  const docRef = doc(db, 'worshipSetlistItems', id);
  await updateDoc(docRef, {
    ...itemData,
    updatedAt: new Date().toISOString()
  });
};

export const deleteSetlistItem = async (id) => {
  await deleteDoc(doc(db, 'worshipSetlistItems', id));
};
