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

async function loadMemories(userId: string, agentId?: string, query?: string, apiKey?: string): Promise<string[]> {
  try {
    const snap = await adminDb
      .collection(`users/${userId}/memories`)
      .limit(200)
      .get();
    
    const allMemories = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
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
      });

    // If we have a query and API key, try semantic search
    if (query && apiKey) {
      const withEmbeddings = allMemories.filter((m: any) => m.embedding && m.embedding.length > 0);
      
      if (withEmbeddings.length >= 5) {
        // Use semantic search — import dynamically to avoid circular deps
        const { semanticSearch } = await import("@/lib/embeddings");
        const items = withEmbeddings.map((m: any) => ({
          id: m.id,
          content: m.content as string,
          embedding: m.embedding as number[],
        }));
        const ranked = await semanticSearch(apiKey, query, items, 20, 0.25);
        
        // Also include knowledge summaries (always relevant)
        const summaries = allMemories
          .filter((m: any) => (m.content as string).startsWith("[Knowledge Summary]"))
          .map((m: any) => m.content as string);
        
        const semanticResults = ranked.map(r => r.content);
        // Merge: summaries first, then semantic results, deduplicated
        const merged = [...new Set([...summaries, ...semanticResults])];
        console.log(`[Memory] Semantic search: ${ranked.length} relevant (${withEmbeddings.length} embedded, ${allMemories.length} total)`);
        return merged.slice(0, 30);
      }
    }
    
    // Fallback: return all memories (no embeddings available yet)
    return allMemories.slice(0, 50).map((data: any) => data.content as string);
  } catch (err) {
    console.warn("Failed to load memories:", err);
    return [];
  }
}

