import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ projectId: 'employee-zero-production' });
const db = getFirestore();

async function check() {
  const snaps = await db.collection('scheduled_posts').get();
  let results = [];
  snaps.docs.forEach(doc => {
    const data = doc.data();
    if (data.brandId === 'catfishbait' || data.brandId === 'catfish_bait') {
      results.push(data);
    }
  });

  results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  
  for (let i = 0; i < 20; i++) {
    if (results[i]) {
      console.log(`[${results[i].createdAt}] ${results[i].platform}: status=${results[i].status}, error=${results[i].error}`);
    }
  }
}
check();
