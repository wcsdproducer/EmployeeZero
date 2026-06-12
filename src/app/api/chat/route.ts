import { NextResponse, after } from "next/server";
export const maxDuration = 60; // 60 seconds
import { adminDb } from "@/lib/admin";
import { FieldValue } from "firebase-admin/firestore";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}
import { verifyAuth, checkRateLimit, rateLimitResponse } from "@/lib/auth";
import { GoogleGenAI, Type } from "@google/genai";
import { createGeminiClient } from "@/lib/geminiClient";
import {
  listEmails,
  getEmail,
  sendEmail,
  replyToEmail,
  getUnreadCount,
  archiveEmail,
  trashEmail,
} from "@/lib/gmail";
import { createTask, executeTask, resumeTask } from "@/lib/taskEngine";
import { getWorkflowGoal, WORKFLOW_DEFINITIONS } from "@/lib/workflowDefinitions";
import { browseUrl, clickUrl, submitForm, webSearch } from "@/lib/browser";
import {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  findFreeSlots,
} from "@/lib/calendar";
import { getStripeBalance, listStripeCharges, getStripeMetrics } from "@/lib/stripeTools";
import {
  createCustomWorkflow,
  listCustomWorkflows,
  deleteCustomWorkflow,
} from "@/lib/customWorkflows";
import {
  listFiles,
  getFile,
  readFileContent,
  uploadFile,
  createFolder,
} from "@/lib/drive";
import {
  listSpreadsheets,
  readSheet,
  writeSheet,
  appendRows,
  createSpreadsheet,
} from "@/lib/sheets";
import {
  listChannels,
  listVideos,
  getVideoAnalytics,
  searchYouTube,
  listPlaylists as listYouTubePlaylists,
  addToPlaylist as addToYouTubePlaylist,
  getVideoComments as getYouTubeComments,
  replyToComment as replyToYouTubeComment,
} from "@/lib/youtube";
import {
  getProfile as getLinkedInProfile,
  createPost as createLinkedInPost,
  createPostWithLink as createLinkedInPostWithLink,
  getPosts as getLinkedInPosts,
  deletePost as deleteLinkedInPost,
  createImagePost as createLinkedInImagePost,
  commentOnPost as commentOnLinkedInPost,
  reactToPost as reactToLinkedInPost,
} from "@/lib/linkedin";
import {
  getProfile as getTwitterProfile,
  getTimeline as getTwitterTimeline,
  createTweet,
  searchTweets,
  deleteTweet,
  replyToTweet,
  retweet,
  undoRetweet,
  likeTweet,
  unlikeTweet,
  getMentions as getTwitterMentions,
  getFollowers as getTwitterFollowers,
  bookmarkTweet,
  getBookmarks as getTwitterBookmarks,
  getLikedTweets as getTwitterLikedTweets,
  followUser as followTwitterUser,
  unfollowUser as unfollowTwitterUser,
  muteUser as muteTwitterUser,
  blockUser as blockTwitterUser,
} from "@/lib/twitter";
import {
  getProfile as getInstagramProfile,
  getRecentMedia as getInstagramMedia,
  createPost as getInstagramPost,
  getPostComments as getInstagramComments,
  replyToComment as replyToInstagramComment,
  createCarouselPost as createInstagramCarousel,
  createReel as createInstagramReel,
  getPostInsights as getInstagramPostInsights,
  getAccountInsights as getInstagramAccountInsights,
  getStories as getInstagramStories,
  searchHashtag as searchInstagramHashtag,
  deletePost as deleteInstagramPost,
  createStory as createInstagramStory,
  getStoryInsights as getInstagramStoryInsights,
  getTaggedMedia as getInstagramTaggedMedia,
} from "@/lib/instagram";
import {
  getProfile as getFacebookProfile,
  getPages as getFacebookPages,
  getPagePosts as getFacebookPagePosts,
  createPagePost as createFacebookPagePost,
  getPageInsights as getFacebookPageInsights,
  getPostComments as getFacebookPostComments,
  replyToComment as replyToFacebookComment,
  deletePagePost as deleteFacebookPost,
  createPagePhotoPost as createFacebookPhotoPost,
  schedulePagePost as scheduleFacebookPost,
  uploadPageVideo as uploadFacebookVideo,
  createPageReel as createFacebookReel,
  getScheduledPosts as getFacebookScheduledPosts,
  cancelScheduledPost as cancelFacebookScheduledPost,
} from "@/lib/facebook";
import {
  getProfile as getTikTokProfile,
} from "@/lib/tiktok";

