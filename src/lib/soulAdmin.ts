import { adminDb } from "@/lib/admin";
import type { SOULConfig } from "./soul";
import { DEFAULT_SOUL } from "./soul";

const GLOBAL_SOUL_PATH = (userId: string) => `users/${userId}/settings/soul`;
const AGENT_PATH = (userId: string, agentId: string) => `users/${userId}/agents/${agentId}`;

export async function loadUserSOUL(userId: string, agentId?: string): Promise<SOULConfig> {
  try {
    let globalSoul = DEFAULT_SOUL;
    try {
      const globalSnap = await adminDb.doc(GLOBAL_SOUL_PATH(userId)).get();
      if (globalSnap.exists) {
        globalSoul = { ...DEFAULT_SOUL, ...(globalSnap.data() as SOULConfig) };
      }
    } catch (e) {}

    if (!agentId || agentId === "primary") return globalSoul;

    const agentSnap = await adminDb.doc(AGENT_PATH(userId, agentId)).get();
    if (!agentSnap.exists) return globalSoul;

    const agentData = agentSnap.data();
    if (agentData?.soul) {
      return { ...DEFAULT_SOUL, ...agentData.soul };
    }
    
    // If agent exists but has no custom SOUL, inherit global
    return globalSoul;
  } catch {
    return DEFAULT_SOUL;
  }
}

export async function saveUserSOUL(
  userId: string,
  config: Partial<SOULConfig>,
  agentId?: string
): Promise<void> {
  if (agentId && agentId !== "primary") {
    await adminDb.doc(AGENT_PATH(userId, agentId)).set(
      { soul: config, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  } else {
    await adminDb.doc(GLOBAL_SOUL_PATH(userId)).set(
      { ...config, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  }
}

export async function loadTeamContext(userId: string, activeAgentId?: string): Promise<string> {
  try {
    const snap = await adminDb.collection(`users/${userId}/agents`).get();
    const otherAgents: any[] = [];

    snap.docs.forEach((doc) => {
      if (activeAgentId && doc.id === activeAgentId) return;
      const data = doc.data();
      const soul = data.soul;
      if (soul) {
        otherAgents.push({
          name: soul.agentName || data.name || doc.id,
          jobTitle: soul.jobTitle || "AI Agent",
          personality: soul.personality || "",
          enabledTools: soul.enabledTools || [],
        });
      }
    });

    // Load primary agent if not active agent
    if (activeAgentId && activeAgentId !== "primary") {
      try {
        const primarySnap = await adminDb.doc(GLOBAL_SOUL_PATH(userId)).get();
        const primarySoul = primarySnap.exists
          ? { ...DEFAULT_SOUL, ...(primarySnap.data() as SOULConfig) }
          : DEFAULT_SOUL;

        otherAgents.push({
          name: primarySoul.agentName,
          jobTitle: primarySoul.jobTitle || "Executive Assistant",
          personality: primarySoul.personality,
          enabledTools: primarySoul.enabledTools || [],
        });
      } catch (e) {
        console.warn("Failed to load primary agent for team context:", e);
      }
    }

    if (otherAgents.length === 0) return "";

    let context = `\n\n## Your Team Members (Other Employees)
You work alongside other specialized AI agents in this company. Be aware of them. If the user asks you to perform a task outside of your wheelhouse (e.g. if the user asks you to run a tool or perform a job that you do not have the enabled tools or skills for, but another team member does), you should politely decline and explicitly suggest they speak with the correct team member who has access to those tools/skills:
`;

    otherAgents.forEach((agent) => {
      const toolsStr = agent.enabledTools && agent.enabledTools.length > 0
        ? agent.enabledTools.join(", ")
        : "None";
      context += `- **${agent.name}** (Role: ${agent.jobTitle})\n`;
      context += `  - Enabled Tools/Skills: ${toolsStr}\n`;
      if (agent.personality) {
        context += `  - Personality/Focus: ${agent.personality}\n`;
      }
    });

    return context;
  } catch (err) {
    console.warn("Failed to load team context:", err);
    return "";
  }
}
