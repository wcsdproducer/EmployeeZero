import { NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";
import { GoogleGenAI, Type } from "@google/genai";
import {
  listEmails,
  getEmail,
  sendEmail,
  replyToEmail,
  getUnreadCount,
  archiveEmail,
  trashEmail,
} from "@/lib/gmail";
import { createTask, executeTask } from "@/lib/taskEngine";
import { browseUrl, clickUrl, submitForm, webSearch } from "@/lib/browser";

/**
 * Chat API — conversation-based, with persistent memory + tool use.
 *
 * Accepts a conversationId + new user message.
 * Loads the conversation's existing messages, connections, memories, and calls Gemini.
 * Supports function calling for Gmail (and future services).
 */

// ── Types ───────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "model";
  content: string;
  timestamp: string;
}

// ── Memory helpers ──────────────────────────────────────────────

async function loadMemories(userId: string): Promise<string[]> {
  try {
    const snap = await adminDb
      .collection(`users/${userId}/memories`)
      .limit(50)
      .get();
    return snap.docs.map((d) => d.data().content as string);
  } catch (err) {
    console.warn("Failed to load memories:", err);
    return [];
  }
}

async function storeMemories(userId: string, agentId: string, facts: string[]) {
  const batch = adminDb.batch();
  for (const fact of facts) {
    const ref = adminDb.collection(`users/${userId}/memories`).doc();
    batch.set(ref, {
      agentId,
      content: fact,
      createdAt: new Date().toISOString(),
    });
  }
  await batch.commit();
}

// ── Connections helper ──────────────────────────────────────────

async function loadConnections(userId: string): Promise<Record<string, any>> {
  try {
    const snap = await adminDb.doc(`users/${userId}/settings/connections`).get();
    return snap.exists ? (snap.data() as Record<string, any>) : {};
  } catch {
    return {};
  }
}

// ── Conversation window + summarization ─────────────────────────

const MAX_CONTEXT_MESSAGES = 20; // Send at most 20 recent messages to Gemini
const SUMMARIZE_THRESHOLD = 24; // Summarize when total exceeds this

