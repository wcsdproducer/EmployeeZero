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
    // Fallback chain: user brain key → platform env key
    const platformKey = process.env.GOOGLE_GENAI_API_KEY?.trim() || null;
    let apiKey = "";

    try {
      const brainSnap = await adminDb.doc(`users/${auth.userId}/settings/brain`).get();
      if (brainSnap.exists) {
        const brain = brainSnap.data() as any;
        const key = brain?.apiKey || "";
        if (key && key.length > 20 && !key.includes("dummy") && !key.includes("placeholder")) {
          apiKey = key.trim();
        }
      }
    } catch (e: any) {
      console.error("[AvatarGen] Error reading brain settings:", e.message);
    }

    // Fallback to platform key
    if (!apiKey && platformKey) {
      apiKey = platformKey;
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key required. Add it in Connections." },
        { status: 400 }
      );
    }

    // Generate 1 avatar image
    const avatarPrompt = `Generate a 1:1 square profile picture avatar image. ${description}. Style: digital art portrait, clean, square 512x512 format. No text or watermarks.`;

    // Try image-generation-capable models in order of speed
    const models = ["gemini-2.5-flash-preview-image-generation", "gemini-2.0-flash-exp"];
    let lastError = "";

    for (const model of models) {
      try {
        console.log(`[AvatarGen] Trying model: ${model}`);
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
              },
            }),
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          console.error(`[AvatarGen] ${model} error (${response.status}):`, errText.substring(0, 500));
          lastError = `${model}: ${response.status} - ${errText.substring(0, 200)}`;
          continue; // try next model
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));

        if (!imagePart) {
          console.error(`[AvatarGen] ${model} returned no image. Response:`, JSON.stringify(data).substring(0, 500));
          lastError = `${model}: No image in response`;
          continue; // try next model
        }

        console.log(`[AvatarGen] Success with model: ${model}`);
        return NextResponse.json({
          avatars: [{
            image: imagePart.inlineData.data,
            mimeType: imagePart.inlineData.mimeType,
          }],
        });
      } catch (err: any) {
        console.error(`[AvatarGen] ${model} exception:`, err.message);
        lastError = `${model}: ${err.message}`;
        continue;
      }
    }

    // All models failed
    return NextResponse.json(
      { error: `Failed to generate avatar. ${lastError}` },
      { status: 500 }
    );
  } catch (error: any) {
    console.error("[AvatarGen] Error:", error.message);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