import {
  listContacts,
  getContact,
  createContact,
  deleteContact,
} from "@/lib/contacts";
import {
  createNote,
  listNotes,
  getNote,
  updateNote,
  deleteNote,
  searchNotes,
} from "@/lib/notes";
import {
  listTaskLists,
  listTasks,
  createTask as createGoogleTask,
  completeTask,
  deleteTask,
  clearCompleted,
} from "@/lib/tasks";
import {
  createDocument,
  getDocument,
  appendText,
} from "@/lib/docs";
import {
  listAccounts as listBusinessAccounts,
  listLocations,
  getReviews,
  replyToReview,
  createLocalPost,
} from "@/lib/businessProfile";
import {
  listProperties,
  runReport,
  getRealtimeData,
} from "@/lib/analytics";
import {
  createForm,
  addQuestion,
  getForm,
  getResponses,
} from "@/lib/forms";
import {
  createPresentation,
  getPresentation,
  addSlide,
  insertSlideText,
} from "@/lib/slides";
import { isCorrection, recordCorrection, loadPreferences } from "@/lib/selfImprove";
import { executeMcpTool, getMcpToolDeclarations } from "@/lib/mcpClient";

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

async function loadMemories(userId: string, agentId?: string): Promise<string[]> {
  try {
    const snap = await adminDb
      .collection(`users/${userId}/memories`)
      .limit(100)
      .get();
    return snap.docs
      .map((d) => d.data())
      .filter((data) => {
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
      .map((data) => data.content as string);
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

async function loadUserTimezone(userId: string): Promise<string> {
  try {
    const snap = await adminDb.doc(`users/${userId}/settings/preferences`).get();
    return snap.exists ? (snap.data()?.timezone || "UTC") : "UTC";
  } catch {
    return "UTC";
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
  const ai = createGeminiClient(apiKey);

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


import { executeTool } from "@/lib/executeTool";
import { loadUserSOUL, loadTeamContext } from "@/lib/soulAdmin";
import { buildSOULPrompt } from "@/lib/soul";
import { BROWSER_TOOLS, GMAIL_TOOLS, CALENDAR_TOOLS, DRIVE_TOOLS, SHEETS_TOOLS, YOUTUBE_TOOLS, STRIPE_TOOLS, LINKEDIN_TOOLS, TWITTER_TOOLS, INSTAGRAM_TOOLS, FACEBOOK_TOOLS, TIKTOK_TOOLS, CONTACTS_TOOLS, TASKS_TOOLS, DOCS_TOOLS, BUSINESS_PROFILE_TOOLS, ANALYTICS_TOOLS, FORMS_TOOLS, SLIDES_TOOLS, NOTES_TOOLS, MEMORY_TOOLS, WORKFLOW_TOOLS } from "@/lib/agentTools";

export async function POST(request: Request) {
  // ── Auth: Verify Firebase ID token ──
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;
  const verifiedUserId = auth.userId;

  // ── Rate limit: generous for real users, blocks bots ──
  const rateCheck = checkRateLimit(verifiedUserId);
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfter!);

  let parsedBody: {
    conversationId?: string;
    message?: string;
    agentName?: string;
    agentId?: string;
  } = {};

  try {
    parsedBody = await request.json();
    const { conversationId, message, agentName, agentId } = parsedBody;
    // Use verified userId from token — never trust client body
    const userId = verifiedUserId;

    if (!conversationId || !message) {
      return NextResponse.json(
        { error: "Missing conversationId or message" },
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

    if (!apiKey && provider !== "gemini") {
      return NextResponse.json(
        { error: "No API key configured. Please add your API key in Connections." },
        { status: 400 }
      );
    }

    // 1b. Check for pending tasks (workflow waiting for user input)
    const pendingConvSnap = await adminDb.doc(`conversations/${conversationId}`).get();
    const pendingTaskId = pendingConvSnap.exists ? pendingConvSnap.data()?.pendingTaskId : null;

    if (pendingTaskId) {
      // Resume the paused workflow with the user's reply
      await adminDb.doc(`conversations/${conversationId}`).update({
        status: "running",
        pendingTaskId: null,
      });

      resumeTask(pendingTaskId, message, apiKey).then(async (result) => {
        if (result === "__WAITING_INPUT__") return; // Paused again for more input

        const convRef = adminDb.doc(`conversations/${conversationId}`);
        const convSnap = await convRef.get();
        const existingMsgs = convSnap.exists ? (convSnap.data()?.messages || []) : [];
        const now = new Date().toISOString();
        await convRef.update({
          messages: [
            ...existingMsgs,
            { role: "model", content: `🔄 **Workflow Complete**\n\n${result}`, timestamp: now },
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
            { role: "model", content: `⚠️ Workflow failed: ${err.message}`, timestamp: now },
          ],
          status: "error",
          updatedAt: now,
        });
      });

      return NextResponse.json({
        status: "task_resumed",
        taskId: pendingTaskId,
        result: `🧠 **Continuing workflow...**\n\nI received your input and am continuing execution. I'll update this conversation when complete.`,
      });
    }

    // 1c. Intent detection — route complex tasks to the task engine
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
      // Try to extract a workflow ID from the message and use its structured goal
      let taskGoal = message;
      let matchedWorkflowId: string | null = null;
      const lower = message.toLowerCase();
      const normalizedLower = lower.replace(/-/g, " "); // normalize hyphens to spaces
      for (const [wfId, wfDef] of Object.entries(WORKFLOW_DEFINITIONS)) {
        const readableName = wfId.replace(/-/g, " ");
        // Match against both original (hyphenated) and normalized (spaced) versions
        if (lower.includes(wfId) || normalizedLower.includes(readableName)) {
          taskGoal = `[workflow:${wfId}] ${wfDef.goal}`;
          matchedWorkflowId = wfId;
          console.log(`[Chat] Matched workflow '${wfId}' — using structured goal`);
          break;
        }
      }

      // Create a task and execute it — pass the already-resolved apiKey
      const taskId = await createTask(userId, taskGoal, conversationId, apiKey, agentId);

      // Start execution in background (using after to keep the serverless instance alive)
      after(() => {
        executeTask(taskId, apiKey).then(async (result) => {
          // If waiting for input, the task engine already wrote to the conversation
          if (result === "__WAITING_INPUT__") return;

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

    const convRef = adminDb.doc(`conversations/${conversationId}`);
    const convSnap = await convRef.get();
    const convData = convSnap.exists ? convSnap.data() : null;
    let allMessages: ChatMessage[] = convData?.messages || [];
    let conversationSummary: string = convData?.summary || "";

    // 3. Update status to running and write user message to conversation immediately if not already added
    const now = new Date().toISOString();
    const lastMsg = allMessages[allMessages.length - 1];
    const userAlreadyAdded = lastMsg?.role === "user" && lastMsg?.content === message;
    const initialMessages = userAlreadyAdded
      ? allMessages
      : [...allMessages, { role: "user" as const, content: message, timestamp: now }];

    await convRef.update({
      messages: initialMessages,
      status: "running",
      updatedAt: now,
    });

    // Run Gemini and tool calling loop in background
    after(async () => {
      try {
        // 4. Load memories + connections + preferences + learned behaviors
        const [memories, connections, userTimezone, preferences, soul, mcpData, teamContext] = await Promise.all([
          loadMemories(userId, agentId),
          loadConnections(userId),
          loadUserTimezone(userId),
          loadPreferences(userId),
          loadUserSOUL(userId, agentId),
          getMcpToolDeclarations(userId).catch(() => ({ declarations: [] })),
          loadTeamContext(userId, agentId)
        ]);
        const mcpDecls = mcpData.declarations || [];

        // 4b. Sliding window + rolling summarization
        //     If conversation is long, summarize old messages and only send recent ones
        let currentMessages = initialMessages;
        let summaryText = conversationSummary;
        if (currentMessages.length > SUMMARIZE_THRESHOLD) {
          const cutoff = currentMessages.length - MAX_CONTEXT_MESSAGES;
          const oldMessages = currentMessages.slice(0, cutoff);

          try {
            summaryText = await summarizeOldMessages(
              apiKey,
              oldMessages,
              summaryText
            );
            // Trim stored messages — keep only recent ones
            currentMessages = currentMessages.slice(cutoff);
            console.log(
              `[Chat] Summarized ${oldMessages.length} old messages, keeping ${currentMessages.length} recent`
            );
          } catch (err) {
            console.warn("[Chat] Summarization failed, using full history:", err);
          }
        }

        // Messages to send to Gemini (windowed)
        const contextMessages = currentMessages.slice(0, -1).slice(-MAX_CONTEXT_MESSAGES);

        // 5. Build system prompt with connection awareness
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
6. YOU CAN CREATE PDF DOCUMENTS using the create_pdf tool. It generates formatted PDFs and uploads them to Google Drive. NEVER say you cannot create PDFs.
7. YOU CAN DO DEEP RESEARCH using the deep_research tool. It runs 5 parallel searches, browses source pages, and synthesizes comprehensive reports. Use it for any question needing detailed data, budgets, analysis, or multi-source research. NEVER say you cannot research something.
8. NEVER claim you lack a capability without first checking your available tools. You have more tools than you think.

You have persistent memory. You remember everything the user has told you across all conversations.

## Current Date & Time
Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: userTimezone })}. The current time is ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short', timeZone: userTimezone })}. The user's timezone is ${userTimezone}. Always use this timezone for scheduling unless the user specifies otherwise.`;

        // Connection awareness — all 17 possible services
        const connectedServices: string[] = [];
        if (connections.gmail?.connected) connectedServices.push("Gmail");
        if (connections.calendar?.connected) connectedServices.push("Google Calendar");
        if (connections.drive?.connected) connectedServices.push("Google Drive");
        if (connections.sheets?.connected) connectedServices.push("Google Sheets");
        if (connections.docs?.connected) connectedServices.push("Google Docs");
        if (connections.slides?.connected) connectedServices.push("Google Slides");
        if (connections.forms?.connected) connectedServices.push("Google Forms");
        if (connections.tasks?.connected) connectedServices.push("Google Tasks");
        if (connections.youtube?.connected) connectedServices.push("YouTube");
        if (connections.analytics?.connected) connectedServices.push("Google Analytics");
        if (connections.business?.connected) connectedServices.push("Google Business Profile");
        if (connections.contacts?.connected) connectedServices.push("Google Contacts");
        if (connections.linkedin?.connected) connectedServices.push("LinkedIn");
        if (connections.twitter?.connected) connectedServices.push("X/Twitter");
        if (connections.instagram?.connected) connectedServices.push("Instagram");
        if (connections.facebook?.connected) connectedServices.push("Facebook");
        if (connections.tiktok?.connected) connectedServices.push("TikTok");
        if (connections.stripe?.connected) connectedServices.push("Stripe");
        if (mcpDecls.length > 0) connectedServices.push(...mcpDecls.map(d => d.name));

        if (connectedServices.length > 0) {
          systemPrompt += `\n\n## Connected Services\nYou have access to the following services: ${connectedServices.join(", ")}.\n`;

          if (connections.gmail?.connected) {
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

          if (connections.business?.connected) {
            systemPrompt += `\n\n### Google Business Profile Access\nYou can list business accounts/locations, get and reply to customer reviews, and create posts. Use for reputation management, review responses, and local marketing.`;
          }

          if (connections.contacts?.connected || connections.gmail?.connected) {
            systemPrompt += `\n\n### Google Contacts Access\nYou can list, search, create, update, and delete contacts. Use for CRM, relationship tracking, and contact enrichment.`;
          }
        } else {
          systemPrompt += `\n\n## Services\nNo external services are connected yet. If the user asks about emails, calendar, or other integrations, let them know they can connect services in the **Connections** page.`;
        }

        // Browser capabilities (always available)
        systemPrompt += `\n\n### Web Browsing & Research\nYou have two search tools — choose the right one:\n- **web_search**: Quick factual lookups (e.g., "what's the capital of France", "current weather"). Fast, ~2 seconds.\n- **deep_research**: Comprehensive multi-source research (e.g., budgets, cost of living, market analysis, comparisons, travel planning, financial planning). Runs 5 parallel searches, browses 6+ source pages, and synthesizes a detailed report with specific numbers and citations. Takes ~30 seconds but provides thorough, accurate results. **USE THIS for any question that needs detailed data, breakdowns, or analysis.**\n\nYou also have: browse_url (read specific pages), click_url (follow links), submit_form (POST to forms).`;

        // Notes (always available)
        systemPrompt += `\n\n### Notes & Knowledge Base\nYou can create, list, read, update, delete, and search notes. Notes persist across conversations and serve as your knowledge base. Use create_note to save reports, research, and important information for later reference.`;

        // Charts (always available)
        systemPrompt += `\n\n### Interactive Charts
You can generate interactive charts (Bar, Line, Area) in the UI by outputting a JSON code block with the language "chart". If the user asks for a chart or graph, ALWAYS use this capability instead of saying you can't.
Format the output EXACTLY like this (do not write any JSON outside this block):
\`\`\`chart
{
  "type": "bar",
  "title": "Top 10 Crypto Prices",
  "data": [
    { "name": "BTC", "value": 65000 },
    { "name": "ETH", "value": 3500 }
  ]
}
\`\`\``;

        systemPrompt += `\n\n### Custom Workflows & Scheduling\nYou have workflow management tools: create_workflow, list_my_workflows, delete_workflow.\n\n**IMPORTANT:** When the user asks to "create a workflow", "set up an automation", or "build a routine", use the **create_workflow** tool to SAVE a workflow definition. Do NOT actually execute the workflow steps — just save the definition so the user can run it later from their Workflows page.\n\nThe "goal" field should contain detailed, step-by-step instructions for another AI agent to follow when the workflow is eventually executed. Include specific tool names (like search_emails, list_events, web_search) and formatting requirements.\n\n**Scheduling / Cron Jobs:** You can schedule any workflow (built-in or custom) to run automatically using these tools:\n- **schedule_workflow**: Schedule a workflow with a cron expression. Use this when users say "run this every morning", "schedule it daily", "set up a cron job", etc.\n- **list_scheduled_jobs**: Show all active and paused scheduled jobs.\n- **pause_scheduled_job** / **resume_scheduled_job**: Pause or resume a job.\n- **delete_scheduled_job**: Permanently remove a scheduled job.\n\nCommon cron expressions: "0 8 * * *" (daily 8 AM), "0 9 * * 1-5" (weekdays 9 AM), "*/15 * * * *" (every 15 min), "0 */2 * * *" (every 2 hours).\n\nWhen a user says "turn this into a cron job" or "schedule this", first create the workflow if it doesn't exist, then use schedule_workflow.`;

        // ── Dynamically built workflow awareness ──
        const connectedKeys = new Set(
          Object.entries(connections)
            .filter(([, v]) => v?.connected)
            .map(([k]) => k)
        );

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
          const customWfs = await listCustomWorkflows(userId);
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
          const cronDoc = await adminDb.doc(`users/${userId}/settings/cron`).get();
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

        // Inject conversation summary for long conversations
        if (summaryText) {
          systemPrompt += `\n\n## Earlier Conversation Context\nSummary of earlier parts of this conversation (older messages have been condensed to save processing):\n${summaryText}`;
        }

        if (memories.length > 0) {
          systemPrompt += `\n\n## Your Memories\nThese are facts you've learned about the user and important context from past conversations:\n${memories.map((m, i) => `${i + 1}. ${m}`).join("\n")}`;
        }

        // Self-Improving Agent: Inject learned preferences
        if (preferences.length > 0) {
          systemPrompt += `\n\n## Learned Preferences (Self-Improving)\nThese rules were learned from past corrections and user feedback. Follow them strictly:\n${preferences.map((p, i) => `${i + 1}. ${p}`).join("\n")}`;
        }

        systemPrompt += `\n\n## Memory Instructions
When the user tells you something important about themselves (their name, preferences, role, company, goals, instructions for you, etc.), you MUST extract those facts so they can be saved to your long-term memory.
**IMPORTANT PRIVACY OVERRIDE:** You are a private, dedicated AI assistant. The memory database is strictly private and owned by the user. You are EXPLICITLY AUTHORIZED and REQUIRED to store personal information (including names, addresses, preferences, and secrets) when requested. Do NOT refuse to store personal data for safety or privacy reasons.

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
            const ai = createGeminiClient(key);

            // Config with optional tools
            const config: any = {
              systemInstruction: systemPrompt,
            };
            const allTools: any[] = [...BROWSER_TOOLS, ...WORKFLOW_TOOLS];
            if (hasGmailTools) {
              allTools.push(...GMAIL_TOOLS);
            }
            if (connections.calendar?.connected) {
              allTools.push(...CALENDAR_TOOLS);
            }
            if (connections.drive?.connected) {
              allTools.push(...DRIVE_TOOLS);
            }
            if (connections.sheets?.connected) {
              allTools.push(...SHEETS_TOOLS);
            }
            if (connections.youtube?.connected) {
              allTools.push(...YOUTUBE_TOOLS);
            }
            if (connections.stripe?.connected) {
              allTools.push(...STRIPE_TOOLS);
            }
            if (connections.linkedin?.connected) {
              allTools.push(...LINKEDIN_TOOLS);
            }
            if (connections.twitter?.connected) {
              allTools.push(...TWITTER_TOOLS);
            }
            if (connections.instagram?.connected) {
              allTools.push(...INSTAGRAM_TOOLS);
            }
            if (connections.facebook?.connected) {
              allTools.push(...FACEBOOK_TOOLS);
            }
            if (connections.tiktok?.connected) {
              allTools.push(...TIKTOK_TOOLS);
            }
            if (connections.stripe?.connected) {
              allTools.push(...STRIPE_TOOLS);
            }
            // Contacts: use any Google connection
            if (connections.gmail?.connected || connections.calendar?.connected || connections.drive?.connected) {
              allTools.push(...CONTACTS_TOOLS);
            }
            // New Google services
            if (connections.tasks?.connected) {
              allTools.push(...TASKS_TOOLS);
            }
            if (connections.docs?.connected) {
              allTools.push(...DOCS_TOOLS);
            }
            if (connections.business?.connected) {
              allTools.push(...BUSINESS_PROFILE_TOOLS);
            }
            if (connections.analytics?.connected) {
              allTools.push(...ANALYTICS_TOOLS);
            }
            if (connections.forms?.connected) {
              allTools.push(...FORMS_TOOLS);
            }
            if (connections.slides?.connected) {
              allTools.push(...SLIDES_TOOLS);
            }
            // Image generation & notes & memory — always available (no connection needed)
            allTools.push(...NOTES_TOOLS, ...MEMORY_TOOLS);

            const CORE_TOOL_NAMES = [
              "browse_url", "click_url", "submit_form", "web_search", "deep_research", "create_pdf",
              "create_workflow", "list_my_workflows", "delete_workflow",
              "schedule_workflow", "list_scheduled_jobs", "pause_scheduled_job", "resume_scheduled_job", "delete_scheduled_job",
              "create_note", "list_notes", "get_note", "update_note", "delete_note", "search_notes",
              "save_memory",
              "create_chart"
            ];

            let filteredTools = allTools;
            if (soul.enabledTools && soul.enabledTools.length > 0) {
              filteredTools = allTools.filter(t => 
                CORE_TOOL_NAMES.includes(t.name) || soul.enabledTools!.includes(t.name)
              );
            }

            config.tools = [{ functionDeclarations: filteredTools }];

            let response = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents,
              config,
            });

            // Tool execution loop — max 10 rounds to handle multi-step operations
            let rounds = 0;
            while (rounds < 10) {
              const candidate = response.candidates?.[0];
              const parts = candidate?.content?.parts || [];

              // Check if there's a function call
              const fnCall = parts.find((p: any) => p.functionCall);
              if (!fnCall?.functionCall) break; // No function call — we're done

              const { name: toolName, args } = fnCall.functionCall;
              console.log(`[Chat] Tool call: ${toolName}(${JSON.stringify(args)})`);

              if (conversationId && userId) {
                let actionLabel = `Running ${toolName}...`;
                if (toolName === "web_search") actionLabel = "Searching the web...";
                if (toolName === "deep_research") actionLabel = "Researching in depth...";
                if (toolName === "read_url") actionLabel = "Reading website...";
                if (toolName.includes("mail")) actionLabel = "Checking email...";
                if (toolName.includes("calendar")) actionLabel = "Checking calendar...";
                try {
                  await adminDb.doc(`conversations/${conversationId}`).update({ currentAction: actionLabel });
                } catch (err) {}
              }

              let toolResult: any;
              const toolTimeout = toolName === "deep_research" ? 90000 : 30000;
              try {
                toolResult = await withTimeout(
                  executeTool(userId, toolName!, args as Record<string, any>, agentId),
                  toolTimeout,
                  `Tool ${toolName}`
                );
              } catch (err: any) {
                toolResult = { error: err.message };
                console.error(`[Chat] Tool error:`, err.message);
              }

              // Feed tool result back to Gemini — response MUST be a plain object
              const safeResult = Array.isArray(toolResult)
                ? { results: toolResult }
                : (typeof toolResult === "object" && toolResult !== null)
                  ? toolResult
                  : { value: toolResult };
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
                      response: safeResult,
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

            // Extract text from the final response after tool loop
            const finalCandidate = response.candidates?.[0];
            const finalParts = finalCandidate?.content?.parts || [];
            const textParts = finalParts
              .filter((p: any) => p.text)
              .map((p: any) => p.text)
              .join("");

            // If we got text, return it
            if (textParts) return textParts;
            if (response.text) return response.text;

            // No text response — force a follow-up to get a verbal reply
            console.warn("[Chat] Empty model response — forcing verbal follow-up");
            contents.push({
              role: "user" as const,
              parts: [{ text: "Please respond to my message with a helpful verbal reply. Summarize what you just did or address what I said." }],
            });

            const retryResponse = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents,
              config: { systemInstruction: systemPrompt },
            });

            return (
              retryResponse.text ||
              retryResponse.candidates?.[0]?.content?.parts?.filter((p: any) => p.text).map((p: any) => p.text).join("") ||
              "I heard you, but I'm having trouble formulating a response. Could you try rephrasing?"
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
          if (facts.length > 0) await storeMemories(userId, "company", facts);
          result = result.replace(/<memory_extract>[\s\S]*?<\/memory_extract>/, "").trim();
        }

        // 8b. Self-Improving Agent: Detect corrections and learn
        if (isCorrection(message)) {
          const lastAssistantMsg = currentMessages.filter(m => m.role === "model").pop();
          if (lastAssistantMsg) {
            recordCorrection(userId, message, lastAssistantMsg.content).catch(e =>
              console.warn("[SelfImprove] Failed to record correction:", e.message)
            );
          }
        }

        // 9. Fetch latest messages from Firestore to avoid race condition where user has sent another message while agent was thinking
        const freshSnap = await convRef.get();
        const freshData = freshSnap.exists ? freshSnap.data() : null;
        let freshMessages: ChatMessage[] = freshData?.messages || [];

        // Check if user already added this message (normally they did during the synchronous part)
        const freshLastMsg = freshMessages[freshMessages.length - 1];
        const freshUserAlreadyAdded = freshLastMsg?.role === "user" && freshLastMsg?.content === message;

        let finalMessages: ChatMessage[] = [
          ...freshMessages,
          ...(freshUserAlreadyAdded ? [] : [{ role: "user" as const, content: message, timestamp: now }]),
          { role: "model" as const, content: result, timestamp: new Date().toISOString() },
        ];

        // Sliding window trimming right before write
        let finalSummary = summaryText;
        if (finalMessages.length > SUMMARIZE_THRESHOLD) {
          const cutoff = finalMessages.length - MAX_CONTEXT_MESSAGES;
          const oldMessages = finalMessages.slice(0, cutoff);
          try {
            finalSummary = await summarizeOldMessages(
              apiKey,
              oldMessages,
              finalSummary
            );
            finalMessages = finalMessages.slice(cutoff);
          } catch (err) {
            console.warn("[Chat] Summarization failed on final messages:", err);
          }
        }

        const updatePayload: Record<string, any> = {
          messages: finalMessages,
          status: "idle",
          currentAction: FieldValue.delete(),
          updatedAt: new Date().toISOString(),
        };
        if (finalSummary) {
          updatePayload.summary = finalSummary;
        }

        await convRef.update(updatePayload);

      } catch (err: any) {
        console.error("Async Chat API error:", err);
        try {
          await convRef.update({
            status: "error",
            lastError: err.message || "Unknown error",
            currentAction: FieldValue.delete(),
          });
        } catch {}
      }
    });

    return NextResponse.json({ status: "started" });
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
            currentAction: FieldValue.delete(),
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
