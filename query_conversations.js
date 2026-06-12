const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'employee-zero-production'
    });
}

const db = admin.firestore();
const targetUid = 'iDlOWBqU4ocwHB3D7fTJG3FBAxY2'; // john@t3kniq.com

async function run() {
    const convSnap = await db.collection('conversations')
        .where('userId', '==', targetUid)
        .get();
    
    console.log(`Total conversations: ${convSnap.size}`);
    let matchCount = 0;
    convSnap.forEach(doc => {
        if (doc.id === 'lobG7Js77FpkKNyATv1G') return; // skip current
        
        const data = doc.data();
        const messages = data.messages || [];
        const allText = messages.map(m => m.content || "").join(" ").toLowerCase();
        
        if (allText.includes('linkedin')) {
            matchCount++;
            console.log(`[${matchCount}] ID: ${doc.id} | Title: "${data.title}" | Created: ${data.createdAt?.toDate?.()?.toISOString() || data.createdAt}`);
            messages.forEach((m, idx) => {
                if (m.content.toLowerCase().includes('linkedin') && m.content.toLowerCase().includes('draft')) {
                    console.log(`   - Message ${idx} (${m.role}): ${m.content.substring(0, 180)}...`);
                }
            });
        }
    });

    process.exit(0);
}

run().catch(console.error);
