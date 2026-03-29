import { NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";
import { verifyAuth, checkRateLimit, rateLimitResponse } from "@/lib/auth";
import { getWorkflowGoal } from "@/lib/workflowDefinitions";
import { createTask, executeTask } from "@/lib/taskEngine";

/**
 * POST /api/workflows/run
 * 
 * Executes a workflow by creating a task with the workflow's goal
 * and running it through the autonomous task engine.
 * 
 * Body: { conversationId, workflowId }
 */
export async function POST(request: Request) {
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;
  const userId = auth.userId;

  const rateCheck = checkRateLimit(userId);
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfter!);

  try {
    const { conversationId, workflowId } = await request.json();

    if (!conversationId || !workflowId) {
      return NextResponse.json(
        { error: "Missing conversationId or workflowId" },
        { status: 400 }
      );
    }

    // Get the workflow goal
    const goal = getWorkflowGoal(workflowId);
    if (!goal) {
      return NextResponse.json(
        { error: `Unknown workflow: ${workflowId}` },
        { status: 404 }
      );
    }

    // Resolve API key — same logic as chat route
    const platformKey = process.env.GOOGLE_GENAI_API_KEY?.trim() || "";
    let apiKey = platformKey;

    try {
      const settingsSnap = await adminDb.doc(`users/${userId}/settings/brain`).get();
      if (settingsSnap.exists) {
        const userData = settingsSnap.data();
        const userKey = userData?.apiKey?.trim();
        if (
          userKey &&
          userKey.length > 20 &&
          !userKey.includes("dummy") &&
          !userKey.includes("placeholder") &&
          !userKey.includes("your-") &&
          !userKey.includes("YOUR_") &&
          userKey !== platformKey
        ) {
          apiKey = userKey;
        }
      }
    } catch {
      // Use platform key
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "No API key available" },
        { status: 500 }
      );
    }

    // Create task
    const taskId = await createTask(userId, goal, conversationId, apiKey);

    // Execute in background
    executeTask(taskId, apiKey).then(async (result) => {
      // If waiting for input, the task engine already wrote to the conversation
      if (result === "__WAITING_INPUT__") return;

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
        pendingTaskId: null,
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

    // Update conversation status to running
    await adminDb.doc(`conversations/${conversationId}`).update({
      status: "running",
    });

    return NextResponse.json({
      status: "workflow_started",
      taskId,
      workflowId,
    });
  } catch (err: any) {
    console.error("[Workflow Run] Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
