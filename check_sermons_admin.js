// Quick debug: check what's in the sermons collection
// Run: node check_sermons_admin.js
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyATJtgk582X0ik4GwqXes64uE6OMxsXrfw",
  authDomain: "nazarenechurch-9c030.firebaseapp.com",
  projectId: "nazarenechurch-9c030",
  storageBucket: "nazarenechurch-9c030.firebasestorage.app",
  messagingSenderId: "676505939287",
  appId: "1:676505939287:web:f2e467529a4286dceda212",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Use the Admin SDK approach — bypass security rules
async function main() {
  console.log('\n=== Checking sermons (no auth — will fail if rules block) ===\n');
  try {
    const q = query(collection(db, 'sermons'), limit(20));
    const snap = await getDocs(q);
    if (snap.empty) {
      console.log('❌ EMPTY — No documents in sermons collection at all.');
      console.log('   Possible reasons:');
      console.log('   1. handlePublish failed silently (check the Review step error message in UI)');
      console.log('   2. Upload to Storage succeeded but setDoc failed');
      console.log('   3. The document is saved to a subcollection like churches/{id}/sermons instead');
    } else {
      console.log(`✅ Found ${snap.docs.length} sermon(s):\n`);
      snap.docs.forEach(d => {
        const data = d.data();
        console.log(`ID: ${d.id}`);
        console.log(`  churchId:   "${data.churchId}"`);
        console.log(`  title:      "${data.title}"`);
        console.log(`  status:     "${data.status}"`);
        console.log(`  sermonDate: "${data.sermonDate}"`);
        console.log(`  videoUrl:   ${data.videoUrl ? '✅ present' : '❌ missing'}`);
        console.log(`  audioUrl:   ${data.audioUrl ? '✅ present' : '❌ missing'}`);
        console.log('');
      });
    }
  } catch (err) {
    if (err.code === 'permission-denied') {
      console.log('🔒 Permission denied (expected without auth).');
      console.log('   This means Firestore rules are enforcing auth — GOOD.');
      console.log('   The web app must be logged in to read sermons.');
      console.log('   THE RULES ARE NOT THE PROBLEM.');
      console.log('\n   NEXT STEP: Open the browser console (F12 > Console tab)');
      console.log('   while on the Sermons page and look for any red errors.');
    } else {
      console.error('Unexpected error:', err);
    }
  }
  process.exit(0);
}
main();
