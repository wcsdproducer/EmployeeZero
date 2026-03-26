import { NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Chat API — processes a mission using the user's own Gemini API key.
 *
 * 1. Loads conversation history (recent missions)
 * 2. Loads persistent memories from Firestore
 * 3. Calls Gemini with full context
 * 4. Auto-extracts & stores new memories
 * 5. Updates the mission doc with the result
 */

// ── Memory helpers ──────────────────────────────────────────────

async function loadMemories(userId: string, agentId: string): Promise<string[]> {
  try {
    // Simple query — no composite index needed
    const snap = await adminDb
      .collection(`users/${userId}/memories`)
      .limit(50)
      .get();

    return snap.docs
      .filter((d) => {
        const data = d.data();
        return !agentId || data.agentId === agentId;
      })
      .map((d) => d.data().content as string);
  } catch (err) {
    console.warn("Failed to load memories:", err);
    return [];
  }
}

async function storeMemories(userId: string, agentId: string, facts: string[]) {
  const batch = adminDb.batch();
  for (const fact of facts) {
    const ref = adminDb.collection(`users/${userId}/memories`).doc();
    batch.set(ref, {
      agentId,
      content: fact,
      createdAt: new Date().toISOString(),
    });
  }
  await batch.commit();
}

// ── Conversation history ────────────────────────────────────────

async function loadHistory(userId: string, currentMissionId: string) {
  try {
    // Simple query — only filter by userId to avoid composite index requirement
    const snap = await adminDb
      .collection("missions")
      .where("userId", "==", userId)
      .limit(50)
      .get();

    // Filter and sort in memory
    const completed = snap.docs
      .filter((d) => d.id !== currentMissionId && d.data().status === "completed")
      .sort((a, b) => {
        const aTime = a.data().createdAt?.toMillis?.() || a.data().createdAt?.seconds * 1000 || 0;
        const bTime = b.data().createdAt?.toMillis?.() || b.data().createdAt?.seconds * 1000 || 0;
        return aTime - bTime; // chronological order
      })
      .slice(-20); // last 20

    const messages: { role: "user" | "model"; parts: { text: string }[] }[] = [];
    for (const doc of completed) {
      const data = doc.data();
      messages.push({ role: "user", parts: [{ text: data.task }] });
      if (data.result) {
        messages.push({ role: "model", parts: [{ text: data.result }] });
      }
    }
    console.log(`Loaded ${messages.length} history messages for user ${userId}`);
    return messages;
  } catch (err) {
    console.warn("Failed to load history:", err);
    return [];
  }
}

// ── Main handler ────────────────────────────────────────────────

export async function POST(request: Request) {
  let parsedBody: { userId?: string; missionId?: string; task?: string; agentName?: string } = {};

  try {
    parsedBody = await request.json();
    const { userId, missionId, task, agentName } = parsedBody;

    if (!userId || !missionId || !task) {
      return NextResponse.json(
        { error: "Missing userId, missionId, or task" },
        { status: 400 }
      );
    }

    // 1. Get user's brain config
    const brainSnap = await adminDb.doc(`users/${userId}/settings/brain`).get();

    if (!brainSnap.exists) {
      await adminDb.doc(`missions/${missionId}`).update({
        status: "error",
        result: "⚠️ No AI brain configured. Go to **Connections** and add your API key to get started.",
      });
      return NextResponse.json({ error: "No brain configured" }, { status: 400 });
    }

    const brain = brainSnap.data() as { provider: string; apiKey: string };

    if (!brain.apiKey) {
      await adminDb.doc(`missions/${missionId}`).update({
        status: "error",
        result: "⚠️ API key is empty. Go to **Connections** and save your API key.",
      });
      return NextResponse.json({ error: "Empty API key" }, { status: 400 });
    }

    // 2. Update mission to "running"
    await adminDb.doc(`missions/${missionId}`).update({ status: "running" });

    // 3. Load context in parallel
    const agentId = "primary"; // default agent
    const [memories, history] = await Promise.all([
      loadMemories(userId, agentId),
      loadHistory(userId, missionId),
    ]);

    // 4. Build system prompt with memories
    const name = agentName || "Employee Zero";
    let systemPrompt = `You are ${name}, an elite AI employee. You are direct, strategic, and action-oriented. You provide clear, actionable intelligence. Format your responses with markdown when appropriate. Be concise but thorough.

You have persistent memory. You remember everything the user has told you across all conversations.`;

    if (memories.length > 0) {
      systemPrompt += `\n\n## Your Memories\nThese are facts you've learned about the user and important context from past conversations:\n${memories.map((m, i) => `${i + 1}. ${m}`).join("\n")}`;
    }

    systemPrompt += `\n\n## Memory Instructions
When the user tells you something important about themselves (their name, preferences, role, company, goals, instructions for you, etc.), you MUST extract those facts so they can be saved to your long-term memory.

In your response, if there are facts to remember, end your visible response, then on a new line add a section exactly like this:

<memory_extract>
- fact 1
- fact 2
</memory_extract>

The memory_extract section will be automatically processed and NOT shown to the user. Only include genuinely important, persistent facts — not ephemeral details about the current task.`;

    // 5. Call Gemini
    let result: string;

    if (brain.provider === "gemini") {
      const ai = new GoogleGenAI({ apiKey: brain.apiKey });

      const contents = [
        ...history,
        { role: "user" as const, parts: [{ text: task }] },
      ];

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
          systemInstruction: systemPrompt,
        },
      });

      result = response.text || "I processed your request but generated no output. Please try again.";
    } else {
      result = `⚠️ ${brain.provider} is not yet supported. Please switch to Gemini in your Connections settings.`;
    }

    // 6. Extract and store memories from response
    const memoryMatch = result.match(/<memory_extract>([\s\S]*?)<\/memory_extract>/);
    if (memoryMatch) {
      const facts = memoryMatch[1]
        .split("\n")
        .map((line) => line.replace(/^-\s*/, "").trim())
        .filter((line) => line.length > 0);

      if (facts.length > 0) {
        await storeMemories(userId, agentId, facts);
      }

      // Remove the memory extract section from the visible response
      result = result.replace(/<memory_extract>[\s\S]*?<\/memory_extract>/, "").trim();
    }

    // 7. Update mission with result
    await adminDb.doc(`missions/${missionId}`).update({
      status: "completed",
      result,
      completedAt: new Date().toISOString(),
    });

    return NextResponse.json({ status: "completed", result });
  } catch (err: any) {
    console.error("Chat API error:", err);

    try {
      if (parsedBody.missionId) {
        await adminDb.doc(`missions/${parsedBody.missionId}`).update({
          status: "error",
          result: `❌ Error: ${err.message || "Unknown error occurred"}. Check your API key in Connections.`,
        });
      }
    } catch {}

    return NextResponse.json(
      { error: err.message || "Chat processing failed" },
      { status: 500 }
    );
  }
}
