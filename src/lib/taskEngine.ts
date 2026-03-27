import { adminDb } from "@/lib/admin";
import { GoogleGenAI, Type } from "@google/genai";
import {
  listEmails, getEmail, sendEmail, replyToEmail,
  getUnreadCount, archiveEmail, trashEmail,
} from "@/lib/gmail";

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
      if (brain.apiKey && brain.apiKey.length > 10) return brain.apiKey;
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

    // Always include meta-tools
    tools.push(...TOOL_DECLARATIONS.filter(t =>
      ["report_progress", "task_complete"].includes(t.name)
    ));

    return { tools, services, connections };
  } catch {
    return {
      tools: TOOL_DECLARATIONS.filter(t =>
        ["report_progress", "task_complete"].includes(t.name)
      ),
      services: [],
      connections: {},
    };
  }
}

/* ─── Main Engine ─── */

export async function createTask(
  userId: string,
  goal: string,
  conversationId?: string
): Promise<string> {
  const now = new Date().toISOString();
  const taskRef = adminDb.collection("tasks").doc();
  const task: Omit<Task, "id"> = {
    userId,
    conversationId,
    goal,
    status: "planning",
    steps: [],
    tokensUsed: 0,
    createdAt: now,
    updatedAt: now,
  };
  await taskRef.set(task);
  return taskRef.id;
}

export async function executeTask(taskId: string): Promise<string> {
  const taskSnap = await adminDb.doc(`tasks/${taskId}`).get();
  if (!taskSnap.exists) throw new Error("Task not found");

  const task = { id: taskId, ...taskSnap.data() } as Task;
  const { userId, goal } = task;

  const apiKey = await getApiKey(userId);
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
6. Never send emails without the content being explicitly specified in the goal.`;

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
        parts: [{ functionResponse: { name: toolName, response: { acknowledged: true } } }],
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

    // Feed result back to Gemini
    contents.push({
      role: "model",
      parts: [{ functionCall: { name: toolName!, args: args as Record<string, any> } }],
    });
    contents.push({
      role: "user",
      parts: [{ functionResponse: { name: toolName!, response: toolResult } }],
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
