import { NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";
import { createTask, executeTask } from "@/lib/taskEngine";

// POST — create and run a task
export async function POST(request: Request) {
  try {
    const { userId, goal, conversationId } = await request.json();

    if (!userId || !goal) {
      return NextResponse.json({ error: "Missing userId or goal" }, { status: 400 });
    }

    const taskId = await createTask(userId, goal, conversationId);

    // Run async — return taskId immediately
    // The task executes in the background
    const executionPromise = executeTask(taskId).catch((err) => {
      console.error(`[Tasks] Execution failed for ${taskId}:`, err);
      adminDb.doc(`tasks/${taskId}`).update({
        status: "failed",
        result: err.message || "Unknown error",
        updatedAt: new Date().toISOString(),
      });
    });

    // Use waitUntil if available (Next.js edge), otherwise fire-and-forget
    if (typeof globalThis !== "undefined" && "waitUntil" in globalThis) {
      (globalThis as any).waitUntil(executionPromise);
    }

    return NextResponse.json({ taskId, status: "started" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET — list tasks for a user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    let q = adminDb.collection("tasks")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (status) {
      q = q.where("status", "==", status);
    }

    const snap = await q.get();
    const tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return NextResponse.json({ tasks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
