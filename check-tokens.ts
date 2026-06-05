import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ projectId: 'employee-zero-production' });
const db = getFirestore();

async function check() {
  const doc = await db.collection('workspace_social_tokens').doc('catfishbait').get();
  if (doc.exists) {
    const data = doc.data();
    console.log(data);
  } else {
    console.log("No tokens found for catfishbait");
  }
}
check();
