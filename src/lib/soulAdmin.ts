import { adminDb } from "@/lib/admin";
import type { SOULConfig } from "./soul";
import { DEFAULT_SOUL } from "./soul";

const SOUL_PATH = (userId: string) => `users/${userId}/settings/soul`;

export async function loadUserSOUL(userId: string): Promise<SOULConfig> {
  try {
    const snap = await adminDb.doc(SOUL_PATH(userId)).get();
    if (!snap.exists) return DEFAULT_SOUL;
    return { ...DEFAULT_SOUL, ...(snap.data() as SOULConfig) };
  } catch {
    return DEFAULT_SOUL;
  }
}

export async function saveUserSOUL(
  userId: string,
  config: Partial<SOULConfig>
): Promise<void> {
  await adminDb.doc(SOUL_PATH(userId)).set(
    { ...config, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}
