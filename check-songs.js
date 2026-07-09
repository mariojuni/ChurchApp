import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const snapshot = await getDocs(collection(db, "songs"));
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log("Song:", data.title, "HasLyrics:", !!data.lyrics, "LyricsLength:", data.lyrics ? data.lyrics.length : 0);
  });
}
check().catch(console.error);
