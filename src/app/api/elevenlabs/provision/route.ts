import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { loadUserSOUL } from "@/lib/soulAdmin";
import { buildSOULPrompt } from "@/lib/soul";

export async function POST(req: Request) {
  try {
    const auth = await verifyAuth(req as any);
    if (auth.error) return auth.error;

    const { apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 400 });
    }

    const soul = await loadUserSOUL(auth.userId!);
    const compiledPrompt = buildSOULPrompt(soul) + "\n\nYou have access to the user's personal memory database. You can search these memories at any time to answer questions about the user or their past interactions.";

    const response = await fetch("https://api.elevenlabs.io/v1/convai/agents/create", {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: soul.agentName || "Employee Zero",
        conversation_config: {
          agent: {
            prompt: {
              prompt: compiledPrompt,
            },
            first_message: "Hello, I am Employee Zero. How can I help you?",
            tools: [
              {
                type: "client",
                name: "search_memories",
                description: "Searches the user's personal memory database for relevant facts, notes, and past conversations.",
                parameters: {
                  type: "object",
                  properties: {
                    query: { type: "string", description: "The search query" }
                  },
                  required: ["query"]
                }
              }
            ]
          },
          tts: {
            voice_id: "21m00Tcm4TlvDq8ikWAM", // Rachel
          }
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("ElevenLabs provision error:", errText);
      return NextResponse.json({ error: "Failed to provision agent: " + errText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ agent_id: data.agent_id });
  } catch (error: any) {
    console.error("Provisioning error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
