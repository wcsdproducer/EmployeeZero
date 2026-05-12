/**
 * LLM Provider Admin — Server-only Firestore CRUD
 *
 * Import this ONLY in API routes and server-side code.
 * Never import in client components or pages with "use client".
 */

import { adminDb } from "@/lib/admin";
import type { LLMConfig } from "./llmProvider";

const CONFIG_PATH = (userId: string) =>
  `users/${userId}/settings/llmProvider`;

export async function loadUserLLMConfig(
  userId: string
): Promise<LLMConfig | null> {
  try {
    const snap = await adminDb.doc(CONFIG_PATH(userId)).get();
    if (!snap.exists) return null;
    const data = snap.data() as LLMConfig;
    if (!data?.apiKey || !data?.model) return null;
    return data;
  } catch {
    return null;
  }
}

export async function saveUserLLMConfig(
  userId: string,
  config: LLMConfig
): Promise<void> {
  await adminDb.doc(CONFIG_PATH(userId)).set(config, { merge: true });
}

export async function clearUserLLMConfig(userId: string): Promise<void> {
  await adminDb.doc(CONFIG_PATH(userId)).delete();
}
