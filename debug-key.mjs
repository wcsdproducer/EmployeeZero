import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'employee-zero-production' });
}
const db = admin.firestore();

const docs = await db.collection('users').listDocuments();
for (const d of docs) {
  console.log('User:', d.id);
  const brain = await d.collection('settings').doc('brain').get();
  if (brain.exists) {
    const data = brain.data();
    console.log('  Brain apiKey:', data.apiKey ? data.apiKey.substring(0, 15) + '...' : 'none');
    console.log('  Brain provider:', data.provider || 'none');
  }
}
process.exit(0);
