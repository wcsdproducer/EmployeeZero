import { NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";
import { verifyAuth } from "@/lib/auth";

export const maxDuration = 30;

const VOICE_MAP: Record<string, string> = {
  Rachel: "Aoede",
  Drew: "Charon",
  Clyde: "Fenrir",
  Nicole: "Kore",
  Adam: "Puck",
};

const VOICE_SAMPLES: Record<string, string> = {
  Rachel: "Hey there! I'm Rachel — warm, professional, and ready to help you get things done.",
  Drew: "Hello. I'm Drew — confident, composed, and ready to take on whatever you need.",
  Clyde: "What's up! I'm Clyde — casual, friendly, and always here for you.",
  Nicole: "Hi! I'm Nicole — direct, energetic, and let's get straight to business.",
  Adam: "Hey hey! I'm Adam — energetic, playful, and ready to make your day better!",
};

export async function GET(req: Request) {
  try {
    const auth = await verifyAuth(req as any);
    if (auth.error || !auth.userId)
      return auth.error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const voiceId = searchParams.get("voice") || "Rachel";

    const geminiVoice = VOICE_MAP[voiceId];
    if (!geminiVoice) {
      return NextResponse.json({ error: "Invalid voice" }, { status: 400 });
    }

    // Get the user's Gemini API key
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

    const sampleText = VOICE_SAMPLES[voiceId] || `Hi, I'm ${voiceId}. Nice to meet you!`;

    // Use Gemini 2.5 Flash with native audio output
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-native-audio-dialog:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `Say this exactly in a natural, conversational tone: "${sampleText}"` }],
            },
          ],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: geminiVoice,
                },
              },
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("[VoicePreview] Gemini API error:", errText);
      return NextResponse.json({ error: "Failed to generate voice sample" }, { status: 500 });
    }

    const data = await response.json();

    // Extract inline audio data from Gemini response
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const audioPart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("audio/"));

    if (!audioPart) {
      console.error("[VoicePreview] No audio in response:", JSON.stringify(data).substring(0, 500));
      return NextResponse.json({ error: "No audio generated" }, { status: 500 });
    }

    // Return the base64 audio data
    return NextResponse.json({
      audio: audioPart.inlineData.data,
      mimeType: audioPart.inlineData.mimeType,
    });
  } catch (error: any) {
    console.error("[VoicePreview] Error:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
