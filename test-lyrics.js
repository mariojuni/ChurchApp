import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const app = initializeApp({ apiKey: process.env.VITE_FIREBASE_API_KEY, projectId: process.env.VITE_FIREBASE_PROJECT_ID });
const db = getFirestore(app);

async function test() {
  const snap = await getDocs(collection(db, "songs"));
  snap.docs.forEach(d => {
    console.log(d.id, "=>", d.data().title, "| Lyrics:", !!d.data().lyrics);
  });
}
test().catch(console.error);
