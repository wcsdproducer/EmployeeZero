import { functions } from "./firebase";
import { httpsCallable } from "firebase/functions";

/**
 * Interface for memory search result.
 */
export interface MemoryResult {
  id: string;
  content: string;
  tenantId: string;
  agentId: string;
  createdAt: any;
  [key: string]: any;
}

/**
 * Stores a memory with its embedding vector for similarity search.
 * Calls a Firebase Cloud Function with vector support (Firestore Native Mode).
 * 
 * @param tenantId - The tenant (user organization) who owns this memory.
 * @param agentId - The specific agent ID this memory belongs to.
 * @param content - The text content to remember.
 */
export async function storeMemory(tenantId: string, agentId: string, content: string) {
  const storeFn = httpsCallable<{ tenantId: string; agentId: string; content: string }, { id: string }>(
    functions, 
    "storeMemory"
  );
  const result = await storeFn({ tenantId, agentId, content });
  return result.data;
}

/**
 * Searches for memories using vector similarity.
 * Performs the heavy lifting in a Cloud Function to support Native Firestore Vector Search.
 * 
 * @param tenantId - The tenant (user organization) whose memories to search.
 * @param agentId - The specific agent ID to search memories for.
 * @param query - The text of the search query.
 * @param limitCount - Max results (default: 10).
 */
export async function searchMemories(tenantId: string, agentId: string, query: string, limitCount: number = 10) {
  const searchFn = httpsCallable<{ tenantId: string; agentId: string; query: string; limit?: number }, { results: MemoryResult[] }>(
    functions, 
    "searchMemories"
  );
  const result = await searchFn({ tenantId, agentId, query, limit: limitCount });
  return result.data.results;
}
