import { NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";
import { GoogleGenAI } from "@google/genai";

/**
 * Chat API — conversation-based, with persistent memory.
 *
 * Accepts a conversationId + new user message.
 * Loads the conversation's existing messages, memories, and calls Gemini.
 * Appends both the user message and AI response to the conversation doc.
 */

// ── Types ───────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "model";
  content: string;
  timestamp: string;
}

// ── Memory helpers ──────────────────────────────────────────────

async function loadMemories(userId: string): Promise<string[]> {
  try {
    const snap = await adminDb
      .collection(`users/${userId}/memories`)
      .limit(50)
      .get();
    return snap.docs.map((d) => d.data().content as string);
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

// ── Main handler ────────────────────────────────────────────────

export async function POST(request: Request) {
  let parsedBody: {
    userId?: string;
    conversationId?: string;
    message?: string;
    agentName?: string;
  } = {};

  try {
    parsedBody = await request.json();
    const { userId, conversationId, message, agentName } = parsedBody;

    if (!userId || !conversationId || !message) {
      return NextResponse.json(
        { error: "Missing userId, conversationId, or message" },
        { status: 400 }
      );
    }

    // 1. Get user's brain config
    const brainSnap = await adminDb.doc(`users/${userId}/settings/brain`).get();

    if (!brainSnap.exists) {
      return NextResponse.json({ error: "No brain configured" }, { status: 400 });
    }

    const brain = brainSnap.data() as { provider: string; apiKey: string };
    if (!brain.apiKey) {
      return NextResponse.json({ error: "Empty API key" }, { status: 400 });
    }

    // 2. Load conversation doc to get existing messages
    const convRef = adminDb.doc(`conversations/${conversationId}`);
    const convSnap = await convRef.get();
    const existingMessages: ChatMessage[] = convSnap.exists
      ? (convSnap.data()?.messages || [])
      : [];

    // 3. Update status to running
    await convRef.update({ status: "running" });

    // 4. Load memories
    const memories = await loadMemories(userId);

    // 5. Build system prompt
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

    // 6. Build Gemini contents from conversation history + new message
    const contents = [
      ...existingMessages.map((m) => ({
        role: m.role as "user" | "model",
        parts: [{ text: m.content }],
      })),
      { role: "user" as const, parts: [{ text: message }] },
    ];

    // 7. Call Gemini
    let result: string;

    if (brain.provider === "gemini") {
      const ai = new GoogleGenAI({ apiKey: brain.apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: { systemInstruction: systemPrompt },
      });
      result = response.text || "I processed your request but generated no output. Please try again.";
    } else {
      result = `⚠️ ${brain.provider} is not yet supported. Please switch to Gemini in your Connections settings.`;
    }

    // 8. Extract and store memories
    const memoryMatch = result.match(/<memory_extract>([\s\S]*?)<\/memory_extract>/);
    if (memoryMatch) {
      const facts = memoryMatch[1]
        .split("\n")
        .map((line) => line.replace(/^-\s*/, "").trim())
        .filter((line) => line.length > 0);
      if (facts.length > 0) await storeMemories(userId, "primary", facts);
      result = result.replace(/<memory_extract>[\s\S]*?<\/memory_extract>/, "").trim();
    }

    // 9. Append both messages to conversation doc
    const now = new Date().toISOString();
    const updatedMessages: ChatMessage[] = [
      ...existingMessages,
      { role: "user", content: message, timestamp: now },
      { role: "model", content: result, timestamp: now },
    ];

    await convRef.update({
      messages: updatedMessages,
      status: "idle",
      updatedAt: now,
    });

    return NextResponse.json({ status: "completed", result });
  } catch (err: any) {
    console.error("Chat API error:", err);

    // Try to reset conversation status
    try {
      if (parsedBody.conversationId) {
        const convRef = adminDb.doc(`conversations/${parsedBody.conversationId}`);
        const snap = await convRef.get();
        if (snap.exists) {
          await convRef.update({
            status: "error",
            lastError: err.message || "Unknown error",
          });
        }
      }
    } catch {}

    return NextResponse.json(
      { error: err.message || "Chat processing failed" },
      { status: 500 }
    );
  }
}