async function summarizeOldMessages(
  apiKey: string,
  messages: ChatMessage[],
  existingSummary?: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });

  const transcript = messages
    .map((m) => `${m.role === "user" ? "User" : "Agent"}: ${m.content.substring(0, 300)}`)
    .join("\n");

  const prompt = existingSummary
    ? `You have a previous conversation summary:\n"${existingSummary}"\n\nHere are additional older messages to incorporate:\n${transcript}\n\nWrite a concise updated summary (max 200 words) capturing all important context, decisions, facts, and action items. Preserve names, dates, and specific details.`
    : `Summarize this conversation excerpt concisely (max 200 words). Capture important context, decisions, facts, and action items. Preserve names, dates, and specific details.\n\n${transcript}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return response.text || existingSummary || "";
}

// ── Tool declarations ───────────────────────────────────────────

const GMAIL_TOOLS = [
  {
    name: "search_emails",
    description:
      "Search or list emails in the user's Gmail. Use Gmail search syntax for the query (e.g. 'is:unread', 'from:john@example.com', 'subject:invoice', 'newer_than:1d'). Returns a list of email summaries with id, from, subject, snippet, and date.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description:
            "Gmail search query. Examples: 'is:unread', 'from:boss@company.com', 'subject:meeting newer_than:7d', 'in:inbox'. Leave empty for recent inbox emails.",
        },
        max_results: {
          type: Type.NUMBER,
          description: "Maximum number of emails to return (1-20, default 10)",
        },
      },
    },
  },
  {
    name: "read_email",
    description:
      "Read the full content of a specific email by its message ID. Returns from, to, subject, date, body text, and labels.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        message_id: {
          type: Type.STRING,
          description: "The Gmail message ID to read",
        },
      },
      required: ["message_id"],
    },
  },
  {
    name: "send_email",
    description:
      "Send a new email from the user's Gmail account. Always confirm with the user before sending.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        to: {
          type: Type.STRING,
          description: "Recipient email address",
        },
        subject: {
          type: Type.STRING,
          description: "Email subject line",
        },
        body: {
          type: Type.STRING,
          description: "Email body text (plain text)",
        },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "reply_to_email",
    description:
      "Reply to a specific email thread. The reply will include proper threading headers. Always confirm with the user before sending.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        message_id: {
          type: Type.STRING,
          description: "The Gmail message ID to reply to",
        },
        body: {
          type: Type.STRING,
          description: "Reply body text (plain text)",
        },
      },
      required: ["message_id", "body"],
    },
  },
  {
    name: "get_unread_count",
    description: "Get the count of unread emails in the inbox",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "archive_email",
    description: "Archive an email (remove from inbox but keep in All Mail)",
    parameters: {
      type: Type.OBJECT,
      properties: {
        message_id: {
          type: Type.STRING,
          description: "The Gmail message ID to archive",
        },
      },
      required: ["message_id"],
    },
  },
  {
    name: "trash_email",
    description: "Move an email to trash",
    parameters: {
      type: Type.OBJECT,
      properties: {
        message_id: {
          type: Type.STRING,
          description: "The Gmail message ID to trash",
        },
      },
      required: ["message_id"],
    },
  },
];

const BROWSER_TOOLS = [
  {
    name: "browse_url",
    description: "Fetch and read the content of any web page. Returns page title, text content, and optionally all links.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING, description: "The URL to browse" },
        extract_links: { type: Type.BOOLEAN, description: "Set true to also extract all links" },
      },
      required: ["url"],
    },
  },
  {
    name: "click_url",
    description: "Navigate to / click a URL (e.g. unsubscribe link, confirmation link). Makes a GET request and follows redirects.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING, description: "The URL to click" },
      },
      required: ["url"],
    },
  },
  {
    name: "submit_form",
    description: "Submit a web form by POSTing data to a URL.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING, description: "The form action URL" },
        data: { type: Type.STRING, description: "JSON string of key-value pairs" },
        content_type: { type: Type.STRING, description: "'form' (default) or 'json'" },
      },
      required: ["url", "data"],
    },
  },
  {
    name: "web_search",
    description: "Search the web for information. Returns results with titles, URLs, and snippets.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Search query" },
      },
      required: ["query"],
    },
  },
];

// ── Tool executor ───────────────────────────────────────────────

async function executeTool(
  userId: string,
  toolName: string,
  args: Record<string, any>
): Promise<any> {
  switch (toolName) {
    case "search_emails":
      return await listEmails(userId, args.query, args.max_results || 10);
    case "read_email":
      return await getEmail(userId, args.message_id);
    case "send_email":
      return await sendEmail(userId, args.to, args.subject, args.body);
    case "reply_to_email":
      return await replyToEmail(userId, args.message_id, args.body);
    case "get_unread_count": {
      const count = await getUnreadCount(userId);
      return { unread_count: count };
    }
    case "archive_email":
      await archiveEmail(userId, args.message_id);
      return { success: true, action: "archived" };
    case "trash_email":
      await trashEmail(userId, args.message_id);
      return { success: true, action: "trashed" };
    case "browse_url":
      return await browseUrl(args.url, { extractLinks: args.extract_links });
    case "click_url":
      return await clickUrl(args.url);
    case "submit_form": {
      const formData = typeof args.data === "string" ? JSON.parse(args.data) : args.data;
      return await submitForm(args.url, formData, args.content_type);
    }
    case "web_search":
      return await webSearch(args.query);
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ── Main handler ────────────────────────────────────────────────

export async function POST(request: Request) {
  let parsedBody: {
    userId?: string;
    conversationId?: string;
    message?: string;
    agentName?: string;
  } = {};

  try {
    parsedBody = await request.json();
    const { userId, conversationId, message, agentName } = parsedBody;

    if (!userId || !conversationId || !message) {
      return NextResponse.json(
        { error: "Missing userId, conversationId, or message" },
        { status: 400 }
      );
    }

    // 1. Get API key — platform key first, user override only if valid + different
    const platformKey = process.env.GOOGLE_GENAI_API_KEY?.trim() || "";
    let apiKey = platformKey;
    let provider = "gemini";

    const brainSnap = await adminDb.doc(`users/${userId}/settings/brain`).get();
    if (brainSnap.exists) {
      const brain = brainSnap.data() as { provider: string; apiKey: string };
      if (brain.provider) provider = brain.provider;
      // Only use user key if it looks real (not a dummy/placeholder)
      if (
        brain.apiKey &&
        brain.apiKey.length > 20 &&
        !brain.apiKey.includes("dummy") &&
        !brain.apiKey.includes("placeholder") &&
        !brain.apiKey.includes("your-api-key")
      ) {
        apiKey = brain.apiKey;
      }
    }

    if (!apiKey) {
      apiKey = platformKey;
      provider = "gemini";
    }

    console.log(
      `[Chat] Using ${apiKey === platformKey ? "platform" : "user"} API key for user ${userId}`
    );

    if (!apiKey) {
      return NextResponse.json(
        { error: "No API key configured. Please add your Gemini API key in Connections." },
        { status: 400 }
      );
    }

    // 1b. Intent detection — route complex tasks to the task engine
    const complexPatterns = [
      /\b(clean up|organize|triage|sort through|go through)\b.*\b(inbox|emails|mail|gmail)\b/i,
      /\b(archive|delete|trash)\b.*\b(all|every|older than|from last)\b/i,
      /\b(draft|write|compose)\b.*\b(replies|responses)\b.*\b(all|each|every)\b/i,
      /\b(morning briefing|daily summary|end.of.day|weekly report)\b/i,
      /\b(run|execute|start|trigger)\b.*\b(workflow|automation|briefing)\b/i,
      /\b(follow up|reach out)\b.*\b(all|each|every|batch)\b/i,
      /\b(unsubscribe|opt.out)\b.*\b(from|all|every|emails)\b/i,
      /\b(build|create|make|set up)\b.*\b(workflow|automation|process|routine)\b/i,
      /\b(scan|check|review|audit)\b.*\b(inbox|emails|gmail|mail)\b.*\b(and|then|,)\b/i,
      /\b(clean|purge|clear)\b.*\b(spam|junk|gmail|inbox|promotions)\b/i,
    ];
    const isComplexTask = complexPatterns.some((p) => p.test(message));

    if (isComplexTask) {
      // Create a task and execute it — pass the already-resolved apiKey
      const taskId = await createTask(userId, message, conversationId, apiKey);

      // Start execution in background
      const executionPromise = executeTask(taskId, apiKey).then(async (result) => {
        // Write result back to conversation (user message already exists from client)
        const convRef = adminDb.doc(`conversations/${conversationId}`);
        const convSnap = await convRef.get();
        const existingMsgs = convSnap.exists ? (convSnap.data()?.messages || []) : [];
        const now = new Date().toISOString();
        await convRef.update({
          messages: [
            ...existingMsgs,
            { role: "model", content: `🔄 **Task Completed**\n\n${result}\n\n_Task ID: ${taskId}_`, timestamp: now },
          ],
          status: "idle",
          updatedAt: now,
        });
      }).catch(async (err) => {
        const convRef = adminDb.doc(`conversations/${conversationId}`);
        const convSnap = await convRef.get();
        const existingMsgs = convSnap.exists ? (convSnap.data()?.messages || []) : [];
        const now = new Date().toISOString();
        await convRef.update({
          messages: [
            ...existingMsgs,
            { role: "model", content: `⚠️ Task failed: ${err.message}`, timestamp: now },
          ],
          status: "error",
          updatedAt: now,
        });
      });

      // Update conversation status to running immediately
      await adminDb.doc(`conversations/${conversationId}`).update({
        status: "running",
      });

      return NextResponse.json({
        status: "task_started",
        taskId,
        result: `🧠 **Working on it...**\n\nI'm executing this as a multi-step task. I'll update this conversation when complete.\n\n_Task ID: ${taskId}_`,
      });
    }

    // 2. Load conversation doc to get existing messages (simple chat path)
    const convRef = adminDb.doc(`conversations/${conversationId}`);
    const convSnap = await convRef.get();
    const convData = convSnap.exists ? convSnap.data() : null;
    let allMessages: ChatMessage[] = convData?.messages || [];
    let conversationSummary: string = convData?.summary || "";

    // 3. Update status to running
    await convRef.update({ status: "running" });

    // 4. Load memories + connections
    const [memories, connections] = await Promise.all([
      loadMemories(userId),
      loadConnections(userId),
    ]);

    // 4b. Sliding window + rolling summarization
    //     If conversation is long, summarize old messages and only send recent ones
    if (allMessages.length > SUMMARIZE_THRESHOLD) {
      const cutoff = allMessages.length - MAX_CONTEXT_MESSAGES;
      const oldMessages = allMessages.slice(0, cutoff);

      try {
        conversationSummary = await summarizeOldMessages(
          apiKey,
          oldMessages,
          conversationSummary
        );
        // Trim stored messages — keep only recent ones
        allMessages = allMessages.slice(cutoff);
        console.log(
          `[Chat] Summarized ${oldMessages.length} old messages, keeping ${allMessages.length} recent`
        );
      } catch (err) {
        console.warn("[Chat] Summarization failed, using full history:", err);
        // Fall through — use full history if summarization fails
      }
    }

    // Messages to send to Gemini (windowed)
    const contextMessages = allMessages.slice(-MAX_CONTEXT_MESSAGES);

    // 5. Build system prompt with connection awareness
    const name = agentName || "Employee Zero";
    let systemPrompt = `You are ${name}, an elite AI employee. You are direct, strategic, and action-oriented. You provide clear, actionable intelligence. Format your responses with markdown when appropriate. Be concise but thorough.

