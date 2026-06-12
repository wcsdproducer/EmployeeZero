import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/admin";
import sharp from "sharp";

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (auth.error) return auth.error;

  const { agentId, customAvatar } = await req.json();

  if (!agentId || !customAvatar) {
    return NextResponse.json({ error: "Missing agentId or customAvatar" }, { status: 400 });
  }

  try {
    // Parse the data URL
    const match = customAvatar.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: "Invalid data URL format" }, { status: 400 });
    }

    const base64Data = match[2];
    let avatarToSave = customAvatar;
    const dataUrlSize = avatarToSave.length;

    // Firestore field limit is ~1MB. Always compress to be safe.
    if (dataUrlSize > 900_000) {
      console.log(`[AvatarSave] Image too large (${(dataUrlSize/1024).toFixed(0)}KB). Compressing...`);
      
      const inputBuffer = Buffer.from(base64Data, "base64");
      
      // Resize to 256x256 and convert to JPEG at quality 80
      const compressed = await sharp(inputBuffer)
        .resize(256, 256, { fit: "cover" })
        .jpeg({ quality: 80 })
        .toBuffer();
      
      avatarToSave = `data:image/jpeg;base64,${compressed.toString("base64")}`;
      console.log(`[AvatarSave] Compressed: ${(dataUrlSize/1024).toFixed(0)}KB → ${(avatarToSave.length/1024).toFixed(0)}KB`);
    }

    await adminDb.doc(`users/${auth.userId}/agents/${agentId}`).update({
      customAvatar: avatarToSave,
    });

    console.log(`[AvatarSave] Saved avatar for agent ${agentId} (${(avatarToSave.length/1024).toFixed(0)}KB)`);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[AvatarSave] Failed:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
