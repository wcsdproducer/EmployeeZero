import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/admin";

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (auth.error) return auth.error;

  const { agentId, customAvatar } = await req.json();

  if (!agentId || !customAvatar) {
    return NextResponse.json({ error: "Missing agentId or customAvatar" }, { status: 400 });
  }

  try {
    // Client compresses images before sending — just validate size
    const dataUrlSize = customAvatar.length;
    
    if (dataUrlSize > 1_000_000) {
      console.warn(`[AvatarSave] Image still too large after client compression (${(dataUrlSize/1024).toFixed(0)}KB)`);
      return NextResponse.json({ 
        error: "Image too large. Please try generating a simpler avatar." 
      }, { status: 413 });
    }

    await adminDb.doc(`users/${auth.userId}/agents/${agentId}`).update({
      customAvatar,
    });

    console.log(`[AvatarSave] Saved avatar for agent ${agentId} (${(dataUrlSize/1024).toFixed(0)}KB)`);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[AvatarSave] Failed:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
