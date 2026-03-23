import { functions } from "./firebase";
import { httpsCallable } from "firebase/functions";

/**
 * Interface for memory search result.
 */
export interface MemoryResult {
  id: string;
  content: string;
  userId: string;
  createdAt: any;
  [key: string]: any;
}

/**
 * Stores a memory with its embedding vector for similarity search.
 * Calls a Firebase Cloud Function with vector support (Firestore Native Mode).
 * 
 * @param userId - The user who owns this memory.
 * @param content - The text content to remember.
 * @param embedding - The pre-calculated vector embedding (e.g., from Gemini).
 */
export async function storeMemory(userId: string, content: string, embedding: number[]) {
  const storeFn = httpsCallable<{ userId: string; content: string; embedding: number[] }, { id: string }>(
    functions, 
    "storeMemory"
  );
  const result = await storeFn({ userId, content, embedding });
  return result.data;
}

/**
 * Searches for memories using vector similarity.
 * Performs the heavy lifting in a Cloud Function to support Native Firestore Vector Search.
 * 
 * @param userId - The user whose memories to search.
 * @param queryVector - The embedding of the search query.
 * @param limit - Max results (default: 10).
 */
export async function searchMemories(userId: string, queryVector: number[], limitCount: number = 10) {
  const searchFn = httpsCallable<{ userId: string; queryVector: number[]; limit?: number }, { results: MemoryResult[] }>(
    functions, 
    "searchMemories"
  );
  const result = await searchFn({ userId, queryVector, limit: limitCount });
  return result.data.results;
}
