import { adminDb } from "@/lib/admin";
import { listCustomTools } from "@/lib/customTools";

/* ─── Types ─── */

export interface CustomSkill {
  id: string;
  name: string;
  description: string;
  /** Ordered list of tool IDs that make up this skill (executed in sequence) */
  toolIds: string[];
  /** Merged required connections from all constituent tools */
  requiredConnections: string[];
  /** Scoped to a specific agent ID or "company" (shared) */
  agentId?: string;
  createdAt: string;
  updatedAt: string;
}

/* ─── CRUD Operations ─── */

/**
 * Create a new custom skill for a user.
 * Automatically merges requiredConnections from all constituent tools.
 */
export async function createCustomSkill(
  userId: string,
  data: {
    name: string;
    description: string;
    toolIds: string[];
    agentId?: string;
  }
): Promise<CustomSkill> {
  const ref = adminDb.collection(`users/${userId}/skills`).doc();
  const now = new Date().toISOString();

  // Merge requiredConnections from all tools
  const requiredConnections = await resolveSkillConnections(userId, data.toolIds);

  const skill: CustomSkill = {
    id: ref.id,
    name: data.name,
    description: data.description,
    toolIds: data.toolIds || [],
    requiredConnections,
    agentId: data.agentId || "company",
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(skill);
  return skill;
}

/**
 * List all custom skills for a user.
 */
export async function listCustomSkills(userId: string): Promise<CustomSkill[]> {
  const snap = await adminDb
    .collection(`users/${userId}/skills`)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((doc) => doc.data() as CustomSkill);
}

/**
 * Get a single custom skill.
 */
export async function getCustomSkill(
  userId: string,
  skillId: string
): Promise<CustomSkill | null> {
  const doc = await adminDb.doc(`users/${userId}/skills/${skillId}`).get();
  return doc.exists ? (doc.data() as CustomSkill) : null;
}

/**
 * Update a custom skill.
 * Re-merges requiredConnections if toolIds changed.
 */
export async function updateCustomSkill(
  userId: string,
  skillId: string,
  updates: Partial<Pick<CustomSkill, "name" | "description" | "toolIds" | "agentId">>
): Promise<boolean> {
  const ref = adminDb.doc(`users/${userId}/skills/${skillId}`);
  const doc = await ref.get();
  if (!doc.exists) return false;

  const updatePayload: Record<string, any> = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  // Re-merge connections if toolIds changed
  if (updates.toolIds) {
    updatePayload.requiredConnections = await resolveSkillConnections(userId, updates.toolIds);
  }

  await ref.update(updatePayload);
  return true;
}

/**
 * Delete a custom skill.
 */
export async function deleteCustomSkill(
  userId: string,
  skillId: string
): Promise<boolean> {
  const ref = adminDb.doc(`users/${userId}/skills/${skillId}`);
  const doc = await ref.get();
  if (!doc.exists) return false;
  await ref.delete();
  return true;
}

/**
 * Compose a skill's full instruction prompt from its constituent tools.
 * Used at workflow execution time.
 */
export async function composeSkillPrompt(
  userId: string,
  skillId: string
): Promise<string> {
  const skill = await getCustomSkill(userId, skillId);
  if (!skill) return "";

  if (!skill.toolIds || skill.toolIds.length === 0) {
    return `[Skill: ${skill.name}]\n${skill.description}`;
  }

  const tools = await listCustomTools(userId);
  const toolMap = new Map(tools.map((t) => [t.id, t]));

  const steps = skill.toolIds
    .map((id, i) => {
      const tool = toolMap.get(id);
      return tool ? `Step ${i + 1} — ${tool.name}:\n${tool.instruction}` : null;
    })
    .filter(Boolean)
    .join("\n\n");

  return `[Skill: ${skill.name}]\n${steps}`;
}

/* ─── Helpers ─── */

async function resolveSkillConnections(userId: string, toolIds: string[]): Promise<string[]> {
  if (!toolIds || toolIds.length === 0) return [];
  const allTools = await listCustomTools(userId);
  const toolMap = new Map(allTools.map((t) => [t.id, t]));
  const connections = new Set<string>();
  for (const id of toolIds) {
    const tool = toolMap.get(id);
    if (tool?.requiredConnections) {
      tool.requiredConnections.forEach((c) => connections.add(c));
    }
  }
  return Array.from(connections);
}
