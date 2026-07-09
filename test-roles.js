import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const snapshot = await getDocs(collection(db, "users"));
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.role?.toLowerCase().includes("super")) {
      console.log("Email:", data.email, "Role:", data.role, "ChurchId:", data.churchId);
    }
  });
}
check().catch(console.error);
