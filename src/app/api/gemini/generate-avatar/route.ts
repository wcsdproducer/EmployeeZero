import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { vertexGenerateContent } from "@/lib/geminiClient";

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

    // Generate 1 avatar image using Vertex AI (bills to platform/developer account)
    const avatarPrompt = `Generate a 1:1 square profile picture avatar image (512x512). ${description}. Important: must be perfectly square 1:1 aspect ratio. No text or watermarks.`;

    console.log("[AvatarGen] Generating with Vertex AI gemini-2.5-flash-image");

    const data = await vertexGenerateContent("gemini-2.5-flash-image", {
      contents: [
        {
          role: "user",
          parts: [{ text: avatarPrompt }],
        },
      ],
      generationConfig: {
        responseModalities: ["IMAGE", "TEXT"],
      },
    }, 45000); // 45s timeout for image gen

    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));

    if (!imagePart) {
      const textParts = parts.filter((p: any) => p.text).map((p: any) => p.text).join(" ");
      console.error("[AvatarGen] No image in response. Text:", textParts.substring(0, 300));
      return NextResponse.json(
        { error: `No image generated. ${textParts ? "Model said: " + textParts.substring(0, 100) : "Try a different description."}` },
        { status: 500 }
      );
    }

    console.log("[AvatarGen] Success! Image generated via Vertex AI.");
    return NextResponse.json({
      avatars: [{
        image: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType,
      }],
    });
  } catch (error: any) {
    console.error("[AvatarGen] Error:", error.message);

    if (error.message?.includes("429") || error.message?.includes("RESOURCE_EXHAUSTED")) {
      return NextResponse.json(
        { error: "Image generation quota exceeded. Please try again later." },
        { status: 429 }
      );
    }

    return NextResponse.json({ error: `Avatar generation failed: ${error.message}` }, { status: 500 });
  }
}
