import { adminDb } from "@/lib/admin";
import { composeSkillPrompt } from "@/lib/customSkills";

/* ─── Types ─── */

export interface CustomWorkflow {
  id: string;
  name: string;
  description: string;
  /** The natural language goal prompt that the task engine will execute */
  goal: string;
  /** Which connections this workflow needs (e.g., ["gmail", "calendar"]) */
  requiredConnections: string[];
  /** Cron expression for scheduling (null = manual only) */
  schedule: string | null;
  /** Whether scheduled execution is enabled */
  enabled: boolean;
  /** Metadata */
  createdAt: string;
  updatedAt: string;
  lastRunAt: string | null;
  runCount: number;
  /** Scopes workflow to a specific agent (e.g. "atlas", "sam") or "company" (shared) */
  agentId?: string;
  /** Ordered list of Skill IDs to compose the goal from (optional — overrides free-text goal at runtime) */
  skillIds?: string[];
}

/* ─── CRUD Operations ─── */

/**
 * Create a new custom workflow for a user.
 */
export async function createCustomWorkflow(
  userId: string,
  data: {
    name: string;
    description: string;
    goal: string;
    requiredConnections?: string[];
    schedule?: string | null;
    agentId?: string;
  }
): Promise<CustomWorkflow> {
  const ref = adminDb.collection(`users/${userId}/workflows`).doc();
  const now = new Date().toISOString();

  const workflow: CustomWorkflow = {
    id: ref.id,
    name: data.name,
    description: data.description,
    goal: data.goal,
    requiredConnections: data.requiredConnections || [],
    schedule: data.schedule || null,
    enabled: true,
    createdAt: now,
    updatedAt: now,
    lastRunAt: null,
    runCount: 0,
    agentId: data.agentId || "company",
  };

  await ref.set(workflow);
  return workflow;
}

/**
 * Compose the execution goal for a workflow.
 * If the workflow has skillIds, builds a structured prompt from each skill's tools.
 * Otherwise returns the stored free-text goal (backward compat).
 */
export async function composeWorkflowGoal(
  userId: string,
  workflow: CustomWorkflow
): Promise<string> {
  if (!workflow.skillIds || workflow.skillIds.length === 0) {
    return workflow.goal;
  }

  const sections = await Promise.all(
    workflow.skillIds.map((id) => composeSkillPrompt(userId, id))
  );

  return sections.filter(Boolean).join("\n\n") || workflow.goal;
}

/**
 * List all custom workflows for a user.
 */
export async function listCustomWorkflows(
  userId: string
): Promise<CustomWorkflow[]> {
  const snap = await adminDb
    .collection(`users/${userId}/workflows`)
    .orderBy("createdAt", "desc")
    .get();

  return snap.docs.map((doc) => doc.data() as CustomWorkflow);
}

/**
 * Get a single custom workflow.
 */
export async function getCustomWorkflow(
  userId: string,
  workflowId: string
): Promise<CustomWorkflow | null> {
  const doc = await adminDb
    .doc(`users/${userId}/workflows/${workflowId}`)
    .get();
  return doc.exists ? (doc.data() as CustomWorkflow) : null;
}

/**
 * Update a custom workflow.
 */
export async function updateCustomWorkflow(
  userId: string,
  workflowId: string,
  updates: Partial<Pick<CustomWorkflow, "name" | "description" | "goal" | "schedule" | "enabled" | "requiredConnections" | "agentId" | "skillIds">>
): Promise<boolean> {
  const ref = adminDb.doc(`users/${userId}/workflows/${workflowId}`);
  const doc = await ref.get();
  if (!doc.exists) return false;

  await ref.update({
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  return true;
}

/**
 * Delete a custom workflow.
 */
export async function deleteCustomWorkflow(
  userId: string,
  workflowId: string
): Promise<boolean> {
  const ref = adminDb.doc(`users/${userId}/workflows/${workflowId}`);
  const doc = await ref.get();
  if (!doc.exists) return false;
  await ref.delete();
  return true;
}

/**
 * Record a workflow execution.
 */
export async function recordWorkflowRun(
  userId: string,
  workflowId: string
): Promise<void> {
  const ref = adminDb.doc(`users/${userId}/workflows/${workflowId}`);
  const doc = await ref.get();
  if (!doc.exists) return;
  
  const data = doc.data() as CustomWorkflow;
  await ref.update({
    lastRunAt: new Date().toISOString(),
    runCount: (data.runCount || 0) + 1,
  });
}
