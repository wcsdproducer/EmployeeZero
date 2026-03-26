import { NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";
import { GoogleGenAI } from "@google/genai";

/**
 * Chat API — processes a mission using the user's own Gemini API key.
 *
 * 1. Reads the user's brain config from Firestore (settings/brain)
 * 2. Calls Gemini with the user's task
 * 3. Updates the mission doc with the result
 */

export async function POST(request: Request) {
  try {
    const { userId, missionId, task, agentName } = await request.json();

    if (!userId || !missionId || !task) {
      return NextResponse.json(
        { error: "Missing userId, missionId, or task" },
        { status: 400 }
      );
    }

    // 1. Get user's brain config
    const brainSnap = await adminDb
      .doc(`users/${userId}/settings/brain`)
      .get();

    if (!brainSnap.exists) {
      await adminDb.doc(`missions/${missionId}`).update({
        status: "error",
        result: "⚠️ No AI brain configured. Go to **Connections** and add your API key to get started.",
      });
      return NextResponse.json(
        { error: "No brain configured" },
        { status: 400 }
      );
    }

    const brain = brainSnap.data() as {
      provider: string;
      apiKey: string;
      verified: boolean;
    };

    if (!brain.apiKey) {
      await adminDb.doc(`missions/${missionId}`).update({
        status: "error",
        result: "⚠️ API key is empty. Go to **Connections** and save your API key.",
      });
      return NextResponse.json(
        { error: "Empty API key" },
        { status: 400 }
      );
    }

    // 2. Update mission to "running"
    await adminDb.doc(`missions/${missionId}`).update({
      status: "running",
    });

    // 3. Call the LLM
    let result: string;

    if (brain.provider === "gemini") {
      const ai = new GoogleGenAI({ apiKey: brain.apiKey });
      const name = agentName || "Employee Zero";

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: task }],
          },
        ],
        config: {
          systemInstruction: `You are ${name}, an elite AI employee. You are direct, strategic, and action-oriented. You provide clear, actionable intelligence. Format your responses with markdown when appropriate. Be concise but thorough.`,
        },
      });

      result = response.text || "I processed your request but generated no output. Please try again.";
    } else {
      // For now, only Gemini is supported server-side
      result = `⚠️ ${brain.provider} is not yet supported for server-side processing. Please switch to Gemini in your Connections settings.`;
    }

    // 4. Update mission with result
    await adminDb.doc(`missions/${missionId}`).update({
      status: "completed",
      result,
      completedAt: new Date().toISOString(),
    });

    return NextResponse.json({ status: "completed", result });
  } catch (err: any) {
    console.error("Chat API error:", err);

    // Try to update the mission with an error state
    try {
      const { missionId } = await request.clone().json();
      if (missionId) {
        await adminDb.doc(`missions/${missionId}`).update({
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
