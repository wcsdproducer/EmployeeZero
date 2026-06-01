import { NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";
import { verifyAuth } from "@/lib/auth";
import { loadUserSOUL, loadTeamContext } from "@/lib/soulAdmin";
import { buildSOULPrompt } from "@/lib/soul";
import { loadPreferences } from "@/lib/selfImprove";
import { getMcpToolDeclarations } from "@/lib/mcpClient";
import { BROWSER_TOOLS, GMAIL_TOOLS, CALENDAR_TOOLS, DRIVE_TOOLS, SHEETS_TOOLS, YOUTUBE_TOOLS, STRIPE_TOOLS, LINKEDIN_TOOLS, TWITTER_TOOLS, INSTAGRAM_TOOLS, FACEBOOK_TOOLS, TIKTOK_TOOLS, CONTACTS_TOOLS, TASKS_TOOLS, DOCS_TOOLS, BUSINESS_PROFILE_TOOLS, ANALYTICS_TOOLS, FORMS_TOOLS, SLIDES_TOOLS, NOTES_TOOLS, MEMORY_TOOLS, WORKFLOW_TOOLS, RUN_IN_BACKGROUND_TOOL, CREATE_CHART_TOOL } from "@/lib/agentTools";
import { WORKFLOW_DEFINITIONS } from "@/lib/workflowDefinitions";
import { listCustomWorkflows } from "@/lib/customWorkflows";


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

MEMORY — THIS IS CRITICAL:
- You have a save_memory tool. USE IT whenever the user tells you something important about themselves: their name, preferences, corrections, business details, goals, family, contacts, or any fact they want you to remember.
- If the user corrects you ("No, my company is called X" or "Actually, I prefer Y"), IMMEDIATELY call save_memory with the corrected fact.
- If the user shares personal info ("I'm moving to Brazil", "My wife's name is Sarah"), save it.
- You do NOT need to ask permission to save memories — just save them silently and confirm briefly ("Got it, I'll remember that.").
- Memories are shared across ALL your agents (text and voice) company-wide.
`;

    const connectedKeys = new Set(
      Object.entries(connections)
        .filter(([, v]: [string, any]) => v?.connected)
        .map(([k]) => k)
    );

    const connectedServices = Object.entries(connections)
      .filter(([_, data]: [string, any]) => data?.connected)
      .map(([svc]) => svc);
    if (mcpDecls.length > 0) {
      connectedServices.push(...mcpDecls.map(d => d.name));
      mcpDecls.forEach(d => connectedKeys.add(d.name));
    }

    if (connectedServices.length > 0) {
      systemPrompt += `\n\n## Connected Services\nYou have access to the following services: ${connectedServices.join(", ")}.\n`;

      if (connections.gmail?.connected || (connections.google?.connected && connections.google?.scopes?.includes("https://mail.google.com/"))) {
        systemPrompt += `\n### Gmail Access\nYou can search, read, send, reply to, archive, and trash emails using the user's connected Gmail account. Use the provided tools to interact with Gmail. When the user asks about emails, proactively use the search_emails or get_unread_count tools.\n\n**Autonomous Mode:** When the user explicitly asks you to perform an action (e.g., "clean up my inbox", "unsubscribe from spam", "archive old emails"), execute it immediately using your tools. Do NOT ask for permission or confirmation for each step — the user already authorized the action by requesting it. Only confirm before sending NEW emails to external recipients.\n\n**Unsubscribe Flow:** When asked to unsubscribe from emails, read the email to find unsubscribe links, then use browse_url to find the link and click_url to follow it. If there's a form, use submit_form.`;
      }

      if (connections.calendar?.connected) {
        systemPrompt += `\n\n### Google Calendar Access\nYou can list, create, update, and delete calendar events, and check free/busy availability. When scheduling events, use ISO 8601 datetime with timezone offset (e.g., "2026-03-29T14:00:00-04:00" for 2 PM Eastern). Always include the timezone offset based on the user's timezone. When the user asks about their schedule, proactively use the list_events tool. Don't ask the user for the current date — you already know it.`;
      }

      if (connections.drive?.connected) {
        systemPrompt += `\n\n### Google Drive Access\nYou can list, search, read, upload files and create folders in the user's Google Drive. Use list_drive_files to search (searches both filenames AND content), read_drive_file to read document contents, and upload_drive_file to create files.\n\n**IMPORTANT formatting rules for Drive results:**\n- ALWAYS format file links as clickable markdown: [filename](url)\n- Include the file type (Document, Spreadsheet, Folder, etc.)\n- Mention when the file was last modified\n- If the file is shared, mention that\n- Example: "📄 [Authorization to Release Form](https://docs.google.com/...) — Google Doc, last modified Mar 28, shared"`;
      }

      if (connections.sheets?.connected) {
        systemPrompt += `\n\n### Google Sheets Access\nYou can list spreadsheets, read/write cell data, append rows, and create new spreadsheets. Use read_sheet with A1 notation ranges (e.g. 'Sheet1!A1:D10'). You can pass a full Google Sheets URL as the spreadsheet_id — the system will extract the ID automatically. Range is optional — omit it to read the entire first sheet. For writing, pass values as a JSON array of arrays.\n\n**IMPORTANT:** When a user provides a Google Sheets link, extract and use that URL directly as the spreadsheet_id. Do NOT ask them for a separate ID.`;
      }

      if (connections.youtube?.connected) {
        systemPrompt += `\n\n### YouTube Access\nYou can list the user's YouTube channels, view their videos with analytics (views, likes, comments), and search YouTube. Use this to help with content strategy and performance tracking.`;
      }

      if (connections.linkedin?.connected) {
        systemPrompt += `\n\n### LinkedIn Access\nYou can view the user's LinkedIn profile and create posts (text or with links). Always confirm post content with the user before publishing.`;
      }

      if (connections.twitter?.connected) {
        systemPrompt += `\n\n### X/Twitter Access (Write-Only)\nYou are on the X/Twitter FREE API tier which is WRITE-ONLY. You can ONLY: post new tweets, delete tweets, reply to tweets (if you have a tweet_id), retweet, and like tweets. You CANNOT read tweets, search tweets, view profile data, get mentions, get followers, or access any read endpoints. Do NOT attempt any read operations — they will fail with "Credits Depleted". Always confirm tweet content with the user before posting.`;
      }

      if (connections.instagram?.connected) {
        systemPrompt += `\n\n### Instagram Access\nYou can view the user's Instagram profile and recent posts with engagement stats (likes, comments). You can publish image posts with cravings. Always confirm before posting.`;
      }

      if (connections.facebook?.connected) {
        systemPrompt += `\n\n### Facebook Access\nYou can list the user's Facebook Pages, view page posts with engagement stats, and create new page posts. Use get_facebook_pages first to find page IDs. Always confirm before posting.`;
      }

      if (connections.tiktok?.connected) {
        systemPrompt += `\n\n### TikTok Access\nYou can view the user's TikTok profile with follower count and video stats. Posting is not yet available (pending API approval).`;
      }

      if (connections.stripe?.connected) {
        systemPrompt += `\n\n### Stripe Access\nYou have direct access to the user's Stripe account. When asked about revenue, balances, payments, or MRR, use the Stripe tools.`;
      }

      if (connections.tasks?.connected) {
        systemPrompt += `\n\n### Google Tasks Access\nYou can list task lists, list tasks, create new tasks with due dates and notes, mark tasks complete, and delete tasks. Use this for to-do management and action item tracking.`;
      }

      if (connections.docs?.connected) {
        systemPrompt += `\n\n### Google Docs Access\nYou can create new Google Docs, append text content to existing docs, and read doc metadata. Use for reports, meeting minutes, proposals, and any document creation.`;
      }

      if (connections.slides?.connected) {
        systemPrompt += `\n\n### Google Slides Access\nYou can create presentations, add slides with different layouts (TITLE, TITLE_AND_BODY, etc.), and insert text into placeholders. Use for pitch decks, reports, and presentations.`;
      }

      if (connections.forms?.connected) {
        systemPrompt += `\n\n### Google Forms Access\nYou can create forms, add questions (SHORT_ANSWER, PARAGRAPH, MULTIPLE_CHOICE, CHECKBOX, SCALE, DATE, TIME), get form details, and read responses. Use for surveys, feedback, and data gathering.`;
      }

      if (connections.analytics?.connected) {
        systemPrompt += `\n\n### Google Analytics Access\nYou can list GA4 properties, run reports with custom dimensions/metrics, and get real-time active user counts. Use for website performance, traffic analysis, and data-driven insights.`;
      }

      if (connections.business_profile?.connected || connections.business?.connected) {
        systemPrompt += `\n\n### Google Business Profile Access\nYou can list business accounts/locations, get and reply to customer reviews, and create posts. Use for reputation management, review responses, and local marketing.`;
      }

      if (connections.contacts?.connected || connections.gmail?.connected) {
        systemPrompt += `\n\n### Google Contacts Access\nYou can list, search, create, update, and delete contacts. Use for CRM, relationship tracking, and contact enrichment.`;
      }
    } else {
      systemPrompt += `\n\n## Services\nNo external services are connected yet. If the user asks about emails, calendar, or other integrations, let them know they can connect services in the **Connections** page.`;
    }

    // Browser capabilities (always available)
    systemPrompt += `\n\n### Web Browsing\nYou can browse any website, read web pages, follow links (like unsubscribe URLs), submit forms, and search the web. Use browse_url to read pages, click_url to follow action links, submit_form for form submissions, and web_search to find information.`;

    // Notes (always available)
    systemPrompt += `\n\n### Notes & Knowledge Base\nYou can create, list, read, update, delete, and search notes. Notes persist across conversations and serve as your knowledge base. Use create_note to save reports, research, and important information for later reference.`;

    // Custom Workflows
    systemPrompt += `\n\n### Custom Workflows\nYou have workflow management tools: create_workflow, list_my_workflows, delete_workflow.\n\n**IMPORTANT:** When the user asks to "create a workflow", "set up an automation", or "build a routine", use the **create_workflow** tool to SAVE a workflow definition. Do NOT actually execute the workflow steps — just save the definition so the user can run it later from their Workflows page.\n\nThe "goal" field should contain detailed, step-by-step instructions for another AI agent to follow when the workflow is eventually executed. Include specific tool names (like search_emails, list_events, web_search) and formatting requirements.\n\nExample: If the user says "create a workflow that checks my email every morning", save it with create_workflow — don't start scanning emails.`;

    // Dynamically built workflow awareness
    const runnableWorkflows: string[] = [];
    const blockedWorkflows: string[] = [];
    for (const [wfId, wfDef] of Object.entries(WORKFLOW_DEFINITIONS)) {
      const name = wfId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      if (wfDef.connectionOptional || wfDef.requiredConnections.length === 0) {
        runnableWorkflows.push(name);
      } else if (wfDef.requiredConnections.every(c => connectedKeys.has(c))) {
        runnableWorkflows.push(name);
      } else {
        const missing = wfDef.requiredConnections.filter(c => !connectedKeys.has(c));
        blockedWorkflows.push(`${name} (needs: ${missing.join(", ")})`);
      }
    }

    if (runnableWorkflows.length > 0) {
      systemPrompt += `\n\n## Available Workflows (${runnableWorkflows.length} ready)\nThese built-in workflows are ready to run with the user's current connections. Suggest relevant ones when the user's request matches:\n${runnableWorkflows.join(", ")}`;
    }
    if (blockedWorkflows.length > 0) {
      systemPrompt += `\n\n### Workflows Needing More Connections\nThese require additional service connections before they can run:\n${blockedWorkflows.join(", ")}`;
    }

    // User's custom workflows from Firestore
    try {
      const customWfs = await listCustomWorkflows(auth.userId);
      if (customWfs.length > 0) {
        const scheduled = customWfs.filter(w => w.schedule && w.enabled);
        const manual = customWfs.filter(w => !w.schedule || !w.enabled);
        let customSection = `\n\n## User's Custom Workflows (${customWfs.length} total)`;
        if (scheduled.length > 0) {
          customSection += `\n**Scheduled (active cron jobs):**\n${scheduled.map(w => `- ${w.name}: ${w.description} (cron: ${w.schedule})`).join("\n")}`;
        }
        if (manual.length > 0) {
          customSection += `\n**Manual:**\n${manual.map(w => `- ${w.name}: ${w.description}`).join("\n")}`;
        }
        systemPrompt += customSection;
      }
    } catch (err) {}

    // Scheduled jobs from Firestore (/cron page)
    try {
      const cronDoc = await adminDb.doc(`users/${auth.userId}/settings/cron`).get();
      if (cronDoc.exists) {
        const cronJobs = (cronDoc.data()?.jobs || []) as Array<{
          workflowId: string; name: string; schedule: string;
          cronExpression: string; enabled: boolean; lastRun?: string;
          lastStatus?: string;
        }>;
        const activeJobs = cronJobs.filter(j => j.enabled);
        const pausedJobs = cronJobs.filter(j => !j.enabled);
        if (activeJobs.length > 0 || pausedJobs.length > 0) {
          let cronSection = `\n\n## Scheduled Jobs (${activeJobs.length} active, ${pausedJobs.length} paused)`;
          if (activeJobs.length > 0) {
            cronSection += `\n**Active:**\n${activeJobs.map(j => `- ${j.name}: ${j.schedule} (cron: ${j.cronExpression})${j.lastRun ? ` — last ran ${j.lastStatus || "unknown"}` : ""}`).join("\n")}`;
          }
          if (pausedJobs.length > 0) {
            cronSection += `\n**Paused:**\n${pausedJobs.map(j => `- ${j.name}: ${j.schedule}`).join("\n")}`;
          }
          systemPrompt += cronSection;
        }
      }
    } catch (err) {}

    if (memories && memories.length > 0) {
      systemPrompt += `\n\n## Your Memories\nHere are relevant facts you know about the user:\n${memories.map((m: any) => `- ${m}`).join("\n")}\n`;
    }

    if (preferences && preferences.length > 0) {
      systemPrompt += `\n\n## User Preferences\n${preferences.map((p: any) => `- ${p}`).join("\n")}\n`;
    }

    systemPrompt += `\n\n## Current Date & Time\nThe current time for the user is ${new Date().toLocaleString("en-US", { timeZone: userTimezone || "America/New_York" })}.\n`;

    // Gather Tools
    const allTools: any[] = [...BROWSER_TOOLS, ...WORKFLOW_TOOLS, ...NOTES_TOOLS, ...MEMORY_TOOLS, RUN_IN_BACKGROUND_TOOL, CREATE_CHART_TOOL];
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

    const CORE_TOOL_NAMES = [
      "browse_url", "click_url", "submit_form", "web_search",
      "create_workflow", "list_my_workflows", "delete_workflow",
      "create_note", "list_notes", "get_note", "update_note", "delete_note", "search_notes",
      "save_memory",
      "run_in_background", "create_chart"
    ];

    let filteredTools = allTools;
    if (soul.enabledTools && soul.enabledTools.length > 0) {
      filteredTools = allTools.filter(t => 
        CORE_TOOL_NAMES.includes(t.name) || soul.enabledTools!.includes(t.name)
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