async function storeMemories(userId: string, agentId: string, facts: string[], apiKey?: string) {
  const batch = adminDb.batch();
  for (const fact of facts) {
    const ref = adminDb.collection(`users/${userId}/memories`).doc();
    const memoryData: any = {
      agentId,
      content: fact,
      createdAt: new Date().toISOString(),
    };
    // Generate embedding for semantic search
    if (apiKey) {
      try {
        const { embedText } = await import("@/lib/embeddings");
        const embedding = await embedText(apiKey, fact);
        if (embedding.length > 0) memoryData.embedding = embedding;
      } catch {}
    }
    batch.set(ref, memoryData);
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

  try { return response.text || existingSummary || ""; } catch { return existingSummary || ""; }
}

// ── Tool declarations ───────────────────────────────────────────


import { executeTool } from "@/lib/executeTool";
import { loadUserSOUL, loadTeamContext } from "@/lib/soulAdmin";
import { buildSOULPrompt } from "@/lib/soul";
import { BROWSER_TOOLS, GMAIL_TOOLS, CALENDAR_TOOLS, DRIVE_TOOLS, SHEETS_TOOLS, YOUTUBE_TOOLS, STRIPE_TOOLS, LINKEDIN_TOOLS, TWITTER_TOOLS, INSTAGRAM_TOOLS, FACEBOOK_TOOLS, TIKTOK_TOOLS, CONTACTS_TOOLS, TASKS_TOOLS, DOCS_TOOLS, BUSINESS_PROFILE_TOOLS, ANALYTICS_TOOLS, FORMS_TOOLS, SLIDES_TOOLS, NOTES_TOOLS, MEMORY_TOOLS, WORKFLOW_TOOLS, TOOL_TOOLS, SKILL_TOOLS } from "@/lib/agentTools";
import { classifyIntent, getToolLoadConfig, getPromptSections } from "@/lib/intentClassifier";

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
      /\b(all|every)\b.*\b(archive|delete|trash|mark as read)\b/i,  // catches "mark them all... archive"
      /\b(all|every)\b.*\b(emails?|messages?)\b.*\b(from|by|sent by)\b/i,  // catches "all emails from X"
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

    // 3. Atomic concurrency guard — prevent duplicate API calls
    //    Use a transaction to ensure only ONE request can flip status from idle→running
    const now = new Date().toISOString();
    let allMessages: ChatMessage[] = [];
    let conversationSummary: string = "";
    let initialMessages: ChatMessage[] = [];

    try {
      await adminDb.runTransaction(async (tx) => {
        const convSnap = await tx.get(convRef);
        const convData = convSnap.exists ? convSnap.data() : null;
        const currentStatus = convData?.status || "idle";

        // If already running, abort — another request is handling this
        if (currentStatus === "running") {
          throw new Error("__ALREADY_RUNNING__");
        }

        allMessages = convData?.messages || [];
        conversationSummary = convData?.summary || "";

        const lastMsg = allMessages[allMessages.length - 1];
        const userAlreadyAdded = lastMsg?.role === "user" && lastMsg?.content === message;
        initialMessages = userAlreadyAdded
          ? allMessages
          : [...allMessages, { role: "user" as const, content: message, timestamp: now }];

        tx.update(convRef, {
          messages: initialMessages,
          status: "running",
          updatedAt: now,
        });
      });
    } catch (err: any) {
      if (err.message === "__ALREADY_RUNNING__") {
        console.log(`[Chat] Conversation ${conversationId} already running — rejecting duplicate request`);
        return NextResponse.json({ status: "already_running" });
      }
      throw err;
    }

    // Run Gemini and tool calling loop inline — keeps HTTP request alive
    try {
        // 4. Load memories + connections + preferences + learned behaviors
        console.log(`[Chat] Step 4: Loading data...`);
        const [memories, connections, userTimezone, preferences, soul, mcpData, teamContext] = await Promise.all([
          withTimeout(loadMemories(userId, agentId, message, apiKey), 15000, "loadMemories"),
          withTimeout(loadConnections(userId), 15000, "loadConnections"),
          withTimeout(loadUserTimezone(userId), 15000, "loadUserTimezone"),
          withTimeout(loadPreferences(userId), 15000, "loadPreferences"),
          withTimeout(loadUserSOUL(userId, agentId), 15000, "loadUserSOUL"),
          withTimeout(getMcpToolDeclarations(userId).catch(() => ({ declarations: [] })), 15000, "getMcpToolDeclarations"),
          withTimeout(loadTeamContext(userId, agentId), 15000, "loadTeamContext"),
        ]);
        const mcpDecls = mcpData.declarations || [];
        console.log(`[Chat] Step 4 done: ${memories.length} memories, ${Object.keys(connections).length} connections`);

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

        // 5. Classify intent and build dynamic system prompt
        const intentResult = classifyIntent(message);
        const toolConfig = getToolLoadConfig(intentResult.intents);
        const promptSections = getPromptSections(intentResult.intents);
        console.log(`[Chat] Intent: ${intentResult.intents.join("+")} | thinking: ${intentResult.thinkingBudget} | sections: ${promptSections.size}`);

        let systemPrompt = buildSOULPrompt(soul) + "\n\n";
        if (teamContext) {
          systemPrompt += teamContext + "\n\n";
        }

        systemPrompt += `RULES:
1. You have internet access via tools. NEVER say you cannot access the web.
2. You have persistent memory. Reference "Your Memories" below.
3. Complete work using tools immediately — no filler like "I'm on it" or "Give me a moment."
4. Attempt tools before claiming you cannot do something.
5. You can create PDFs, do deep research, browse websites, and manage workflows.
6. When asked about previous completed tasks, past conversations, or information you should already know, you MUST first search your embeddings/memories or search past conversations for related information. If the answer is not found, DO NOT guess or hallucinate; instead, clearly state that you don't have the details in your memory and offer to research it and get back to the user.

## Current Date & Time
${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: userTimezone })} ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short', timeZone: userTimezone })}. Timezone: ${userTimezone}.`;

        // Connected services list (always — just names, not full docs)
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
          systemPrompt += `\n\n## Connected Services\n${connectedServices.join(", ")}.`;
        } else {
          systemPrompt += `\n\n## Services\nNo services connected. User can connect them in the Connections page.`;
        }

        // ── Intent-specific service instructions (only loaded when relevant) ──
        if (promptSections.has("gmail") && connections.gmail?.connected) {
          systemPrompt += `\n\n### Gmail
Search, read, send, reply, archive, trash emails. **SENDING:** NEVER send without approval. Draft it, show To/Subject/Body, ask "Shall I send this?", only send after explicit "yes". For non-send actions (archive, trash, search), execute immediately.`;
        }

        if (promptSections.has("calendar") && connections.calendar?.connected) {
          systemPrompt += `\n\n### Calendar
List, create, update, delete events. Check free/busy. Use ISO 8601 with timezone (e.g., "2026-03-29T14:00:00-04:00"). You already know the current date.`;
        }

        if (promptSections.has("drive") && connections.drive?.connected) {
          systemPrompt += `\n\n### Drive
List, search, read, upload files and create folders. Format results as: [filename](url) — Type, last modified.`;
        }

        if (promptSections.has("sheets") && connections.sheets?.connected) {
          systemPrompt += `\n\n### Sheets
Read/write cells, append rows, create spreadsheets. Use A1 notation. Accept Google Sheets URLs directly as spreadsheet_id.`;
        }

        if (promptSections.has("youtube") && connections.youtube?.connected) {
          systemPrompt += `\n\n### YouTube
List channels, videos with analytics (views, likes, comments), search YouTube.`;
        }

        if (promptSections.has("linkedin") && connections.linkedin?.connected) {
          systemPrompt += `\n\n### LinkedIn
View profile, create posts. **POSTING:** Draft first, get approval, then post.`;
        }

        if (promptSections.has("twitter") && connections.twitter?.connected) {
          systemPrompt += `\n\n### X/Twitter (Write-Only)
FREE tier: post, delete, reply, retweet, like only. CANNOT read/search. **POSTING:** Draft first, get approval.`;
        }

        if (promptSections.has("instagram") && connections.instagram?.connected) {
          systemPrompt += `\n\n### Instagram
View profile, recent posts, publish image posts. **POSTING:** Draft caption first, get approval.`;
        }

        if (promptSections.has("facebook") && connections.facebook?.connected) {
          systemPrompt += `\n\n### Facebook
List Pages, view/create posts. Use get_facebook_pages first. **POSTING:** Draft first, get approval.`;
        }

        if (promptSections.has("tiktok") && connections.tiktok?.connected) {
          systemPrompt += `\n\n### TikTok
View profile, follower count, video stats. Posting not yet available.`;
        }

        if (promptSections.has("stripe") && connections.stripe?.connected) {
          systemPrompt += `\n\n### Stripe
Access revenue, balances, payments, MRR, subscriptions.`;
        }

        if (promptSections.has("tasks") && connections.tasks?.connected) {
          systemPrompt += `\n\n### Tasks
List, create, complete, delete tasks with due dates.`;
        }

        if (promptSections.has("docs") && connections.docs?.connected) {
          systemPrompt += `\n\n### Google Docs
Create docs, append text, read metadata.`;
        }

        if (promptSections.has("slides") && connections.slides?.connected) {
          systemPrompt += `\n\n### Slides
Create presentations, add slides (TITLE, TITLE_AND_BODY layouts), insert text.`;
        }

        if (promptSections.has("forms") && connections.forms?.connected) {
          systemPrompt += `\n\n### Forms
Create forms, add questions (SHORT_ANSWER, MULTIPLE_CHOICE, etc.), read responses.`;
        }

        if (promptSections.has("analytics") && connections.analytics?.connected) {
          systemPrompt += `\n\n### Analytics
List GA4 properties, run reports, get real-time active users.`;
        }

        if (promptSections.has("business") && connections.business?.connected) {
          systemPrompt += `\n\n### Business Profile
List locations, get/reply to reviews, create posts.`;
        }

        if (promptSections.has("contacts") && (connections.contacts?.connected || connections.gmail?.connected)) {
          systemPrompt += `\n\n### Contacts
List, search, create, update, delete contacts.`;
        }

        // Web browsing (loaded for search/research/pdf intents)
        if (promptSections.has("web_browsing")) {
          systemPrompt += `\n\n### Web & Research
- **web_search**: Quick lookups (~2s). - **deep_research**: Multi-source reports with citations (~30s).
- browse_url for specific pages. NEVER browse google.com/bing.com (blocked by CAPTCHAs).`;
        }

        // Notes (loaded for notes/research intents)
        if (promptSections.has("notes")) {
          systemPrompt += `\n\n### Notes
Create, list, read, update, delete, search notes. Persistent knowledge base.`;
        }

        // Charts (always available — very compact)
        systemPrompt += `\n\n### Charts
Output \`\`\`chart JSON blocks with {type, title, data: [{name, value}]} for Bar/Line/Area charts.`;

        // Workflows + Skills/Tools (loaded for workflow/skills intent)
        if (promptSections.has("workflows")) {
          const connectedKeys = new Set(
            Object.entries(connections)
              .filter(([, v]) => v?.connected)
              .map(([k]) => k)
          );

          // Lean built-in workflow catalog — names only, grouped by category
          const wfByCategory: Record<string, string[]> = {};
          for (const [wfId, wfDef] of Object.entries(WORKFLOW_DEFINITIONS)) {
            if (wfDef.connectionOptional || wfDef.requiredConnections.length === 0 || wfDef.requiredConnections.every(c => connectedKeys.has(c))) {
              const name = wfId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
              const cat = (wfDef as any).category || "general";
              if (!wfByCategory[cat]) wfByCategory[cat] = [];
              wfByCategory[cat].push(name);
            }
          }
          const wfCatalog = Object.entries(wfByCategory)
            .map(([, names]) => names.slice(0, 6).join(", "))
            .join(" | ");

          systemPrompt += `\n\n### Automations (Tools · Skills · Workflows)
You have a two-tier automation system:
- **Pre-installed** (built-in, always available): 18 Tools · 8 Skills · 12 Workflows
- **Custom** (user-created, exclusive to this user): fetched on demand

**IMPORTANT — Lazy Loading Rule**: You do NOT have all automation details pre-loaded. To keep responses fast and token-efficient:
1. When user asks to run/explain/build on a Skill or Workflow → FIRST call \`get_automation_details(type, id)\` to get the full step-by-step instructions
2. When user asks "what can you do?" or about capabilities → list available names, then offer to detail any specific one
3. NEVER guess the steps of a Skill or Workflow — always fetch first

Available built-in workflows (names only — use get_automation_details for full goal):
${wfCatalog || "Morning Briefing, Inbox Commander, Meeting Prep, Weekly Report, Lead Tracker, Competitor Intel, Social Autopilot, Content Calendar"}

Available built-in skills (names only):
Lead Research · Email Campaign · Content Publishing · Morning Briefing Prep · Spreadsheet Reporter · Competitor Intelligence · Meeting Preparation · Data Entry & Logging

Available built-in tools (names only):
Search Gmail · Send Email · Read Sheet · Write Sheet · Format Sheet · Create Spreadsheet · Web Search · Deep Research · Browse URL · Search Calendar · Create Event · Create Doc · Post LinkedIn · Post Twitter · Post Instagram · Search Drive · Create PDF

Workflow scheduling: schedule_workflow with cron. Common: "0 8 * * *" (daily 8AM), "0 9 * * 1-5" (weekdays 9AM).`;

          // Custom workflows (names only)
          try {
            const customWfs = await listCustomWorkflows(userId);
            if (customWfs.length > 0) {
              systemPrompt += `\nUser's custom workflows: ${customWfs.map(w => w.name).join(", ")}`;
            }
          } catch (err) {}

          // Custom skills/tools (names only)
          try {
            const [customSkills, customTools] = await Promise.all([
              listCustomSkills(userId),
              listCustomTools(userId),
            ]);
            if (customSkills.length > 0) {
              systemPrompt += `\nUser's custom skills: ${customSkills.map((s: any) => s.name).join(", ")}`;
            }
            if (customTools.length > 0) {
              systemPrompt += `\nUser's custom tools: ${customTools.map((t: any) => t.name).join(", ")}`;
            }
          } catch (err) {}

          // Active cron jobs
          try {
            const cronDoc = await adminDb.doc(`users/${userId}/settings/cron`).get();
            if (cronDoc.exists) {
              const cronJobs = (cronDoc.data()?.jobs || []) as Array<{
                workflowId: string; name: string; schedule: string;
                cronExpression: string; enabled: boolean;
              }>;
              const activeJobs = cronJobs.filter(j => j.enabled);
              if (activeJobs.length > 0) {
                systemPrompt += `\nActive scheduled jobs: ${activeJobs.map(j => `${j.name} (${j.schedule})`).join(", ")}`;
              }
            }
          } catch (err) {}
        }


        // Conversation summary (if long conversation)
        if (summaryText) {
          systemPrompt += `\n\n## Earlier Context\n${summaryText}`;
        }

        // Memories (always)
        if (memories.length > 0) {
          systemPrompt += `\n\n## Your Memories\n${memories.map((m, i) => `${i + 1}. ${m}`).join("\n")}`;
        }

        // Learned preferences (always)
        if (preferences.length > 0) {
          systemPrompt += `\n\n## Learned Preferences\n${preferences.map((p, i) => `${i + 1}. ${p}`).join("\n")}`;
        }

        // Memory instructions (condensed — always)
        systemPrompt += `\n\n## Memory — Save Important Facts
After your response, add: <memory_extract>\n- specific fact\n</memory_extract>
Save: names, birthdays, preferences, business info, corrections, goals. Be specific. Check existing memories before saving duplicates.`;

        // Conversation search (condensed)
        systemPrompt += `\n\nYou have **search_conversations** to search past conversations. Use it when users reference previous discussions.`;

        // 6. Build Gemini contents from windowed history + new message
        const contents = [
          ...contextMessages.map((m) => ({
            role: m.role as "user" | "model",
            parts: [{ text: m.content }],
          })),
          { role: "user" as const, parts: [{ text: message }] },
        ];

        // 7. Call Gemini
        console.log(`[Chat] Step 7: Calling Gemini (provider: ${provider}, contents: ${contents.length} messages)`);
        let result: string;

        if (provider === "gemini") {
          const callGemini = async (key: string) => {
            const ai = createGeminiClient(key);

            // Config with dynamic thinking budget based on intent
            // Only enable thinking mode for complex intents (>= 1024 tokens)
            // For simple chat, omit thinkingConfig entirely to use model defaults
            const config: any = {
              systemInstruction: systemPrompt,
            };
            if (intentResult.thinkingBudget >= 1024) {
              config.thinkingConfig = {
                thinkingBudget: intentResult.thinkingBudget,
              };
            }

            // Intent-aware tool loading — only load tools matching detected intent
            const allTools: any[] = [];

            // Browser/search tools (loaded for search, research, pdf, or any web-related intent)
            if (toolConfig.loadBrowser) allTools.push(...BROWSER_TOOLS);
            // Workflow / Tool / Skill management (loaded for workflow intent)
            if (toolConfig.loadWorkflow) allTools.push(...WORKFLOW_TOOLS, ...TOOL_TOOLS, ...SKILL_TOOLS);
            // Service-specific tools (only loaded when intent matches AND service is connected)
            if (toolConfig.loadGmail && connections.gmail?.connected) allTools.push(...GMAIL_TOOLS);
            if (toolConfig.loadCalendar && connections.calendar?.connected) allTools.push(...CALENDAR_TOOLS);
            if (toolConfig.loadDrive && connections.drive?.connected) allTools.push(...DRIVE_TOOLS);
            if (toolConfig.loadSheets && connections.sheets?.connected) allTools.push(...SHEETS_TOOLS);
            if (toolConfig.loadYoutube && connections.youtube?.connected) allTools.push(...YOUTUBE_TOOLS);
            if (toolConfig.loadStripe && connections.stripe?.connected) allTools.push(...STRIPE_TOOLS);
            if (toolConfig.loadLinkedin && connections.linkedin?.connected) allTools.push(...LINKEDIN_TOOLS);
            if (toolConfig.loadTwitter && connections.twitter?.connected) allTools.push(...TWITTER_TOOLS);
            if (toolConfig.loadInstagram && connections.instagram?.connected) allTools.push(...INSTAGRAM_TOOLS);
            if (toolConfig.loadFacebook && connections.facebook?.connected) allTools.push(...FACEBOOK_TOOLS);
            if (toolConfig.loadTiktok && connections.tiktok?.connected) allTools.push(...TIKTOK_TOOLS);
            if (toolConfig.loadContacts && (connections.gmail?.connected || connections.calendar?.connected || connections.drive?.connected)) allTools.push(...CONTACTS_TOOLS);
            if (toolConfig.loadTasks && connections.tasks?.connected) allTools.push(...TASKS_TOOLS);
            if (toolConfig.loadDocs && connections.docs?.connected) allTools.push(...DOCS_TOOLS);
            if (toolConfig.loadBusiness && connections.business?.connected) allTools.push(...BUSINESS_PROFILE_TOOLS);
            if (toolConfig.loadAnalytics && connections.analytics?.connected) allTools.push(...ANALYTICS_TOOLS);
            if (toolConfig.loadForms && connections.forms?.connected) allTools.push(...FORMS_TOOLS);
            if (toolConfig.loadSlides && connections.slides?.connected) allTools.push(...SLIDES_TOOLS);
            // Notes & memory — always loaded (lightweight, cross-cutting)
            if (toolConfig.loadNotes) allTools.push(...NOTES_TOOLS);
            allTools.push(...MEMORY_TOOLS); // Always load — ensures model always has tools

            // Soul-based filtering (agent-specific tool restrictions)
            let filteredTools = allTools;
            if (soul.enabledTools && soul.enabledTools.length > 0) {
              const CORE_TOOL_NAMES = [
                "save_memory", "search_conversations",
                "create_note", "list_notes", "get_note", "update_note", "delete_note", "search_notes",
              ];
              filteredTools = allTools.filter(t => 
                CORE_TOOL_NAMES.includes(t.name) || soul.enabledTools!.includes(t.name)
              );
            }

            config.tools = [{ functionDeclarations: filteredTools }];
            console.log(`[Chat] Tools loaded: ${filteredTools.length} (intent: ${intentResult.intents.join("+")})`);

            // Safe wrapper: catches "model output empty" SDK errors and retries without tools
            const safeGenerate = async (genConfig: any, retryCount = 0): Promise<any> => {
              try {
                return await ai.models.generateContent({
                  model: "gemini-2.5-flash",
                  contents,
                  config: genConfig,
                });
              } catch (err: any) {
                const isEmpty = err.message?.includes("model output") || err.message?.includes("both be empty");
                if (isEmpty && retryCount < 2) {
                  console.warn(`[Chat] Empty output (attempt ${retryCount + 1}), retrying without tools/thinking`);
                  return await safeGenerate({ systemInstruction: systemPrompt }, retryCount + 1);
                }
                if (isEmpty) {
                  // Return a synthetic response object with fallback text
                  console.warn("[Chat] Empty output after retries, using fallback");
                  return { text: "I heard you! I had a brief processing hiccup. Could you try again?", candidates: [{ content: { parts: [{ text: "I heard you! I had a brief processing hiccup. Could you try again?" }] } }] };
                }
                throw err;
              }
            };

            let response = await safeGenerate(config);

            // Tool execution loop — max 6 rounds to handle multi-step operations
            let rounds = 0;
            while (rounds < 6) {
              const candidate = response.candidates?.[0];
              const parts = candidate?.content?.parts || [];

              // Check if there's a function call
              const fnCall = parts.find((p: any) => p.functionCall);
              const hasText = parts.some((p: any) => p.text && p.text.trim().length > 0);

              // If model gave text but NO tool call, we're done — it's responding to the user
              if (!fnCall?.functionCall) break;

              // If model gave text AND a tool call, this is the last round — execute the tool but stop after
              const isLastRound = hasText && rounds > 0;

              const { name: toolName, args } = fnCall.functionCall;
              console.log(`[Chat] Tool call (round ${rounds + 1}): ${toolName}(${JSON.stringify(args)})`);

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

              // If model already gave a text summary and is now doing another tool call, stop after this one
              if (isLastRound) {
                console.log("[Chat] Model gave text + tool call — executing last tool then stopping");
                // Get one final response for the summary
                response = await safeGenerate({ ...config, tools: undefined }); // No tools — force text-only response
                break;
              }

              response = await safeGenerate(config);

              rounds++;
            }

            // Extract text from the final response after tool loop
            // NEVER use response.text — it's a getter that throws on empty responses
            const extractText = (r: any): string => {
              try {
                const parts = r?.candidates?.[0]?.content?.parts || [];
                return parts.filter((p: any) => p.text).map((p: any) => p.text).join("") || "";
              } catch { return ""; }
            };

            const finalText = extractText(response);
            if (finalText) {
              console.log(`[Chat] Got response (${finalText.length} chars)`);
              return finalText;
            }

            // No text response — force a follow-up to get a verbal reply
            console.warn("[Chat] Empty model response — forcing verbal follow-up (no thinking, no tools)");
            try {
              contents.push({
                role: "user" as const,
                parts: [{ text: "Please respond to my message with a helpful verbal reply. Summarize what you just did or address what I said." }],
              });

              const retryResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents,
                config: { systemInstruction: systemPrompt },
              });

              const retryText = extractText(retryResponse);
              if (retryText) return retryText;
            } catch (retryErr: any) {
              console.warn("[Chat] Retry also failed:", retryErr.message);
            }

            // Hard fallback — never let this throw
            return "I heard you! I'm having a brief hiccup processing that. Could you try again?";
          };

          try {
            result = await callGemini(apiKey);
          } catch (err: any) {
            const isEmptyOutputError = err.message?.includes("model output") || err.message?.includes("both be empty");
            if (isEmptyOutputError) {
              console.warn("[Chat] Gemini returned empty output, using fallback");
              result = "I heard you! I had a brief processing hiccup. Could you try sending that again?";
            } else if (apiKey !== platformKey && platformKey) {
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
          if (facts.length > 0) await storeMemories(userId, "company", facts, apiKey);
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
          // Add a visible error message so the user sees feedback
          const errorMsg = (err.message?.includes("model output") || err.message?.includes("both be empty"))
            ? "I had a brief processing hiccup. Could you try sending that again?"
            : `Sorry, I encountered an issue: ${err.message || "Unknown error"}. Please try again.`;
          await convRef.update({
            status: "idle",
            lastError: err.message || "Unknown error",
            currentAction: FieldValue.delete(),
            messages: FieldValue.arrayUnion({ role: "assistant", content: errorMsg, timestamp: new Date().toISOString() }),
          });
        } catch {}
      }

    return NextResponse.json({ status: "completed" });
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
