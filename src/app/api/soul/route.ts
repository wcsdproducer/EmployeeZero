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
        const prompt = buildSOULPrompt(body) + "\n\nYou have access to the user's personal memory database. You can search these memories at any time to answer questions about the user or their past interactions.";
        
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/elevenlabs/agent`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey,
            agentId,
            prompt
          }),
        });
      }
    }
  } catch (err) {
    console.error("Failed to sync SOUL to ElevenLabs:", err);
  }

  return NextResponse.json({ ok: true });
}
