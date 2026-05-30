import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { loadUserSOUL, saveUserSOUL } from "@/lib/soulAdmin";

export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (auth.error) return auth.error;
  const soul = await loadUserSOUL(auth.userId!);
  return NextResponse.json({ soul });
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (auth.error) return auth.error;
  const body = await req.json();
  await saveUserSOUL(auth.userId!, body);

  // Synchronize SOUL to ElevenLabs Conversational Voice Agent if connected
  try {
    const { adminDb } = await import("@/lib/admin");
    const docSnap = await adminDb.doc(`users/${auth.userId}/connections/elevenlabs`).get();
    
    if (docSnap.exists) {
      const data = docSnap.data();
      const apiKey = data?.apiKey;
      const agentId = data?.apiSecret; // We store agent_id in apiSecret for custom integrations
      
      if (apiKey && agentId) {
        const { buildSOULPrompt } = await import("@/lib/soul");
        const prompt = buildSOULPrompt(body); // Do NOT append memory notes since Custom LLM handles it!
        const hostUrl = process.env.NEXT_PUBLIC_APP_URL || "https://employeezero.app";
        const customLlmUrl = `${hostUrl}/api/elevenlabs/llm/v1/chat/completions?userId=${auth.userId}`;
        
        await fetch(`${hostUrl}/api/elevenlabs/agent`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey,
            agentId,
            prompt,
            customLlmUrl
          }),
        });
      }
    }
  } catch (err) {
    console.error("Failed to sync SOUL to ElevenLabs:", err);
  }

  return NextResponse.json({ ok: true });
}
