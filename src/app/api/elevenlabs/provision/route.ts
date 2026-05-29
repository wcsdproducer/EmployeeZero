import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 400 });
    }

    const response = await fetch("https://api.elevenlabs.io/v1/convai/agents/create", {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Employee Zero",
        conversation_config: {
          agent: {
            prompt: {
              prompt: "You are Employee Zero, an advanced autonomous AI assistant. You are helpful, highly intelligent, and concise. Your goal is to serve the user efficiently. Keep your answers brief and natural.",
            },
            first_message: "Hello, I am Employee Zero. How can I help you?",
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
