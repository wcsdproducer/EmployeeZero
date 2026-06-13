/**
 * Semantic Embeddings — Vertex AI text-embedding-005
 * 
 * Provides vector embedding generation and semantic search
 * for memories and notes, enabling intelligent knowledge retrieval.
 */

import { GoogleGenAI } from "@google/genai";

const EMBEDDING_MODEL = "text-embedding-004";
const EMBEDDING_DIMENSION = 256; // Compact vectors for Firestore storage

/**
 * Generate a vector embedding for a text string.
 * Uses Vertex AI text-embedding-004 (fast, good quality).
 */
export async function embedText(apiKey: string, text: string): Promise<number[]> {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text.substring(0, 2000), // Limit input to avoid token overflow
      config: {
        outputDimensionality: EMBEDDING_DIMENSION,
      },
    });
    return result.embeddings?.[0]?.values || [];
  } catch (err) {
    console.warn("[Embeddings] Failed to generate embedding:", err);
    return [];
  }
}

/**
 * Compute cosine similarity between two vectors.
 * Returns a value between -1 and 1, where 1 = identical.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

export interface EmbeddedItem {
  id: string;
  content: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

export interface RankedItem {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, any>;
}

/**
 * Semantic search: find the top-K most relevant items for a query.
 * Uses cosine similarity between query embedding and stored embeddings.
 */
export async function semanticSearch(
  apiKey: string,
  query: string,
  items: EmbeddedItem[],
  topK: number = 15,
  minScore: number = 0.3
): Promise<RankedItem[]> {
  if (items.length === 0) return [];

  const queryEmbedding = await embedText(apiKey, query);
  if (queryEmbedding.length === 0) return [];

  const scored = items
    .filter(item => item.embedding && item.embedding.length > 0)
    .map(item => ({
      id: item.id,
      content: item.content,
      score: cosineSimilarity(queryEmbedding, item.embedding),
      metadata: item.metadata,
    }))
    .filter(item => item.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored;
}

/**
 * Batch embed multiple texts efficiently.
 * Processes sequentially to avoid rate limits.
 */
export async function batchEmbed(
  apiKey: string,
  texts: string[]
): Promise<number[][]> {
  const results: number[][] = [];
  for (const text of texts) {
    const embedding = await embedText(apiKey, text);
    results.push(embedding);
  }
  return results;
}
