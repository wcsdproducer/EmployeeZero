import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { loadUserSOUL } from "@/lib/soulAdmin";
import { buildSOULPrompt } from "@/lib/soul";
import { BROWSER_TOOLS, GMAIL_TOOLS, CALENDAR_TOOLS, DRIVE_TOOLS, SHEETS_TOOLS, YOUTUBE_TOOLS, STRIPE_TOOLS, LINKEDIN_TOOLS, TWITTER_TOOLS, INSTAGRAM_TOOLS, FACEBOOK_TOOLS, TIKTOK_TOOLS, CONTACTS_TOOLS, TASKS_TOOLS, DOCS_TOOLS, BUSINESS_PROFILE_TOOLS, ANALYTICS_TOOLS, FORMS_TOOLS, SLIDES_TOOLS, NOTES_TOOLS, WORKFLOW_TOOLS } from "@/lib/agentTools";

// Combine all tools. You might want to filter this list if ElevenLabs has a maximum tool limit.
const allAgentTools = [
  ...BROWSER_TOOLS, ...GMAIL_TOOLS, ...CALENDAR_TOOLS, ...DRIVE_TOOLS, 
  ...SHEETS_TOOLS, ...YOUTUBE_TOOLS, ...STRIPE_TOOLS, ...LINKEDIN_TOOLS, 
  ...TWITTER_TOOLS, ...INSTAGRAM_TOOLS, ...FACEBOOK_TOOLS, ...TIKTOK_TOOLS, 
  ...CONTACTS_TOOLS, ...TASKS_TOOLS, ...DOCS_TOOLS, ...BUSINESS_PROFILE_TOOLS, 
  ...ANALYTICS_TOOLS, ...FORMS_TOOLS, ...SLIDES_TOOLS, ...NOTES_TOOLS, 
  ...WORKFLOW_TOOLS
];

export async function POST(req: Request) {
  try {
    const auth = await verifyAuth(req as any);
    if (auth.error) return auth.error;

    const { apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 400 });
    }

    const soul = await loadUserSOUL(auth.userId!);
    const compiledPrompt = buildSOULPrompt(soul) + "\n\nYou have access to the user's personal memory database and all their connected external services via your tools. If asked about your memory, reference your tools. If asked about connections, use the appropriate tool.";

    const hostUrl = process.env.NEXT_PUBLIC_APP_URL || "https://employeezero.app";

    const webhookTools = allAgentTools.map(tool => ({
      type: "webhook",
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      api_schema: {
        url: `${hostUrl}/api/elevenlabs/webhook?userId=${auth.userId}`,
        method: "POST"
      }
    }));

    const tools = [
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
      },
      ...webhookTools
    ];

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
              llm: "custom",
              custom_llm: {
                url: `${hostUrl}/api/elevenlabs/llm/v1/chat/completions?userId=${auth.userId}`,
                model_id: "gemini-1.5-pro"
              }
            },
            first_message: `Hello, I am ${soul.agentName || "Employee Zero"}. How can I help you?`,
            // tools: tools // We are handling tools via the Custom LLM
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
