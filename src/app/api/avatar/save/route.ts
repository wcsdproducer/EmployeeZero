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
    await adminDb.doc(`users/${auth.userId}/agents/${agentId}`).update({
      customAvatar,
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[AvatarSave] Failed:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
