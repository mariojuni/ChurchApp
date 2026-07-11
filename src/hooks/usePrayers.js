import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

export function usePrayers() {
  const { userProfile } = useAuth();
  const CHURCH_ID = userProfile?.churchId || 'YmEc6C69Xz4DKRQaQZBV';
  const [prayers, setPrayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!CHURCH_ID) return;
    const q = query(collection(db, 'churches', CHURCH_ID, 'prayer_requests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prayersData = [];
      snapshot.forEach((doc) => {
        prayersData.push({ id: doc.id, ...doc.data() });
      });
      setPrayers(prayersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching prayers:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [CHURCH_ID]);

  return { prayers, loading };
}
