import { NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";
import { verifyAuth } from "@/lib/auth";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const auth = await verifyAuth(req as any);
    if (auth.error || !auth.userId)
      return auth.error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { description } = await req.json();
    if (!description || typeof description !== "string") {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }

    // Get the USER's Gemini API key (bills to their account, not ours)
    let apiKey = "";
    try {
      const brainSnap = await adminDb.doc(`users/${auth.userId}/settings/brain`).get();
      if (brainSnap.exists) {
        const brainData = brainSnap.data();
        const key = brainData?.geminiApiKey || brainData?.apiKey || "";
        if (key) apiKey = key.trim();
      }
    } catch {}

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key required. Add it in Connections." },
        { status: 400 }
      );
    }

    // Generate 1 avatar image using gemini-2.0-flash-exp (supports image output)
    const avatarPrompt = `Generate a small profile picture avatar image. ${description}. Style: digital art portrait, clean, square format. No text or watermarks.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: avatarPrompt }],
            },
          ],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
            imageGenerationConfig: {
              numberOfImages: 1,
              aspectRatio: "1:1",
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("[AvatarGen] Gemini error:", errText);
      return NextResponse.json({ error: "Failed to generate avatar. Check your API key." }, { status: 500 });
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));

    if (!imagePart) {
      console.error("[AvatarGen] No image in response:", JSON.stringify(data).substring(0, 300));
      return NextResponse.json({ error: "No image generated. Try a different description." }, { status: 500 });
    }

    return NextResponse.json({
      avatars: [{
        image: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType,
      }],
    });
  } catch (error: any) {
    console.error("[AvatarGen] Error:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
