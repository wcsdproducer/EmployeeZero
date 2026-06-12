import { adminDb } from "./src/lib/admin";

async function main() {
  const userId = "iDlOWBqU4ocwHB3D7fTJG3FBAxY2"; // john@t3kniq.com
  console.log("Auditing conversations for user:", userId);

  const convSnap = await adminDb
    .collection("conversations")
    .where("userId", "==", userId)
    .get();

  console.log("Total conversations to audit:", convSnap.size);

  let successCount = 0;
  let failCount = 0;

  for (const doc of convSnap.docs) {
    const data = doc.data();
    try {
      // Replicate the exact map logic in search_conversations
      const query = "linkedin";
      const maxResults = 5;
      const messages = data.messages || [];
      const allText = messages.map((m: any) => {
        if (!m) throw new Error("Null message element found in messages array!");
        return m.content || "";
      }).join(" ").toLowerCase();
      
      if (allText.includes(query)) {
        const relevant = messages
          .filter((m: any) => {
            if (!m) throw new Error("Null message element in filter!");
            return (m.content || "").toLowerCase().includes(query);
          })
          .slice(0, 3)
          .map((m: any) => {
            if (!m) throw new Error("Null message element in map!");
            return { role: m.role, content: (m.content || "").substring(0, 300) };
          });
        
        const match = {
          id: doc.id,
          title: data.title || "Untitled",
          date: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || "unknown",
          messageCount: messages.length,
          matchingExcerpts: relevant,
        };
      }
      successCount++;
    } catch (err: any) {
      failCount++;
      console.error(`❌ FAILED on doc ID: ${doc.id}`);
      console.error(`   Error message: ${err.message}`);
      console.error(`   Data keys:`, Object.keys(data));
      console.error(`   Messages type:`, typeof data.messages, Array.isArray(data.messages) ? `Array length ${data.messages.length}` : "Not Array");
    }
  }

  console.log(`\nAudit Complete: Success: ${successCount}, Fail: ${failCount}`);
}

main().catch(console.error);
