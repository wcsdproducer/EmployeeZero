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

    if (!apiKey && platformKey) {
      apiKey = platformKey;
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key required. Add it in Connections." },
        { status: 400 }
      );
    }

    // Generate 1 avatar image using gemini-2.5-flash-image
    const avatarPrompt = `Generate a 1:1 square profile picture avatar image. ${description}. Style: digital art portrait, clean, square 512x512 format. No text or watermarks.`;

    console.log("[AvatarGen] Generating with gemini-2.5-flash-image");
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: avatarPrompt }],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("[AvatarGen] Gemini error:", response.status, errText.substring(0, 500));
      return NextResponse.json(
        { error: `gemini-2.5-flash-image: ${response.status} - ${errText.substring(0, 200)}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));

    if (!imagePart) {
      // Log what we got back
      const textParts = parts.filter((p: any) => p.text).map((p: any) => p.text).join(" ");
      console.error("[AvatarGen] No image in response. Text:", textParts.substring(0, 300));
      return NextResponse.json(
        { error: `No image generated. ${textParts ? "Model said: " + textParts.substring(0, 100) : "Try a different description."}` },
        { status: 500 }
      );
    }

    console.log("[AvatarGen] Success! Image generated.");
    return NextResponse.json({
      avatars: [{
        image: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType,
      }],
    });
  } catch (error: any) {
    console.error("[AvatarGen] Error:", error.message);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
