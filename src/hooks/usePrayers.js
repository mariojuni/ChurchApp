import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

export function usePrayers() {
  const [prayers, setPrayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'prayers'), orderBy('createdAt', 'desc'));
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
  }, []);

  return { prayers, loading };
}
