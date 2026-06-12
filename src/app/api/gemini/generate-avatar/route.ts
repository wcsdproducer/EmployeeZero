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

    // Generate 3 avatar images in parallel using Nanobanana 2 (gemini-3.1-flash-image)
    const avatarPrompt = `Create a professional AI agent avatar/profile picture. The avatar should be a stylized, modern, digital art portrait suitable for a chat application profile picture. Style: clean, polished, with a subtle futuristic/tech aesthetic. Background should be simple and dark. The avatar should look like: ${description}. Make it suitable as a small circular profile picture. Do NOT include any text or watermarks.`;

    const generateOne = async (): Promise<{ image: string; mimeType: string } | null> => {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${apiKey}`,
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
          return null;
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));

        if (!imagePart) {
          console.error("[AvatarGen] No image in response");
          return null;
        }

        return {
          image: imagePart.inlineData.data,
          mimeType: imagePart.inlineData.mimeType,
        };
      } catch (err: any) {
        console.error("[AvatarGen] Generation error:", err.message);
        return null;
      }
    };

    // Generate 3 options in parallel
    const results = await Promise.all([generateOne(), generateOne(), generateOne()]);
    const avatars = results.filter((r): r is { image: string; mimeType: string } => r !== null);

    if (avatars.length === 0) {
      return NextResponse.json({ error: "Failed to generate avatars. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ avatars });
  } catch (error: any) {
    console.error("[AvatarGen] Error:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
