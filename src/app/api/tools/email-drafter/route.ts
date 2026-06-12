import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: Request) {
  try {
    const { originalEmail, intent, tone } = await req.json();

    if (!originalEmail || !intent) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are a professional email writer. Draft a reply to the following email.

ORIGINAL EMAIL:
${originalEmail}

THE USER WANTS TO:
${intent}

TONE: ${tone || "professional"}

RULES:
- Write ONLY the reply email body (no subject line, no "Subject:" prefix)
- Match the requested tone exactly
- Keep it concise but complete
- Be natural — do not sound like AI
- Do not use placeholder brackets like [Your Name]
- End with an appropriate sign-off
- No markdown formatting — plain text only`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const draft = response.text || "Unable to generate a draft. Please try again.";

    return NextResponse.json({ draft });
  } catch (error: unknown) {
    console.error("Email drafter error:", error);
    return NextResponse.json(
      { error: "Failed to generate draft" },
      { status: 500 }
    );
  }
}
