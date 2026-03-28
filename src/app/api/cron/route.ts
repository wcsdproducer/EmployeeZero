import { NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";
import { createTask, executeTask } from "@/lib/taskEngine";
import { WORKFLOW_DEFINITIONS } from "@/lib/workflowDefinitions";
import { getCustomWorkflow, recordWorkflowRun } from "@/lib/customWorkflows";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max

/**
 * POST /api/cron
 * 
 * Called by an external scheduler (e.g., Cloud Scheduler, Vercel Cron)
 * every minute. Checks all users' cron jobs and executes any that are due.
 * 
 * Headers:
 *   Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results: Array<{ userId: string; jobId: string; status: string; error?: string }> = [];

  try {
    // Get all users with cron settings
    const cronDocs = await adminDb.collectionGroup("settings")
      .where("jobs", "!=", null)
      .get();

    for (const doc of cronDocs.docs) {
      // Only process 'cron' settings documents
      if (doc.id !== "cron") continue;
      
      const userId = doc.ref.parent.parent?.id;
      if (!userId) continue;

      const jobs = doc.data().jobs || [];
      const updatedJobs = [...jobs];
      let anyUpdated = false;

      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        if (!job.enabled) continue;

        // Check if this job should run now
        if (!shouldRunNow(job.cronExpression, now)) continue;

        // Skip if already ran within the last minute (dedup)
        if (job.lastRun) {
          const lastRun = new Date(job.lastRun);
          const diffMs = now.getTime() - lastRun.getTime();
          if (diffMs < 55000) continue; // less than 55 seconds ago
        }

        // Mark as running
        updatedJobs[i] = { ...job, lastRun: now.toISOString(), lastStatus: "running" };
        anyUpdated = true;

        try {
          // Get the workflow goal
          let goal: string | null = null;
          
          // Check built-in workflows first
          const builtIn = WORKFLOW_DEFINITIONS[job.workflowId];
          if (builtIn) {
            goal = builtIn.goal;
          } else {
            // Check custom workflows
            const custom = await getCustomWorkflow(userId, job.workflowId);
            if (custom) {
              goal = custom.goal;
              await recordWorkflowRun(userId, job.workflowId);
            }
          }

          if (!goal) {
            updatedJobs[i] = { ...updatedJobs[i], lastStatus: "failed" };
            results.push({ userId, jobId: job.id, status: "failed", error: "Workflow not found" });
            continue;
          }

          // Create and execute the task
          const taskId = await createTask(userId, goal, job.name);
          await executeTask(taskId, userId);
          
          updatedJobs[i] = { ...updatedJobs[i], lastStatus: "success" };
          results.push({ userId, jobId: job.id, status: "success" });
        } catch (err: any) {
          updatedJobs[i] = { ...updatedJobs[i], lastStatus: "failed" };
          results.push({ userId, jobId: job.id, status: "failed", error: err.message });
          console.error(`[Cron] Failed job ${job.id} for user ${userId}:`, err.message);
        }
      }

      // Update Firestore with run results
      if (anyUpdated) {
        await doc.ref.update({ jobs: updatedJobs });
      }
    }

    return NextResponse.json({
      executed: results.length,
      results,
      timestamp: now.toISOString(),
    });
  } catch (err: any) {
    console.error("[Cron] Handler error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Simple cron expression matcher.
// Supports: minute hour day-of-month month day-of-week
// Handles: wildcards, step values, ranges, comma-separated values
function shouldRunNow(cronExpr: string, now: Date): boolean {
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const minute = now.getMinutes();
  const hour = now.getHours();
  const dayOfMonth = now.getDate();
  const month = now.getMonth() + 1;
  const dayOfWeek = now.getDay(); // 0 = Sunday

  return (
    matchesCronField(parts[0], minute, 0, 59) &&
    matchesCronField(parts[1], hour, 0, 23) &&
    matchesCronField(parts[2], dayOfMonth, 1, 31) &&
    matchesCronField(parts[3], month, 1, 12) &&
    matchesCronField(parts[4], dayOfWeek, 0, 6)
  );
}

function matchesCronField(field: string, value: number, min: number, max: number): boolean {
  // Handle comma-separated values
  if (field.includes(",")) {
    return field.split(",").some((f) => matchesCronField(f.trim(), value, min, max));
  }

  // Handle ranges (e.g., 1-5)
  if (field.includes("-") && !field.includes("/")) {
    const [start, end] = field.split("-").map(Number);
    return value >= start && value <= end;
  }

  // Handle step with range (e.g., 1-5/2)
  if (field.includes("-") && field.includes("/")) {
    const [range, step] = field.split("/");
    const [start, end] = range.split("-").map(Number);
    const stepNum = parseInt(step);
    if (value < start || value > end) return false;
    return (value - start) % stepNum === 0;
  }

  // Wildcard
  if (field === "*") return true;

  // Step values (e.g., */15)
  if (field.startsWith("*/")) {
    const step = parseInt(field.slice(2));
    return value % step === 0;
  }

  // Exact value
  return parseInt(field) === value;
}
