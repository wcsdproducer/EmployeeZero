import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { loadUserSOUL, saveUserSOUL } from "@/lib/soulAdmin";

export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (auth.error) return auth.error;
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agentId") || undefined;
  const soul = await loadUserSOUL(auth.userId!, agentId);
  return NextResponse.json({ soul });
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (auth.error) return auth.error;
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agentId") || undefined;
  const body = await req.json();
  await saveUserSOUL(auth.userId!, body, agentId);

  // Synchronize SOUL to ElevenLabs Conversational Voice Agent if connected
  try {
    const { adminDb } = await import("@/lib/admin");
    let apiKey: string | null = null;
    let elevenLabsAgentId: string | null = null;
    // Load global ElevenLabs credentials and agentId
    const connSnap = await adminDb.doc(`users/${auth.userId}/settings/connections`).get();
    if (connSnap.exists) {
      const data = connSnap.data();
      apiKey = data?.elevenlabs?.apiKey || null;
      if (!agentId || agentId === "primary") {
        elevenLabsAgentId = data?.elevenlabs?.apiSecret || null;
      }
    }

    if (agentId && agentId !== "primary") {
      // Fetch agent specific voice settings
      const agentSnap = await adminDb.doc(`users/${auth.userId}/agents/${agentId}`).get();
      if (agentSnap.exists) {
        const agentData = agentSnap.data();
        elevenLabsAgentId = agentData?.elevenLabsAgentId || null;
      }
    } else if (!elevenLabsAgentId) {
      // Legacy global voice settings fallback
      const docSnap = await adminDb.doc(`users/${auth.userId}/connections/elevenlabs`).get();
      if (docSnap.exists) {
        const data = docSnap.data();
        elevenLabsAgentId = data?.apiSecret || null;
      }
    }

    if (apiKey && elevenLabsAgentId) {
      const { buildSOULPrompt } = await import("@/lib/soul");
      const prompt = buildSOULPrompt(body);
      const hostUrl = process.env.NEXT_PUBLIC_APP_URL || "https://employeezero.app";
      const customLlmUrl = `${hostUrl}/api/elevenlabs/llm/v1/chat/completions?userId=${auth.userId}${agentId ? `&agentId=${agentId}` : ""}`;

      await fetch(`${hostUrl}/api/elevenlabs/agent`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          agentId: elevenLabsAgentId,
          prompt,
          customLlmUrl
        }),
      });
    }
  } catch (err) {
    console.error("Failed to sync SOUL to ElevenLabs:", err);
  }

  return NextResponse.json({ ok: true });
}
