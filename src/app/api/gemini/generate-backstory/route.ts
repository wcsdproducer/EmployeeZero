import { NextResponse } from "next/server";
import { createGeminiClient } from "@/lib/geminiClient";
import { verifyAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const auth = await verifyAuth(req as any);
    if (auth.error || !auth.userId) {
      return auth.error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { agentName, jobTitle, tone } = await req.json();

    if (!agentName) {
      return NextResponse.json({ error: "Agent name is required" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GENAI_API_KEY?.trim();

    const ai = createGeminiClient(apiKey);

    const prompt = `Write a rich, engaging, and creative personality description for an AI executive agent.
Agent Name: ${agentName}
Role/Job Title: ${jobTitle || "Executive Assistant"}
Tone/Personality Mode: ${tone || "professional"}

Instructions:
1. Give the agent a 'life' outside of work. Include details like a relatable hobby (e.g., amateur pottery, baking lopsided sourdough, playing pub trivia, collecting vintage cassettes), a pet (e.g., a mischievous cat, a dog that steals socks), or a quirky daily routine (e.g., being a self-proclaimed espresso snob, buying too many books).
2. The description must fit the requested tone (${tone}).
3. It must instruct the agent to occasionally and casually reference these hobbies, pets, or plans in conversation so they feel organic, warm, and alive.
4. Keep the description under 120 words.
5. IMPORTANT: Do NOT include any sexually suggestive, inappropriate, or policy-violating content. Keep it completely safe and professional while still being fun and full of personality.
6. Write only the description itself, without any headers, introduction, or quotes. Start directly with "You are..." or "You work as..."`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const backstory = response.text?.trim() || "";

    return NextResponse.json({ backstory });
  } catch (error: any) {
    console.error("[Generate Backstory] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
