import { adminDb } from "@/lib/admin";
import { GoogleGenAI, Type } from "@google/genai";
import {
  listEmails, getEmail, sendEmail, replyToEmail,
  getUnreadCount, archiveEmail, trashEmail,
} from "@/lib/gmail";
import { browseUrl, clickUrl, submitForm, webSearch } from "@/lib/browser";
import {
  listEvents, getEvent, createEvent, updateEvent,
  deleteEvent, findFreeSlots,
} from "@/lib/calendar";
import {
  listFiles, getFile, readFileContent, uploadFile, createFolder,
} from "@/lib/drive";
import {
  listSpreadsheets, readSheet, writeSheet, appendRows, createSpreadsheet,
} from "@/lib/sheets";
import {
  listChannels, listVideos, getVideoAnalytics, searchYouTube,
} from "@/lib/youtube";

/* ─── Types ─── */

export interface TaskStep {
  action: string;
  toolName?: string;
  args?: Record<string, any>;
  result?: any;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface Task {
  id: string;
  userId: string;
  conversationId?: string;
  goal: string;
  status: "planning" | "running" | "completed" | "failed";
  plan?: string;
  steps: TaskStep[];
  result?: string;
  tokensUsed: number;
  createdAt: string;
  updatedAt: string;
}

/* ─── Constants ─── */

const MAX_STEPS = 15;
const MAX_RETRIES_PER_STEP = 2;

/* ─── Tool Registry ─── */

const TOOL_DECLARATIONS = [
  {
    name: "search_emails",
    description: "Search or list emails in Gmail. Use Gmail search syntax.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Gmail search query" },
        max_results: { type: Type.NUMBER, description: "Max emails to return (1-20)" },
      },
    },
  },
  {
    name: "read_email",
    description: "Read full content of a specific email by message ID.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        message_id: { type: Type.STRING, description: "Gmail message ID" },
      },
      required: ["message_id"],
    },
  },
  {
    name: "send_email",
    description: "Send a new email.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        to: { type: Type.STRING, description: "Recipient email" },
        subject: { type: Type.STRING, description: "Subject line" },
        body: { type: Type.STRING, description: "Email body" },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "reply_to_email",
    description: "Reply to an email thread.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        message_id: { type: Type.STRING, description: "Message ID to reply to" },
        body: { type: Type.STRING, description: "Reply body" },
      },
      required: ["message_id", "body"],
    },
  },
  {
    name: "get_unread_count",
    description: "Get count of unread inbox emails.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "archive_email",
    description: "Archive an email (remove from inbox).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        message_id: { type: Type.STRING, description: "Message ID to archive" },
      },
      required: ["message_id"],
    },
  },
  {
    name: "trash_email",
    description: "Move an email to trash.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        message_id: { type: Type.STRING, description: "Message ID to trash" },
      },
      required: ["message_id"],
    },
  },
  {
    name: "report_progress",
    description: "Report what you've accomplished so far to the user. Use this after completing significant steps.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING, description: "Progress update for the user" },
      },
      required: ["summary"],
    },
  },
  {
    name: "task_complete",
    description: "Mark the task as complete and provide the final result.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        result: { type: Type.STRING, description: "Final result/summary for the user" },
      },
      required: ["result"],
    },
  },
  // Calendar tools
  {
    name: "list_events",
    description: "List upcoming calendar events. Defaults to next 7 days.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        time_min: { type: Type.STRING, description: "Start of range (ISO 8601). Defaults to now." },
        time_max: { type: Type.STRING, description: "End of range (ISO 8601). Defaults to 7 days from now." },
        max_results: { type: Type.NUMBER, description: "Max events to return (default 10, max 50)" },
      },
    },
  },
  {
    name: "get_event",
    description: "Get full details of a specific calendar event",
    parameters: {
      type: Type.OBJECT,
      properties: { event_id: { type: Type.STRING, description: "Calendar event ID" } },
      required: ["event_id"],
    },
  },
  {
    name: "create_event",
    description: "Create a new calendar event",
    parameters: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING, description: "Event title" },
        start_time: { type: Type.STRING, description: "Start time (ISO 8601)" },
        end_time: { type: Type.STRING, description: "End time (ISO 8601)" },
        description: { type: Type.STRING, description: "Event description" },
        attendees: { type: Type.STRING, description: "Comma-separated email addresses" },
        location: { type: Type.STRING, description: "Event location" },
      },
      required: ["summary", "start_time", "end_time"],
    },
  },
  {
    name: "update_event",
    description: "Update an existing calendar event",
    parameters: {
      type: Type.OBJECT,
      properties: {
        event_id: { type: Type.STRING, description: "Event ID to update" },
        summary: { type: Type.STRING, description: "New title" },
        start_time: { type: Type.STRING, description: "New start time" },
        end_time: { type: Type.STRING, description: "New end time" },
        description: { type: Type.STRING, description: "New description" },
        location: { type: Type.STRING, description: "New location" },
      },
      required: ["event_id"],
    },
  },
  {
    name: "delete_event",
    description: "Delete a calendar event",
    parameters: {
      type: Type.OBJECT,
      properties: { event_id: { type: Type.STRING, description: "Event ID to delete" } },
      required: ["event_id"],
    },
  },
  {
    name: "find_free_slots",
    description: "Check availability / free time on a specific date (8 AM - 6 PM)",
    parameters: {
      type: Type.OBJECT,
      properties: { date: { type: Type.STRING, description: "Date to check (YYYY-MM-DD)" } },
      required: ["date"],
    },
  },
];

