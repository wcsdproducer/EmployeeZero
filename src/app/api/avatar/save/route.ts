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
    // Parse the data URL
    const match = customAvatar.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: "Invalid data URL format" }, { status: 400 });
    }

    const mimeType = match[1];
    const base64Data = match[2];
    const originalSize = base64Data.length;

    // Firestore field limit is ~1MB. The base64 data URL must be under that.
    // If the image is too large, compress it by reducing quality.
    // A 512x512 avatar as JPEG at quality 80 is typically 30-80KB.
    // As PNG it can be 200-1600KB.
    // Strategy: if > 800KB, re-encode as WebP/JPEG via canvas on server.
    // For now: truncate base64 if too large (shouldn't happen with proper gen config).
    
    let avatarToSave = customAvatar;
    const dataUrlSize = avatarToSave.length;

    if (dataUrlSize > 900_000) {
      // Image too large for Firestore (1MB limit per field).
      // Compress by converting PNG base64 → smaller quality.
      // Use sharp if available, otherwise try canvas-less approach.
      console.log(`[AvatarSave] Image too large (${(dataUrlSize/1024).toFixed(0)}KB). Compressing...`);
      
      try {
        // Try using sharp for server-side image compression
        const sharp = require("sharp");
        const inputBuffer = Buffer.from(base64Data, "base64");
        
        // Resize to 256x256 and convert to JPEG at quality 75
        const compressed = await sharp(inputBuffer)
          .resize(256, 256, { fit: "cover" })
          .jpeg({ quality: 75 })
          .toBuffer();
        
        avatarToSave = `data:image/jpeg;base64,${compressed.toString("base64")}`;
        console.log(`[AvatarSave] Compressed: ${(dataUrlSize/1024).toFixed(0)}KB → ${(avatarToSave.length/1024).toFixed(0)}KB`);
      } catch (sharpErr) {
        // Sharp not available — try a simpler approach: just reduce the base64
        // by requesting a smaller image. For now, store a truncated version.
        console.warn("[AvatarSave] Sharp not available, attempting raw resize...");
        
        // Last resort: Store only first 900KB of the data URL
        // This will produce a broken image but at least won't crash
        // In practice, we should install sharp as a dependency
        return NextResponse.json({ 
          error: "Image too large for storage. Please try generating a simpler avatar." 
        }, { status: 413 });
      }
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
