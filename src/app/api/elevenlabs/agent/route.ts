import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  try {
    const { apiKey, agentId, voiceId, tools, prompt, customLlmUrl } = await req.json();

    if (!apiKey || !agentId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const payload: any = {
      conversation_config: {}
    };

    if (voiceId) {
      payload.conversation_config.tts = { voice_id: voiceId };
    }

    if (tools || prompt || customLlmUrl) {
      payload.conversation_config.agent = {};
      if (tools) payload.conversation_config.agent.tools = tools;
      
      if (prompt || customLlmUrl) {
        payload.conversation_config.agent.prompt = {};
        if (prompt) payload.conversation_config.agent.prompt.prompt = prompt;
        if (customLlmUrl) {
          payload.conversation_config.agent.prompt.llm = "custom-llm";
          payload.conversation_config.agent.prompt.custom_llm = { 
            url: customLlmUrl,
            model_id: "gemini-1.5-pro"
          };
        }
      }
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      method: "PATCH",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const apiKey = searchParams.get("apiKey");
    const agentId = searchParams.get("agentId");

    if (!apiKey || !agentId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      method: "GET",
      headers: {
        "xi-api-key": apiKey,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: "Failed to fetch agent: " + errText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Get agent error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