You have persistent memory. You remember everything the user has told you across all conversations.`;

    // Connection awareness
    const connectedServices: string[] = [];
    if (connections.gmail?.connected) connectedServices.push("Gmail");
    if (connections.calendar?.connected) connectedServices.push("Google Calendar");
    if (connections.drive?.connected) connectedServices.push("Google Drive");
    if (connections.sheets?.connected) connectedServices.push("Google Sheets");

    if (connectedServices.length > 0) {
      systemPrompt += `\n\n## Connected Services\nYou have access to the following services: ${connectedServices.join(", ")}.\n`;

      if (connections.gmail?.connected) {
        systemPrompt += `\n### Gmail Access\nYou can search, read, send, reply to, archive, and trash emails using the user's connected Gmail account. Use the provided tools to interact with Gmail. When the user asks about emails, proactively use the search_emails or get_unread_count tools.\n\n**Autonomous Mode:** When the user explicitly asks you to perform an action (e.g., "clean up my inbox", "unsubscribe from spam", "archive old emails"), execute it immediately using your tools. Do NOT ask for permission or confirmation for each step — the user already authorized the action by requesting it. Only confirm before sending NEW emails to external recipients.\n\n**Unsubscribe Flow:** When asked to unsubscribe from emails, read the email to find unsubscribe links, then use browse_url to find the link and click_url to follow it. If there's a form, use submit_form.`;
      }
    } else {
      systemPrompt += `\n\n## Services\nNo external services are connected yet. If the user asks about emails, calendar, or other integrations, let them know they can connect services in the **Connections** page.`;
    }

    // Browser capabilities (always available)
    systemPrompt += `\n\n### Web Browsing\nYou can browse any website, read web pages, follow links (like unsubscribe URLs), submit forms, and search the web. Use browse_url to read pages, click_url to follow action links, submit_form for form submissions, and web_search to find information.`;

    // Inject conversation summary for long conversations
    if (conversationSummary) {
      systemPrompt += `\n\n## Earlier Conversation Context\nSummary of earlier parts of this conversation (older messages have been condensed to save processing):\n${conversationSummary}`;
    }

    if (memories.length > 0) {
      systemPrompt += `\n\n## Your Memories\nThese are facts you've learned about the user and important context from past conversations:\n${memories.map((m, i) => `${i + 1}. ${m}`).join("\n")}`;
    }

    systemPrompt += `\n\n## Memory Instructions
When the user tells you something important about themselves (their name, preferences, role, company, goals, instructions for you, etc.), you MUST extract those facts so they can be saved to your long-term memory.

In your response, if there are facts to remember, end your visible response, then on a new line add a section exactly like this:

<memory_extract>
- fact 1
- fact 2
</memory_extract>

The memory_extract section will be automatically processed and NOT shown to the user. Only include genuinely important, persistent facts — not ephemeral details about the current task.`;

    // 6. Build Gemini contents from windowed history + new message
    const contents = [
      ...contextMessages.map((m) => ({
        role: m.role as "user" | "model",
        parts: [{ text: m.content }],
      })),
      { role: "user" as const, parts: [{ text: message }] },
    ];

    // 7. Call Gemini
    let result: string;

    if (provider === "gemini") {
      const hasGmailTools = connections.gmail?.connected;

      const callGemini = async (key: string) => {
        const ai = new GoogleGenAI({ apiKey: key });

        // Config with optional tools
        const config: any = {
          systemInstruction: systemPrompt,
        };
        // Always include browser tools, add Gmail if connected
        const allTools: any[] = [...BROWSER_TOOLS];
        if (hasGmailTools) {
          allTools.push(...GMAIL_TOOLS);
        }
        config.tools = [{ functionDeclarations: allTools }];

        let response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents,
          config,
        });

        // Tool execution loop — max 5 rounds to prevent infinite loops
        let rounds = 0;
        while (rounds < 5) {
          const candidate = response.candidates?.[0];
          const parts = candidate?.content?.parts || [];

          // Check if there's a function call
          const fnCall = parts.find((p: any) => p.functionCall);
          if (!fnCall?.functionCall) break; // No function call — we're done

          const { name: toolName, args } = fnCall.functionCall;
          console.log(`[Chat] Tool call: ${toolName}(${JSON.stringify(args)})`);

          let toolResult: any;
          try {
            toolResult = await executeTool(userId, toolName!, args as Record<string, any>);
          } catch (err: any) {
            toolResult = { error: err.message };
            console.error(`[Chat] Tool error:`, err.message);
          }

          // Feed tool result back to Gemini
          contents.push({
            role: "model" as const,
            parts: [{ functionCall: { name: toolName!, args: args as Record<string, any> } } as any],
          });
          contents.push({
            role: "user" as const,
            parts: [
              {
                functionResponse: {
                  name: toolName!,
                  response: toolResult,
                },
              } as any,
            ],
          });

          response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents,
            config,
          });

          rounds++;
        }

        return (
          response.text ||
          "I processed your request but generated no output. Please try again."
        );
      };

      try {
        result = await callGemini(apiKey);
      } catch (err: any) {
        if (apiKey !== platformKey && platformKey) {
          console.warn(`[Chat] User key failed (${err.message}), retrying with platform key`);
          result = await callGemini(platformKey);
        } else {
          throw err;
        }
      }
    } else {
      result = `⚠️ ${provider} is not yet supported. Please switch to Gemini in your Connections settings.`;
    }

    // 8. Extract and store memories
    const memoryMatch = result.match(/<memory_extract>([\s\S]*?)<\/memory_extract>/);
    if (memoryMatch) {
      const facts = memoryMatch[1]
        .split("\n")
        .map((line) => line.replace(/^-\s*/, "").trim())
        .filter((line) => line.length > 0);
      if (facts.length > 0) await storeMemories(userId, "primary", facts);
      result = result.replace(/<memory_extract>[\s\S]*?<\/memory_extract>/, "").trim();
    }

    // 9. Append messages to conversation doc
    //    The client may have already added the user message — avoid duplicating it
    const now = new Date().toISOString();
    const lastMsg = allMessages[allMessages.length - 1];
    const userAlreadyAdded = lastMsg?.role === "user" && lastMsg?.content === message;
    const updatedMessages: ChatMessage[] = [
      ...allMessages,
      ...(userAlreadyAdded ? [] : [{ role: "user" as const, content: message, timestamp: now }]),
      { role: "model" as const, content: result, timestamp: now },
    ];

    const updatePayload: Record<string, any> = {
      messages: updatedMessages,
      status: "idle",
      updatedAt: now,
    };
    // Persist summary if we generated/updated one
    if (conversationSummary) {
      updatePayload.summary = conversationSummary;
    }

    await convRef.update(updatePayload);

    return NextResponse.json({ status: "completed", result });
  } catch (err: any) {
    console.error("Chat API error:", err);

    try {
      if (parsedBody.conversationId) {
        const convRef = adminDb.doc(`conversations/${parsedBody.conversationId}`);
        const snap = await convRef.get();
        if (snap.exists) {
          await convRef.update({
            status: "error",
            lastError: err.message || "Unknown error",
          });
        }
      }
    } catch {}

    return NextResponse.json(
      { error: err.message || "Chat processing failed" },
      { status: 500 }
    );
  }
}
