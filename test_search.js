const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'employee-zero-production'
    });
}

const db = admin.firestore();
const userId = 'iDlOWBqU4ocwHB3D7fTJG3FBAxY2';
const query = 'employee zero';

async function run() {
    console.log("Testing search_conversations logic...");
    let convSnap;
    try {
        console.log("Attempting primary query with orderBy...");
        convSnap = await db
          .collection("conversations")
          .where("userId", "==", userId)
          .orderBy("createdAt", "desc")
          .limit(500)
          .get();
        console.log("Primary query succeeded, found docs:", convSnap.size);
    } catch (err) {
        console.log("Primary query failed:", err.message);
        console.log("Attempting fallback query...");
        try {
            convSnap = await db
              .collection("conversations")
              .where("userId", "==", userId)
              .limit(500)
              .get();
            console.log("Fallback query succeeded, found docs:", convSnap.size);
        } catch (fallbackErr) {
            console.log("Fallback query failed:", fallbackErr.message);
            process.exit(1);
        }
    }

    const matches = [];
    const queryLower = query.toLowerCase();
    
    for (const doc of convSnap.docs) {
        const data = doc.data();
        const messages = data.messages || [];
        const allText = messages.map(m => m.content || "").join(" ").toLowerCase();
        
        if (allText.includes(queryLower)) {
            const relevant = messages
                .filter(m => (m.content || "").toLowerCase().includes(queryLower))
                .slice(0, 3)
                .map(m => ({ role: m.role, content: (m.content || "").substring(0, 300) }));
            
            matches.push({
                id: doc.id,
                title: data.title || "Untitled",
                date: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || "unknown",
                messageCount: messages.length,
                matchingExcerpts: relevant,
            });
        }
    }

    console.log(`\nFound ${matches.length} matching conversations:`);
    matches.forEach(m => {
        console.log(`- ID: ${m.id} | Title: "${m.title}" | Excerpt count: ${m.matchingExcerpts.length}`);
    });
    
    process.exit(0);
}

run().catch(console.error);
