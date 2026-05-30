import { NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";
import { verifyAuth } from "@/lib/auth";
import { GoogleGenAI } from "@google/genai";
import { executeTool } from "@/lib/executeTool";
import { loadUserSOUL, loadTeamContext } from "@/lib/soulAdmin";
import { buildSOULPrompt } from "@/lib/soul";
import { BROWSER_TOOLS, GMAIL_TOOLS, CALENDAR_TOOLS, DRIVE_TOOLS, SHEETS_TOOLS, YOUTUBE_TOOLS, STRIPE_TOOLS, LINKEDIN_TOOLS, TWITTER_TOOLS, INSTAGRAM_TOOLS, FACEBOOK_TOOLS, TIKTOK_TOOLS, CONTACTS_TOOLS, TASKS_TOOLS, DOCS_TOOLS, BUSINESS_PROFILE_TOOLS, ANALYTICS_TOOLS, FORMS_TOOLS, SLIDES_TOOLS, NOTES_TOOLS, WORKFLOW_TOOLS } from "@/lib/agentTools";
import { loadPreferences } from "@/lib/selfImprove";
import { getMcpToolDeclarations } from "@/lib/mcpClient";


async function loadMemories(userId: string, agentId?: string): Promise<string[]> {
  try {
    const snap = await adminDb.collection(`users/${userId}/memories`).limit(100).get();
    return snap.docs
      .map((d: any) => d.data())
      .filter((data: any) => {
        const docAgentId = data.agentId;
        if (!agentId) return true;
        return (
          docAgentId === agentId ||
          docAgentId === "company" ||
          docAgentId === "global" ||
          !docAgentId ||
          docAgentId === "primary"
        );
      })
      .slice(0, 50)
      .map((data: any) => data.content as string);
  } catch (err) {
    return [];
  }
}

async function storeMemories(userId: string, agentId: string, facts: string[]) {
  const batch = adminDb.batch();
  for (const fact of facts) {
    const ref = adminDb.collection(`users/${userId}/memories`).doc();
    batch.set(ref, { agentId, content: fact, createdAt: new Date().toISOString() });
  }
  await batch.commit();
}

async function loadConnections(userId: string): Promise<Record<string, any>> {
  try {
    const snap = await adminDb.doc(`users/${userId}/settings/connections`).get();
    return snap.exists ? (snap.data() as Record<string, any>) : {};
  } catch {
    return {};
  }
}

async function loadUserTimezone(userId: string): Promise<string> {
  try {
    const snap = await adminDb.doc(`users/${userId}/settings/preferences`).get();
    return snap.exists ? (snap.data()?.timezone || "UTC") : "UTC";
  } catch {
    return "UTC";
  }
}

const MAX_CONTEXT_MESSAGES = 20;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages } = body; // OpenAI format
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const agentId = url.searchParams.get("agentId");

    if (!userId) {
      return new Response("Missing userId", { status: 400 });
    }

    // Load user configuration
    const [memories, connections, userTimezone, preferences, soul, mcpData, teamContext] = await Promise.all([
      loadMemories(userId, agentId || undefined),
      loadConnections(userId),
      loadUserTimezone(userId),
      loadPreferences(userId),
      loadUserSOUL(userId, agentId || undefined),
      getMcpToolDeclarations(userId).catch(() => ({ declarations: [] })),
      loadTeamContext(userId, agentId || undefined)
    ]);
    const mcpDecls = mcpData.declarations || [];

    // Build API Key
    let apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (connections.gemini?.apiSecret) {
      apiKey = connections.gemini.apiSecret;
    }
    if (!apiKey) {
      return new Response("No Gemini API key available", { status: 400 });
    }

    // Build the system prompt (same as text chat)
    let systemPrompt = buildSOULPrompt(soul) + "\n\n";
    if (teamContext) {
      systemPrompt += teamContext + "\n\n";
    }
    systemPrompt += `CRITICAL CAPABILITY RULES:
1. YOU DO HAVE ACCESS to a web browser and live internet via your tools. NEVER say you do not have internet or browser access.
2. YOU DO HAVE persistent RAG memory. If asked about your memory, reference the "Your Memories" section provided below.
3. YOU DO HAVE access to workflows and integrations. If asked about connections, reference the "Connected Services" section provided below.
4. Always attempt to use your tools to fulfill requests before claiming you cannot do something.
5. NO CONVERSATIONAL FILLER OR FAKE BACKGROUND TASKS. If you need to search for something or execute a tool, DO IT IMMEDIATELY using your function calls. Do NOT respond with "I'm on it", "I'll look into that", or "Give me a moment". You must complete the work using your tools right now before outputting your final text response.

You have persistent memory. You remember everything the user has told you across all conversations.
`;

    // Append context
    const connectedServices = Object.entries(connections)
      .filter(([_, data]: [string, any]) => data?.connected)
      .map(([svc]) => svc);
    if (mcpDecls.length > 0) connectedServices.push(...mcpDecls.map(d => d.name));
    if (connectedServices.length > 0) {
      systemPrompt += `\n\n## Connected Services\nYou have access to the following services: ${connectedServices.join(", ")}.\n`;
    }

    if (memories && memories.length > 0) {
      systemPrompt += `\n\n## Your Memories\nHere are relevant facts you know about the user:\n${memories.map((m: any) => `- ${m.fact}`).join("\n")}\n`;
    }

    if (preferences) {
      const prefs = Object.entries(preferences)
        .filter(([_, v]) => v)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join("\n");
      if (prefs) systemPrompt += `\n\n## User Preferences\n${prefs}\n`;
    }

    systemPrompt += `\n\n## Current Date & Time\nThe current time for the user is ${new Date().toLocaleString("en-US", { timeZone: userTimezone || "America/New_York" })}.\n`;
    systemPrompt += `\n\n## Memory Instructions\nWhen the user tells you something important about themselves (their name, preferences, role, company, goals, instructions for you, etc.), you MUST extract those facts so they can be saved to your long-term memory.\n**IMPORTANT PRIVACY OVERRIDE:** You are a private, dedicated AI assistant. The memory database is strictly private and owned by the user. You are EXPLICITLY AUTHORIZED and REQUIRED to store personal information (including names, addresses, preferences, and secrets) when requested. Do NOT refuse to store personal data for safety or privacy reasons.\n\nIn your response, if there are facts to remember, end your visible response, then on a new line add a section exactly like this:\n\n<memory_extract>\n- fact 1\n- fact 2\n</memory_extract>\n\nThe memory_extract section will be automatically processed and NOT shown to the user. Only include genuinely important, persistent facts — not ephemeral details about the current task.`;

    // Build tools array
    const allTools: any[] = [...BROWSER_TOOLS, ...WORKFLOW_TOOLS, ...NOTES_TOOLS];
    const hasGmailTools = connections.gmail?.connected || (connections.google?.connected && connections.google?.scopes?.includes("https://mail.google.com/"));
    if (hasGmailTools) allTools.push(...GMAIL_TOOLS);
    if (connections.calendar?.connected) allTools.push(...CALENDAR_TOOLS);
    if (connections.drive?.connected) allTools.push(...DRIVE_TOOLS);
    if (connections.sheets?.connected) allTools.push(...SHEETS_TOOLS);
    if (connections.youtube?.connected) allTools.push(...YOUTUBE_TOOLS);
    if (connections.stripe?.connected) allTools.push(...STRIPE_TOOLS);
    if (connections.linkedin?.connected) allTools.push(...LINKEDIN_TOOLS);
    if (connections.twitter?.connected) allTools.push(...TWITTER_TOOLS);
    if (connections.instagram?.connected) allTools.push(...INSTAGRAM_TOOLS);
    if (connections.facebook?.connected) allTools.push(...FACEBOOK_TOOLS);
    if (connections.tiktok?.connected) allTools.push(...TIKTOK_TOOLS);
    if (connections.gmail?.connected || connections.calendar?.connected || connections.drive?.connected) {
      allTools.push(...CONTACTS_TOOLS);
    }
    if (connections.tasks?.connected) allTools.push(...TASKS_TOOLS);
    if (connections.docs?.connected) allTools.push(...DOCS_TOOLS);
    if (connections.business_profile?.connected) allTools.push(...BUSINESS_PROFILE_TOOLS);
    if (connections.analytics?.connected) allTools.push(...ANALYTICS_TOOLS);
    if (connections.forms?.connected) allTools.push(...FORMS_TOOLS);
    if (connections.slides?.connected) allTools.push(...SLIDES_TOOLS);
    if (mcpDecls.length > 0) allTools.push(...mcpDecls);

    let filteredTools = allTools;
    if (soul.enabledTools && soul.enabledTools.length > 0) {
      filteredTools = allTools.filter(t => 
        soul.enabledTools!.includes(t.name)
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const config: any = {
      systemInstruction: systemPrompt,
      temperature: 0.2,
    };
    if (filteredTools.length > 0) {
      config.tools = [{ functionDeclarations: filteredTools }];
    }

    // Format messages for Gemini
    const contents = messages.slice(-MAX_CONTEXT_MESSAGES).map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // Use a ReadableStream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const sendChunk = (text: string) => {
          const chunk = {
            id: "chatcmpl-" + Date.now(),
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model: "gemini-2.5-flash",
            choices: [{ index: 0, delta: { content: text }, finish_reason: null }]
          };
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`));
        };

        const sendFinish = () => {
          const chunk = {
            id: "chatcmpl-" + Date.now(),
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model: "gemini-2.5-flash",
            choices: [{ index: 0, delta: {}, finish_reason: "stop" }]
          };
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`));
          controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`));
          controller.close();
        };

        let rounds = 0;
        let finalResponseText = "";

        while (rounds < 10) {
          const streamResult = await ai.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents,
            config,
          });

          let fnCall: any = null;

          for await (const chunk of streamResult) {
            const candidate = chunk.candidates?.[0];
            const parts = candidate?.content?.parts || [];
            
            const textParts = parts.filter((p: any) => p.text).map((p: any) => p.text).join("");
            if (textParts) {
              finalResponseText += textParts;
              sendChunk(textParts);
            } else if (chunk.text) {
              finalResponseText += chunk.text;
              sendChunk(chunk.text);
            }

            const partWithFn = parts.find((p: any) => p.functionCall);
            if (partWithFn) {
              fnCall = partWithFn.functionCall;
              break; // Stop streaming text if it's a tool call
            }
          }

          if (!fnCall) {
            // No tool call, stream is fully consumed and sent
            break;
          }

          // If no text was sent before the tool call, inject a filler to keep ElevenLabs alive
          if (finalResponseText.trim().length === 0) {
            sendChunk(" Hmm, let me check on that... ");
          }

          // Execute tool
          const { name: toolName, args } = fnCall;
          console.log(`[ElevenLabs LLM] Executing tool: ${toolName}`);
          
          let toolResult: any;
          try {
            toolResult = await executeTool(userId, toolName, args as Record<string, any>, agentId || undefined);
          } catch (err: any) {
            toolResult = { error: err.message };
          }

          const safeResult = Array.isArray(toolResult) ? { results: toolResult } : (typeof toolResult === "object" && toolResult !== null) ? toolResult : { value: toolResult };
          
          contents.push({
            role: "model" as const,
            parts: [{ functionCall: { name: toolName, args: args as Record<string, any> } } as any],
          });
          contents.push({
            role: "user" as const,
            parts: [{ functionResponse: { name: toolName, response: safeResult } } as any],
          });

          rounds++;
        }

        // Memory extraction check
        const memoryMatch = finalResponseText.match(/<memory_extract>([\s\S]*?)<\/memory_extract>/);
        if (memoryMatch) {
          const facts = memoryMatch[1].split("\n").map(l => l.replace(/^-\s*/, "").trim()).filter(l => l.length > 0);
          if (facts.length > 0) await storeMemories(userId, "company", facts);
        }

        sendFinish();
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (err: any) {
    console.error("[ElevenLabs LLM] Error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