const BROWSER_TOOLS = [
  {
    name: "browse_url",
    description: "Fetch and read the content of any web page. Returns the page title, extracted text, and optionally all links. Use this to research topics, read articles, check websites, or find unsubscribe links.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING, description: "The URL to browse" },
        extract_links: { type: Type.BOOLEAN, description: "Set true to also extract all links on the page" },
      },
      required: ["url"],
    },
  },
  {
    name: "click_url",
    description: "Navigate to / click a URL (e.g. an unsubscribe link, confirmation link, or any action URL). Makes a GET request and follows redirects.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING, description: "The URL to click/navigate to" },
      },
      required: ["url"],
    },
  },
  {
    name: "submit_form",
    description: "Submit a web form by POSTing data to a URL. Use for unsubscribe confirmations, signups, or any form submission.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING, description: "The form action URL" },
        data: { type: Type.STRING, description: "JSON string of key-value pairs to submit" },
        content_type: { type: Type.STRING, description: "'form' (default) or 'json'" },
      },
      required: ["url", "data"],
    },
  },
  {
    name: "web_search",
    description: "Search the web for information. Returns a list of results with titles, URLs, and snippets.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Search query" },
      },
      required: ["query"],
    },
  },
];

/* ─── Tool Executor ─── */

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
    // Calendar tools
    case "list_events":
      return await listEvents(userId, args.time_min, args.time_max, args.max_results || 10);
    case "get_event":
      return await getEvent(userId, args.event_id);
    case "create_event": {
      const attendeeList = args.attendees ? args.attendees.split(",").map((e: string) => e.trim()) : undefined;
      return await createEvent(userId, args.summary, args.start_time, args.end_time, args.description, attendeeList, args.location);
    }
    case "update_event":
      return await updateEvent(userId, args.event_id, {
        summary: args.summary, description: args.description,
        startTime: args.start_time, endTime: args.end_time, location: args.location,
      });
    case "delete_event":
      return await deleteEvent(userId, args.event_id);
    case "find_free_slots":
      return await findFreeSlots(userId, args.date);
    // Drive tools
    case "list_drive_files":
      return await listFiles(userId, args.query, args.max_results || 10);
    case "get_drive_file":
      return await getFile(userId, args.file_id);
    case "read_drive_file":
      return await readFileContent(userId, args.file_id);
    case "upload_drive_file":
      return await uploadFile(userId, args.name, args.content, args.mime_type, args.folder_id);
    case "create_drive_folder":
      return await createFolder(userId, args.name, args.parent_id);
    // Sheets tools
    case "list_spreadsheets":
      return await listSpreadsheets(userId, args.max_results || 10);
    case "read_sheet":
      return await readSheet(userId, args.spreadsheet_id, args.range);
    case "write_sheet": {
      const vals = typeof args.values === "string" ? JSON.parse(args.values) : args.values;
      return await writeSheet(userId, args.spreadsheet_id, args.range, vals);
    }
    case "append_to_sheet": {
      const appendVals = typeof args.values === "string" ? JSON.parse(args.values) : args.values;
      return await appendRows(userId, args.spreadsheet_id, args.range, appendVals);
    }
    case "create_spreadsheet": {
      const sheetNames = args.sheet_names ? args.sheet_names.split(",").map((s: string) => s.trim()) : undefined;
      return await createSpreadsheet(userId, args.title, sheetNames);
    }
    // YouTube tools
    case "list_youtube_channels":
      return await listChannels(userId);
    case "list_youtube_videos":
      return await listVideos(userId, args.channel_id, args.max_results || 10);
    case "get_youtube_analytics":
      return await getVideoAnalytics(userId, args.video_id);
    case "search_youtube":
      return await searchYouTube(userId, args.query, args.max_results || 5);
    case "report_progress":
      return { acknowledged: true };
    case "task_complete":
      return { acknowledged: true };
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

