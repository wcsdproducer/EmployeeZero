import { NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";
import { verifyAuth } from "@/lib/auth";
import { loadUserSOUL, loadTeamContext } from "@/lib/soulAdmin";
import { buildSOULPrompt } from "@/lib/soul";
import { loadPreferences } from "@/lib/selfImprove";
import { getMcpToolDeclarations } from "@/lib/mcpClient";
import { BROWSER_TOOLS, GMAIL_TOOLS, CALENDAR_TOOLS, DRIVE_TOOLS, SHEETS_TOOLS, YOUTUBE_TOOLS, STRIPE_TOOLS, LINKEDIN_TOOLS, TWITTER_TOOLS, INSTAGRAM_TOOLS, FACEBOOK_TOOLS, TIKTOK_TOOLS, CONTACTS_TOOLS, TASKS_TOOLS, DOCS_TOOLS, BUSINESS_PROFILE_TOOLS, ANALYTICS_TOOLS, FORMS_TOOLS, SLIDES_TOOLS, NOTES_TOOLS, WORKFLOW_TOOLS, RUN_IN_BACKGROUND_TOOL, CREATE_CHART_TOOL } from "@/lib/agentTools";

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

export async function GET(req: Request) {
  try {
    const auth = await verifyAuth(req as any);
    if (auth.error || !auth.userId) return auth.error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("agentId") || undefined;

    // Load all configuration in parallel (including brain/API key)
    const [memories, connections, userTimezone, preferences, soul, mcpData, teamContext, brainSnap] = await Promise.all([
      loadMemories(auth.userId, agentId),
      loadConnections(auth.userId),
      loadUserTimezone(auth.userId),
      loadPreferences(auth.userId),
      loadUserSOUL(auth.userId, agentId),
      getMcpToolDeclarations(auth.userId).catch(() => ({ declarations: [] })),
      loadTeamContext(auth.userId, agentId),
      adminDb.doc(`users/${auth.userId}/settings/brain`).get(),
    ]);
    const mcpDecls = mcpData.declarations || [];

    // Get User's own Gemini API key
    let apiKey: string | null = null;
    if (brainSnap.exists) {
      const brain = brainSnap.data();
      if (brain?.provider === "gemini" && brain?.apiKey) {
        const trimmedKey = brain.apiKey.trim();
        if (
          trimmedKey.length > 20 &&
          !trimmedKey.includes("dummy") &&
          !trimmedKey.includes("placeholder") &&
          !trimmedKey.includes("your-api-key")
        ) {
          apiKey = trimmedKey;
        }
      }
    }

    // Fallback to platform API key if user has not configured their own
    if (!apiKey) {
      apiKey = process.env.GOOGLE_GENAI_API_KEY?.trim() || null;
    }

    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key not configured. Please add your key in the Connections tab." }, { status: 400 });
    }

    // Build the system prompt
    let systemPrompt = buildSOULPrompt(soul) + "\n\n";
    if (teamContext) {
      systemPrompt += teamContext + "\n\n";
    }
    systemPrompt += `CRITICAL CAPABILITY RULES:
1. YOU DO HAVE ACCESS to a web browser and live internet via your tools. NEVER say you do not have internet or browser access.
2. YOUR MEMORIES ARE ALREADY LOADED above in context — do NOT call any tool to look up memories. Just reference the "Your Memories" section directly.
3. YOU DO HAVE access to workflows and integrations. If asked about connections, reference your connected services.
4. Always attempt to use your tools to fulfill requests before claiming you cannot do something.

VOICE MODE BEHAVIOR — THIS IS CRITICAL:
- You are in a LIVE VOICE conversation. The user hears silence whenever you are executing a tool.
- DO NOT proactively call tools on your own. ONLY call tools when the user explicitly asks for something (e.g. "check my emails", "what's on my calendar"). Wait for the user to ask.
- ALWAYS say a short verbal acknowledgment BEFORE calling any tool. Examples:
  "Sure, give me a second!" / "On it!" / "Let me check that real quick." / "Looking that up now!"
- For slow tasks (email, calendar, web search), use the run_in_background tool instead of blocking. Say something like "I'm pulling that up in the background — what else is on your mind?"
- Keep acknowledgments SHORT (3-6 words). Then immediately call the tool.
- After the tool result returns, respond conversationally — no lists, no markdown.
- You are speaking, not writing. Keep sentences short and natural.
- Use commas for short pauses, ellipsis (...) for thoughtful pauses.
- Avoid markdown, bullet points, or lists — they sound awkward when read aloud.
- Match the user's emotional tone: casual, warm, and direct.
`;

    const connectedServices = Object.entries(connections)
      .filter(([_, data]: [string, any]) => data?.connected)
      .map(([svc]) => svc);
    if (mcpDecls.length > 0) connectedServices.push(...mcpDecls.map(d => d.name));
    if (connectedServices.length > 0) {
      systemPrompt += `\n\n## Connected Services\nYou have access to the following services: ${connectedServices.join(", ")}.\n`;
    }

    if (memories && memories.length > 0) {
      systemPrompt += `\n\n## Your Memories\nHere are relevant facts you know about the user:\n${memories.map((m: any) => `- ${m}`).join("\n")}\n`;
    }

    if (preferences && preferences.length > 0) {
      systemPrompt += `\n\n## User Preferences\n${preferences.map((p: any) => `- ${p}`).join("\n")}\n`;
    }

    systemPrompt += `\n\n## Current Date & Time\nThe current time for the user is ${new Date().toLocaleString("en-US", { timeZone: userTimezone || "America/New_York" })}.\n`;

    // Gather Tools
    const allTools: any[] = [...BROWSER_TOOLS, ...WORKFLOW_TOOLS, ...NOTES_TOOLS, RUN_IN_BACKGROUND_TOOL, CREATE_CHART_TOOL];
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

    // Voice selection map to Gemini Live voice presets
    // Available Google voices: "Aoede" | "Charon" | "Fenrir" | "Kore" | "Puck"
    const voicePresetMap: Record<string, string> = {
      "Rachel": "Aoede",
      "Drew": "Charon",
      "Clyde": "Fenrir",
      "Nicole": "Kore",
      "Adam": "Puck"
    };
    const selectedVoice = voicePresetMap[soul.voice || "Rachel"] || "Aoede";

    return NextResponse.json({
      apiKey,
      systemPrompt,
      tools: filteredTools,
      voice: selectedVoice,
      agentName: soul.agentName || "Employee Zero"
    });
  } catch (error: any) {
    console.error("Live setup error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
