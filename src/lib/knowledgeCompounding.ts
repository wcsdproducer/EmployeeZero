/**
 * Knowledge Compounding — synthesizes scattered memories into structured topic summaries.
 *
 * How it works:
 * 1. Loads all memories for a user
 * 2. Filters out recent memories (< 24 hours old) and existing summaries
 * 3. Uses Gemini to cluster memories by topic and synthesize each cluster
 * 4. Saves synthesized summaries as new "[Knowledge Summary]" memories
 * 5. Deletes the original individual memories that were compounded
 *
 * This keeps the memory store lean while preserving all knowledge.
 */

import { adminDb } from "@/lib/admin";
import { createGeminiClient } from "@/lib/geminiClient";

/* ─── Types ─── */

interface MemoryDoc {
  id: string;
  content: string;
  agentId?: string;
  source?: string;
  createdAt?: string;
}

interface TopicCluster {
  topic: string;
  summary: string;
  memoryIds: string[];
}

interface CompoundResult {
  topicsSynthesized: number;
  memoriesProcessed: number;
}

/* ─── Constants ─── */

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const KNOWLEDGE_PREFIX = "[Knowledge Summary]";
const SUMMARY_AGENT_ID = "company";
const BATCH_SIZE = 500; // Firestore batch limit

/* ─── Main Function ─── */

/**
 * Compound scattered memories into structured topic summaries.
 *
 * @param userId - The user whose memories to compound.
 * @param apiKey - Gemini API key for LLM clustering/synthesis.
 * @returns Count of topics synthesized and memories processed.
 */
export async function compoundKnowledge(
  userId: string,
  apiKey: string
): Promise<CompoundResult> {
  const memoriesRef = adminDb.collection(`users/${userId}/memories`);

  // 1. Load all memories
  const snap = await memoriesRef.get();
  if (snap.empty) {
    return { topicsSynthesized: 0, memoriesProcessed: 0 };
  }

  const now = Date.now();
  const cutoff = now - TWENTY_FOUR_HOURS_MS;

  // 2. Separate compoundable memories from recent/summary ones
  const compoundable: MemoryDoc[] = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const content = data.content as string;

    // Skip existing knowledge summaries — never re-compound them
    if (content?.startsWith(KNOWLEDGE_PREFIX)) {
      continue;
    }

    // Skip memories less than 24 hours old
    const createdAt = data.createdAt
      ? new Date(data.createdAt).getTime()
      : 0;
    if (createdAt > cutoff) {
      continue;
    }

    compoundable.push({
      id: doc.id,
      content: content || "",
      agentId: data.agentId,
      source: data.source,
      createdAt: data.createdAt,
    });
  }

  if (compoundable.length === 0) {
    return { topicsSynthesized: 0, memoriesProcessed: 0 };
  }

  // 3. Use Gemini to cluster and synthesize
  const clusters = await clusterAndSynthesize(compoundable, apiKey);

  if (clusters.length === 0) {
    return { topicsSynthesized: 0, memoriesProcessed: 0 };
  }

  // 4. Save synthesized summaries
  const saveBatch = adminDb.batch();
  for (const cluster of clusters) {
    const ref = memoriesRef.doc();
    saveBatch.set(ref, {
      agentId: SUMMARY_AGENT_ID,
      content: `${KNOWLEDGE_PREFIX} ${cluster.topic}: ${cluster.summary}`,
      source: "knowledge-compounding",
      createdAt: new Date().toISOString(),
    });
  }
  await saveBatch.commit();

  // 5. Delete the original individual memories (in batches of 500)
  const allProcessedIds = clusters.flatMap((c) => c.memoryIds);
  for (let i = 0; i < allProcessedIds.length; i += BATCH_SIZE) {
    const chunk = allProcessedIds.slice(i, i + BATCH_SIZE);
    const deleteBatch = adminDb.batch();
    for (const memId of chunk) {
      deleteBatch.delete(memoriesRef.doc(memId));
    }
    await deleteBatch.commit();
  }

  console.log(
    `[KnowledgeCompounding] User ${userId}: synthesized ${clusters.length} topics from ${allProcessedIds.length} memories`
  );

  return {
    topicsSynthesized: clusters.length,
    memoriesProcessed: allProcessedIds.length,
  };
}

/* ─── LLM Clustering & Synthesis ─── */

async function clusterAndSynthesize(
  memories: MemoryDoc[],
  apiKey: string
): Promise<TopicCluster[]> {
  const ai = createGeminiClient(apiKey);

  // Build the prompt with numbered memories for ID tracking
  const memoriesList = memories
    .map((m, i) => `[${i}] ${m.content}`)
    .join("\n");

  const prompt = `You are a knowledge organizer. Below are individual memory facts about a user. Your job is to:

1. Cluster these memories by topic (e.g., "Personal Info", "Business", "Preferences", "Contacts", "Goals", etc.)
2. For each cluster, write a 2-3 sentence structured summary that captures ALL the key facts from that cluster. Do not lose any specific details like names, dates, numbers, or preferences.
3. Return the result as a JSON array.

IMPORTANT: Every memory index must appear in exactly one cluster. Do not skip any memories.

Memories:
${memoriesList}

Return ONLY a valid JSON array with this structure (no markdown fencing, no extra text):
[
  {
    "topic": "Topic Name",
    "summary": "2-3 sentence summary capturing all facts from this cluster.",
    "memoryIndices": [0, 3, 7]
  }
]`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const text =
      response.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse JSON from response — strip markdown fencing if present
    const jsonStr = text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    const parsed = JSON.parse(jsonStr) as Array<{
      topic: string;
      summary: string;
      memoryIndices: number[];
    }>;

    // Map indices back to memory doc IDs
    return parsed
      .filter((c) => c.topic && c.summary && Array.isArray(c.memoryIndices))
      .map((c) => ({
        topic: c.topic,
        summary: c.summary,
        memoryIds: c.memoryIndices
          .filter((idx) => idx >= 0 && idx < memories.length)
          .map((idx) => memories[idx].id),
      }))
      .filter((c) => c.memoryIds.length > 0);
  } catch (err: any) {
    console.error("[KnowledgeCompounding] Gemini clustering failed:", err.message);
    return [];
  }
}
