/**
 * Notes / Knowledge Base tools for the agent.
 * Uses Firestore to persist user notes, snippets, and knowledge items.
 */

import { adminDb } from "@/lib/admin";
import { FieldValue } from "firebase-admin/firestore";

const COLLECTION = "notes";

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/* ─── Create Note ─── */

export async function createNote(
  userId: string,
  title: string,
  content: string,
  tags: string[] = []
): Promise<Note> {
  const ref = adminDb.collection(`users/${userId}/${COLLECTION}`).doc();
  const now = new Date().toISOString();

  const note: Note = {
    id: ref.id,
    title,
    content,
    tags,
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(note);
  return note;
}

/* ─── List Notes ─── */

export async function listNotes(
  userId: string,
  tag?: string,
  maxResults = 20
): Promise<Note[]> {
  let query: FirebaseFirestore.Query = adminDb
    .collection(`users/${userId}/${COLLECTION}`)
    .orderBy("updatedAt", "desc")
    .limit(maxResults);

  if (tag) {
    query = query.where("tags", "array-contains", tag);
  }

  const snap = await query.get();
  return snap.docs.map((d) => d.data() as Note);
}

/* ─── Get Note ─── */

export async function getNote(userId: string, noteId: string): Promise<Note | null> {
  const snap = await adminDb.doc(`users/${userId}/${COLLECTION}/${noteId}`).get();
  if (!snap.exists) return null;
  return snap.data() as Note;
}

/* ─── Update Note ─── */

export async function updateNote(
  userId: string,
  noteId: string,
  updates: { title?: string; content?: string; tags?: string[] }
): Promise<Note | null> {
  const ref = adminDb.doc(`users/${userId}/${COLLECTION}/${noteId}`);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const updateData: Record<string, any> = { updatedAt: new Date().toISOString() };
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.content !== undefined) updateData.content = updates.content;
  if (updates.tags !== undefined) updateData.tags = updates.tags;

  await ref.update(updateData);

  const updated = await ref.get();
  return updated.data() as Note;
}

/* ─── Delete Note ─── */

export async function deleteNote(userId: string, noteId: string): Promise<{ success: boolean }> {
  await adminDb.doc(`users/${userId}/${COLLECTION}/${noteId}`).delete();
  return { success: true };
}

/* ─── Search Notes ─── */

export async function searchNotes(
  userId: string,
  query: string,
  maxResults = 10
): Promise<Note[]> {
  // Firestore doesn't support full-text search, so we fetch recent notes and filter
  const snap = await adminDb
    .collection(`users/${userId}/${COLLECTION}`)
    .orderBy("updatedAt", "desc")
    .limit(100) // Scan last 100 notes
    .get();

  const lowerQuery = query.toLowerCase();
  return snap.docs
    .map((d) => d.data() as Note)
    .filter(
      (n) =>
        n.title.toLowerCase().includes(lowerQuery) ||
        n.content.toLowerCase().includes(lowerQuery) ||
        n.tags.some((t) => t.toLowerCase().includes(lowerQuery))
    )
    .slice(0, maxResults);
}
