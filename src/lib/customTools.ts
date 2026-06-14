import { adminDb } from "@/lib/admin";

/* ─── Types ─── */

export interface CustomTool {
  id: string;
  name: string;
  description: string;
  /** Detailed prompt/step instructions the agent follows when executing this tool */
  instruction: string;
  /** Which connections this tool requires (e.g. ["gmail", "calendar"]) */
  requiredConnections: string[];
  category?: string;
  /** Scoped to a specific agent ID or "company" (shared across all agents) */
  agentId?: string;
  createdAt: string;
  updatedAt: string;
}

/* ─── CRUD Operations ─── */

/**
 * Create a new custom tool for a user.
 */
export async function createCustomTool(
  userId: string,
  data: {
    name: string;
    description: string;
    instruction: string;
    requiredConnections?: string[];
    category?: string;
    agentId?: string;
  }
): Promise<CustomTool> {
  const ref = adminDb.collection(`users/${userId}/tools`).doc();
  const now = new Date().toISOString();

  const tool: CustomTool = {
    id: ref.id,
    name: data.name,
    description: data.description,
    instruction: data.instruction,
    requiredConnections: data.requiredConnections || [],
    category: data.category,
    agentId: data.agentId || "company",
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(tool);
  return tool;
}

/**
 * List all custom tools for a user.
 */
export async function listCustomTools(userId: string): Promise<CustomTool[]> {
  const snap = await adminDb
    .collection(`users/${userId}/tools`)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((doc) => doc.data() as CustomTool);
}

/**
 * Get a single custom tool.
 */
export async function getCustomTool(
  userId: string,
  toolId: string
): Promise<CustomTool | null> {
  const doc = await adminDb.doc(`users/${userId}/tools/${toolId}`).get();
  return doc.exists ? (doc.data() as CustomTool) : null;
}

/**
 * Update a custom tool.
 */
export async function updateCustomTool(
  userId: string,
  toolId: string,
  updates: Partial<Pick<CustomTool, "name" | "description" | "instruction" | "requiredConnections" | "category" | "agentId">>
): Promise<boolean> {
  const ref = adminDb.doc(`users/${userId}/tools/${toolId}`);
  const doc = await ref.get();
  if (!doc.exists) return false;
  await ref.update({ ...updates, updatedAt: new Date().toISOString() });
  return true;
}

/**
 * Delete a custom tool.
 */
export async function deleteCustomTool(
  userId: string,
  toolId: string
): Promise<boolean> {
  const ref = adminDb.doc(`users/${userId}/tools/${toolId}`);
  const doc = await ref.get();
  if (!doc.exists) return false;
  await ref.delete();
  return true;
}
