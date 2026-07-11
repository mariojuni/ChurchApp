import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyATJtgk582X0ik4GwqXes64uE6OMxsXrfw",
  authDomain: "nazarenechurch-9c030.firebaseapp.com",
  projectId: "nazarenechurch-9c030",
  storageBucket: "nazarenechurch-9c030.firebasestorage.app",
  messagingSenderId: "676505939287",
  appId: "1:676505939287:web:f2e467529a4286dceda212",
  measurementId: "G-MBYCGYVF2F"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const snap = await getDocs(collection(db, 'givingRecords'));
  console.log(`Found ${snap.docs.length} giving records.`);
  snap.docs.forEach(doc => {
    const data = doc.data();
    console.log(`ID: ${doc.id}, churchId: ${data.churchId}, status: ${data.status}, amount: ${data.amount}`);
  });
  
  process.exit(0);
}
main().catch(console.error);
