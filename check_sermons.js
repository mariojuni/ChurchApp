import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function main() {
  console.log('\n=== Checking sermons collection ===\n');
  const snap = await getDocs(collection(db, 'sermons'));
  
  if (snap.empty) {
    console.log('❌ NO DOCUMENTS FOUND in the "sermons" collection.');
    console.log('   Either no sermon was uploaded, or it was saved to a different path (e.g. a subcollection).');
  } else {
    console.log(`✅ Found ${snap.docs.length} sermon(s):\n`);
    snap.docs.forEach(d => {
      const data = d.data();
      console.log('--- Sermon ---');
      console.log(`  ID:        ${d.id}`);
      console.log(`  churchId:  ${data.churchId}`);
      console.log(`  title:     ${data.title}`);
      console.log(`  status:    ${data.status}`);
      console.log(`  sermonDate:${data.sermonDate}`);
      console.log(`  videoUrl:  ${data.videoUrl ? '✅ present' : '❌ missing'}`);
      console.log(`  audioUrl:  ${data.audioUrl ? '✅ present' : '❌ missing'}`);
      console.log('');
    });
  }
  
  process.exit(0);
}
main().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