/* ─── Firestore Helpers ─── */

async function updateTask(taskId: string, updates: Partial<Task>) {
  await adminDb.doc(`tasks/${taskId}`).update({
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

async function addStep(taskId: string, step: TaskStep, steps: TaskStep[]) {
  steps.push(step);
  await updateTask(taskId, { steps });
}

async function updateStep(
  taskId: string,
  steps: TaskStep[],
  index: number,
  updates: Partial<TaskStep>
) {
  steps[index] = { ...steps[index], ...updates };
  await updateTask(taskId, { steps });
}

/* ─── API Key Helper ─── */

async function getApiKey(userId: string): Promise<string> {
  const platformKey = process.env.GOOGLE_GENAI_API_KEY?.trim() || "";
  try {
    const brainSnap = await adminDb.doc(`users/${userId}/settings/brain`).get();
    if (brainSnap.exists) {
      const brain = brainSnap.data() as { apiKey?: string };
      if (
        brain.apiKey &&
        brain.apiKey.length > 20 &&
        !brain.apiKey.includes("dummy") &&
        !brain.apiKey.includes("placeholder") &&
        !brain.apiKey.includes("your-api-key")
      ) {
        return brain.apiKey;
      }
    }
  } catch {}
  return platformKey;
}

/* ─── Connections Helper ─── */

async function getAvailableTools(userId: string) {
  try {
    const snap = await adminDb.doc(`users/${userId}/settings/connections`).get();
    const connections = snap.exists ? (snap.data() as Record<string, any>) : {};
    const tools: any[] = [];
    const services: string[] = [];

    if (connections.gmail?.connected) {
      tools.push(...TOOL_DECLARATIONS.filter(t =>
        ["search_emails", "read_email", "send_email", "reply_to_email",
         "get_unread_count", "archive_email", "trash_email"].includes(t.name)
      ));
      services.push("Gmail");
    }

    if (connections.calendar?.connected) {
      tools.push(...TOOL_DECLARATIONS.filter(t =>
        ["list_events", "get_event", "create_event", "update_event",
         "delete_event", "find_free_slots"].includes(t.name)
      ));
      services.push("Google Calendar");
    }

    // Always include meta-tools + browser tools
    tools.push(...TOOL_DECLARATIONS.filter(t =>
      ["report_progress", "task_complete"].includes(t.name)
    ));
    tools.push(...BROWSER_TOOLS);
    services.push("Web Browsing");

    return { tools, services, connections };
  } catch {
    return {
      tools: [
        ...TOOL_DECLARATIONS.filter(t =>
          ["report_progress", "task_complete"].includes(t.name)
        ),
        ...BROWSER_TOOLS,
      ],
      services: ["Web Browsing"],
      connections: {},
    };
  }
}

/* ─── Main Engine ─── */

export async function createTask(
  userId: string,
  goal: string,
  conversationId?: string,
  apiKey?: string
): Promise<string> {
  const now = new Date().toISOString();
  const taskRef = adminDb.collection("tasks").doc();
  const task: Omit<Task, "id"> & { apiKey?: string } = {
    userId,
    conversationId,
    goal,
    status: "planning",
    steps: [],
    tokensUsed: 0,
    createdAt: now,
    updatedAt: now,
  };
  // Store API key temporarily in task doc so executeTask can use it
  if (apiKey) (task as any)._apiKey = apiKey;
  await taskRef.set(task);
  return taskRef.id;
}

export async function executeTask(taskId: string, overrideApiKey?: string): Promise<string> {
  const taskSnap = await adminDb.doc(`tasks/${taskId}`).get();
  if (!taskSnap.exists) throw new Error("Task not found");

  const taskData = taskSnap.data() as any;
  const task = { id: taskId, ...taskData } as Task;
  const { userId, goal } = task;

  // Use override key, then task-stored key, then resolve from user/platform
  let apiKey = overrideApiKey || taskData._apiKey || "";
  if (!apiKey) apiKey = await getApiKey(userId);
  
  // Clean up the stored key from Firestore
  if (taskData._apiKey) {
    await adminDb.doc(`tasks/${taskId}`).update({ _apiKey: null });
  }
  if (!apiKey) {
    await updateTask(taskId, { status: "failed", result: "No API key configured." });
    return "No API key configured.";
  }

  const { tools, services } = await getAvailableTools(userId);
  const ai = new GoogleGenAI({ apiKey });

  // Build system prompt
  const systemPrompt = `You are an autonomous AI employee executing a task. You have access to tools and must complete the given goal step by step.

## Available Services: ${services.length > 0 ? services.join(", ") : "None"}

## Rules
1. Break the goal into logical steps and execute them one at a time using your tools.
2. After each significant milestone, use report_progress to update the user.
3. If a tool call fails, try a different approach (up to ${MAX_RETRIES_PER_STEP} retries per step).
4. When the goal is fully accomplished, call task_complete with a comprehensive result summary.
5. Be efficient — minimize unnecessary tool calls.
6. Never send emails without the content being explicitly specified in the goal.
7. You can browse any website, follow links, search the web, and submit forms. Use browse_url to read pages and click_url to follow action links like unsubscribe URLs.`;

  const contents: any[] = [
    { role: "user", parts: [{ text: `Execute this task:\n\n${goal}` }] },
  ];

  await updateTask(taskId, { status: "running" });

  const steps: TaskStep[] = [];
  let stepCount = 0;
  let finalResult = "";
  let consecutiveErrors = 0;

  while (stepCount < MAX_STEPS) {
    // Call Gemini
    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
          systemInstruction: systemPrompt,
          tools: [{ functionDeclarations: tools }],
        },
      });
    } catch (err: any) {
      console.error(`[TaskEngine] Gemini error at step ${stepCount}:`, err.message);
      await updateTask(taskId, {
        status: "failed",
        result: `AI error: ${err.message}`,
        steps,
      });
      return `Task failed: ${err.message}`;
    }

    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    // Check for function call
    const fnCallPart = parts.find((p: any) => p.functionCall);

    if (!fnCallPart?.functionCall) {
      // No function call — model gave a text response (might be done)
      finalResult = response.text || "Task completed.";
      break;
    }

    const { name: toolName, args } = fnCallPart.functionCall;
    stepCount++;

    // Handle task_complete
    if (toolName === "task_complete") {
      finalResult = (args as any)?.result || "Task completed.";
      await addStep(taskId, {
        action: "Task completed",
        toolName: "task_complete",
        status: "completed",
        completedAt: new Date().toISOString(),
      }, steps);
      break;
    }

    // Handle report_progress
    if (toolName === "report_progress") {
      await addStep(taskId, {
        action: (args as any)?.summary || "Progress update",
        toolName: "report_progress",
        status: "completed",
        completedAt: new Date().toISOString(),
      }, steps);

      // Feed back to Gemini
      contents.push({
        role: "model",
        parts: [{ functionCall: { name: toolName, args } }],
      });
      contents.push({
        role: "user",
        parts: [{ functionResponse: { name: toolName, response: { acknowledged: true } } } as any],
      });
      continue;
    }

    // Execute regular tool
    const step: TaskStep = {
      action: `${toolName}(${JSON.stringify(args)})`,
      toolName: toolName!,
      args: args as Record<string, any>,
      status: "running",
      startedAt: new Date().toISOString(),
    };
    await addStep(taskId, step, steps);
    const stepIdx = steps.length - 1;

    let toolResult: any;
    let retries = 0;

    while (retries <= MAX_RETRIES_PER_STEP) {
      try {
        toolResult = await executeTool(userId, toolName!, args as Record<string, any>);
        consecutiveErrors = 0;
        break;
      } catch (err: any) {
        retries++;
        console.warn(`[TaskEngine] Tool ${toolName} failed (attempt ${retries}):`, err.message);
        if (retries > MAX_RETRIES_PER_STEP) {
          toolResult = { error: err.message };
          consecutiveErrors++;
          await updateStep(taskId, steps, stepIdx, {
            status: "failed",
            error: err.message,
            completedAt: new Date().toISOString(),
          });
        }
      }
    }

    if (!toolResult?.error) {
      await updateStep(taskId, steps, stepIdx, {
        status: "completed",
        result: typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult).substring(0, 500),
        completedAt: new Date().toISOString(),
      });
    }

    // Bail if too many consecutive errors
    if (consecutiveErrors >= 3) {
      finalResult = "Task stopped: too many consecutive tool failures.";
      await updateTask(taskId, { status: "failed", result: finalResult, steps });
      return finalResult;
    }

    // Feed result back to Gemini — response MUST be an object (not array)
    const safeResult = Array.isArray(toolResult)
      ? { results: toolResult }
      : (typeof toolResult === "object" && toolResult !== null)
        ? toolResult
        : { value: toolResult };
    contents.push({
      role: "model",
      parts: [{ functionCall: { name: toolName!, args: args as Record<string, any> } } as any],
    });
    contents.push({
      role: "user",
      parts: [
        { functionResponse: { name: toolName!, response: safeResult } } as any,
      ],
    });
  }

  // Finalize
  await updateTask(taskId, {
    status: "completed",
    result: finalResult,
    steps,
  });

  return finalResult;
}
