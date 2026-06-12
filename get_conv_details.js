const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'employee-zero-production'
    });
}

const db = admin.firestore();

async function run() {
    const doc = await db.collection('conversations').doc('lobG7Js77FpkKNyATv1G').get();
    if (!doc.exists) {
        console.log("No such document!");
    } else {
        console.log(JSON.stringify(doc.data(), null, 2));
    }
    process.exit(0);
}

run().catch(console.error);
