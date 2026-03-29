/**
 * Self-Improving Agent + Capability Evolver
 * 
 * Two OpenClaw-inspired intelligence features:
 * 1. Self-Improving Agent: Detects corrections, learns preferences, adapts behavior
 * 2. Capability Evolver: Tracks workflow metrics, auto-optimizes underperforming workflows
 */

import { adminDb } from "@/lib/admin";
import { FieldValue } from "firebase-admin/firestore";

// ─── Correction Detection Patterns ───

const CORRECTION_PATTERNS = [
  /no[,.]?\s*(i\s+)?(meant|mean|want|wanted|need|said)/i,
  /that'?s\s*(not\s+)?(right|correct|what\s+i)/i,
  /wrong/i,
  /try\s+again/i,
  /not\s+what\s+i\s+(asked|wanted|meant)/i,
  /you\s+(misunderstood|got\s+it\s+wrong|missed)/i,
  /please\s+(don'?t|stop|never)\s/i,
  /i\s+(already|just)\s+told\s+you/i,
  /actually[,.]?\s/i,
  /let\s+me\s+clarify/i,
];

/**
 * Detect if a user message is correcting the agent.
 */
export function isCorrection(message: string): boolean {
  return CORRECTION_PATTERNS.some(p => p.test(message));
}

// ─── Preference Learning ───

export interface UserPreference {
  category: string;      // e.g., "formatting", "tone", "behavior"  
  rule: string;          // e.g., "Use bullet points, not paragraphs"
  source: string;        // What triggered this preference
  correctionCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Store a correction and auto-generate a preference if it recurs.
 */
export async function recordCorrection(
  userId: string,
  userMessage: string,
  previousAssistantMessage: string,
): Promise<void> {
  const ref = adminDb.collection(`users/${userId}/corrections`);
  await ref.add({
    userMessage,
    previousResponse: previousAssistantMessage.slice(0, 500),
    timestamp: new Date().toISOString(),
  });

  // Check for recurring corrections — if 3+ similar ones exist, auto-create preference
  const recent = await ref.orderBy("timestamp", "desc").limit(20).get();
  const corrections = recent.docs.map(d => d.data().userMessage as string);
  
  // Simple clustering: look for repeated keywords across corrections
  const keywords = extractKeywords(userMessage);
  let matchCount = 0;
  for (const c of corrections) {
    const ck = extractKeywords(c);
    if (keywords.some(k => ck.includes(k))) matchCount++;
  }

  if (matchCount >= 3) {
    // Auto-generate preference from the pattern
    await storePreference(userId, {
      category: "behavior",
      rule: `User has corrected this ${matchCount} times: "${userMessage.slice(0, 200)}"`,
      source: "auto-detected from repeated corrections",
      correctionCount: matchCount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set(["the", "a", "an", "is", "it", "i", "me", "my", "to", "of", "in", "and", "or", "not", "you", "that", "this", "for", "do", "don't", "no", "yes", "please", "just", "want", "need"]);
  return text.toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));
}

/**
 * Store a learned preference for a user.
 */
export async function storePreference(userId: string, pref: UserPreference): Promise<void> {
  const ref = adminDb.collection(`users/${userId}/preferences`);
  
  // Check if a similar preference already exists
  const existing = await ref
    .where("category", "==", pref.category)
    .limit(10)
    .get();

  // Don't duplicate if the rule is very similar
  const isDuplicate = existing.docs.some(d => {
    const data = d.data();
    return data.rule && pref.rule && 
      data.rule.toLowerCase().includes(pref.rule.slice(0, 50).toLowerCase());
  });

  if (!isDuplicate) {
    await ref.add(pref);
    console.log(`[SelfImprove] Stored new preference for ${userId}: ${pref.rule.slice(0, 80)}`);
  }
}

/**
 * Load all user preferences to inject into system prompt.
 */
export async function loadPreferences(userId: string): Promise<string[]> {
  try {
    const snap = await adminDb
      .collection(`users/${userId}/preferences`)
      .orderBy("updatedAt", "desc")
      .limit(20)
      .get();

    return snap.docs.map(d => {
      const data = d.data() as UserPreference;
      return `[${data.category}] ${data.rule}`;
    });
  } catch {
    return [];
  }
}

// ─── Capability Evolver: Workflow Metrics ───

export interface WorkflowMetric {
  workflowId: string;
  userId: string;
  status: "completed" | "failed" | "timeout";
  durationMs: number;
  toolCallCount: number;
  errorCount: number;
  timestamp: string;
}

/**
 * Record a workflow execution metric.
 */
export async function recordWorkflowMetric(metric: WorkflowMetric): Promise<void> {
  try {
    await adminDb.collection("workflow_metrics").add(metric);
    console.log(`[Evolver] Recorded metric: ${metric.workflowId} → ${metric.status} (${metric.durationMs}ms, ${metric.toolCallCount} tools)`);
  } catch (err: any) {
    console.warn("[Evolver] Failed to record metric:", err.message);
  }
}

/**
 * Get aggregated metrics for a specific workflow.
 */
export async function getWorkflowStats(workflowId: string, days: number = 7): Promise<{
  totalRuns: number;
  successRate: number;
  avgDuration: number;
  avgToolCalls: number;
  avgErrors: number;
  recentFailures: string[];
}> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const snap = await adminDb.collection("workflow_metrics")
    .where("workflowId", "==", workflowId)
    .where("timestamp", ">=", since)
    .orderBy("timestamp", "desc")
    .limit(100)
    .get();

  const metrics = snap.docs.map(d => d.data() as WorkflowMetric);
  if (metrics.length === 0) {
    return { totalRuns: 0, successRate: 0, avgDuration: 0, avgToolCalls: 0, avgErrors: 0, recentFailures: [] };
  }

  const completed = metrics.filter(m => m.status === "completed").length;
  const avgDur = metrics.reduce((s, m) => s + m.durationMs, 0) / metrics.length;
  const avgTools = metrics.reduce((s, m) => s + m.toolCallCount, 0) / metrics.length;
  const avgErrs = metrics.reduce((s, m) => s + m.errorCount, 0) / metrics.length;
  const failures = metrics
    .filter(m => m.status !== "completed")
    .slice(0, 5)
    .map(m => `${m.status} at ${m.timestamp} (${m.durationMs}ms)`);

  return {
    totalRuns: metrics.length,
    successRate: Math.round((completed / metrics.length) * 100),
    avgDuration: Math.round(avgDur),
    avgToolCalls: Math.round(avgTools),
    avgErrors: Math.round(avgErrs * 10) / 10,
    recentFailures: failures,
  };
}

/**
 * Check if a workflow has a stored optimization override.
 */
export async function getWorkflowOptimization(workflowId: string): Promise<string | null> {
  try {
    const doc = await adminDb.doc(`workflow_optimizations/${workflowId}`).get();
    if (doc.exists) {
      const data = doc.data();
      return data?.optimizedGoal || null;
    }
  } catch {}
  return null;
}

/**
 * Store an optimized goal for a workflow.
 */
export async function storeWorkflowOptimization(
  workflowId: string,
  optimizedGoal: string,
  reason: string,
): Promise<void> {
  await adminDb.doc(`workflow_optimizations/${workflowId}`).set({
    optimizedGoal,
    reason,
    updatedAt: new Date().toISOString(),
  });
  console.log(`[Evolver] Stored optimization for ${workflowId}: ${reason.slice(0, 80)}`);
}

/**
 * Get all workflow stats for the evolver dashboard.
 */
export async function getAllWorkflowStats(days: number = 7): Promise<Record<string, Awaited<ReturnType<typeof getWorkflowStats>>>> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const snap = await adminDb.collection("workflow_metrics")
    .where("timestamp", ">=", since)
    .orderBy("timestamp", "desc")
    .limit(500)
    .get();

  const byWorkflow = new Map<string, WorkflowMetric[]>();
  for (const doc of snap.docs) {
    const m = doc.data() as WorkflowMetric;
    if (!byWorkflow.has(m.workflowId)) byWorkflow.set(m.workflowId, []);
    byWorkflow.get(m.workflowId)!.push(m);
  }

  const result: Record<string, Awaited<ReturnType<typeof getWorkflowStats>>> = {};
  for (const [wfId, metrics] of byWorkflow) {
    const completed = metrics.filter(m => m.status === "completed").length;
    const avgDur = metrics.reduce((s, m) => s + m.durationMs, 0) / metrics.length;
    const avgTools = metrics.reduce((s, m) => s + m.toolCallCount, 0) / metrics.length;
    const avgErrs = metrics.reduce((s, m) => s + m.errorCount, 0) / metrics.length;
    result[wfId] = {
      totalRuns: metrics.length,
      successRate: Math.round((completed / metrics.length) * 100),
      avgDuration: Math.round(avgDur),
      avgToolCalls: Math.round(avgTools),
      avgErrors: Math.round(avgErrs * 10) / 10,
      recentFailures: metrics.filter(m => m.status !== "completed").slice(0, 3).map(m => m.status),
    };
  }
  return result;
}
