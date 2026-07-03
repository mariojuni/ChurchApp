import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { seedMembers } from '../utils/seedData';
import { addDoc, serverTimestamp } from 'firebase/firestore';

export function useMembers() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        console.log("No users found. Seeding members into users collection...");
        for (const m of seedMembers) {
          try {
            await addDoc(collection(db, 'users'), {
              ...m,
              createdAt: serverTimestamp()
            });
          } catch (e) {
            console.error("Error seeding user:", e);
          }
        }
      } else {
        const membersData = [];
        snapshot.forEach((doc) => {
          membersData.push({ id: doc.id, ...doc.data() });
        });
        setMembers(membersData);
        setLoading(false);
      }
    }, (error) => {
      console.error("Error fetching members:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { members, loading };
}
