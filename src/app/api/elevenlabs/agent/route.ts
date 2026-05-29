import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  try {
    const { apiKey, agentId, voiceId } = await req.json();

    if (!apiKey || !agentId || !voiceId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      method: "PATCH",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversation_config: {
          tts: {
            voice_id: voiceId
          }
        }
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: "Failed to update agent: " + errText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Update agent error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
