/**
 * Per-workspace memory system for dev bots
 * 
 * Uses SQLite for local storage + Gemini embeddings for semantic search.
 * Each workspace gets its own isolated memory.db file.
 */

import Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface Memory {
  id: number;
  content: string;
  category: string;
  created_at: string;
  source?: string;
  score?: number;
}

export interface MemoryStore {
  store(content: string, category?: string): number;
  search(query: string): Memory[];
  list(limit?: number): Memory[];
  forget(id: number): boolean;
  count(): number;
  close(): void;
}

// ──────────────────────────────────────────────
// Vector utilities
// ──────────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, mA = 0, mB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    mA += a[i] * a[i];
    mB += b[i] * b[i];
  }
  const denom = Math.sqrt(mA) * Math.sqrt(mB);
  return denom === 0 ? 0 : dot / denom;
}

function vectorToBuffer(vector: number[]): Buffer {
  return Buffer.from(new Float32Array(vector).buffer);
}

function bufferToVector(buffer: Buffer): number[] {
  return Array.from(new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4));
}

// ──────────────────────────────────────────────
// Embedding via Gemini
// ──────────────────────────────────────────────

async function embedText(text: string): Promise<number[] | null> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: { parts: [{ text }] },
        }),
      }
    );

    if (!response.ok) {
      console.error("Embedding API error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    return data.embedding?.values ?? null;
  } catch (e: any) {
    console.error("Embedding failed:", e.message);
    return null;
  }
}

// ──────────────────────────────────────────────
// Memory Store
// ──────────────────────────────────────────────

export function createMemoryStore(workspaceRoot: string): MemoryStore {
  const dbDir = path.join(workspaceRoot, ".data");
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

  const dbPath = path.join(dbDir, "memory.db");
  const db = new Database(dbPath);

  // Enable WAL mode for performance
  db.pragma("journal_mode = WAL");

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS memory_embeddings (
      memory_id INTEGER PRIMARY KEY REFERENCES memories(id) ON DELETE CASCADE,
      embedding BLOB NOT NULL
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
      content,
      content='memories',
      content_rowid='id'
    );

    -- Triggers to keep FTS in sync
    CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
      INSERT INTO memories_fts(rowid, content) VALUES (new.id, new.content);
    END;

    CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
      INSERT INTO memories_fts(memories_fts, rowid, content) VALUES('delete', old.id, old.content);
    END;

    CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
      INSERT INTO memories_fts(memories_fts, rowid, content) VALUES('delete', old.id, old.content);
      INSERT INTO memories_fts(rowid, content) VALUES (new.id, new.content);
    END;
  `);

  return {
    store(content: string, category = "general"): number {
      const stmt = db.prepare("INSERT INTO memories (content, category) VALUES (?, ?)");
      const result = stmt.run(content, category);
      const memoryId = result.lastInsertRowid as number;

      // Async embedding — don't block
      embedText(content).then((embedding) => {
        if (embedding) {
          try {
            const embedStmt = db.prepare("INSERT INTO memory_embeddings (memory_id, embedding) VALUES (?, ?)");
            embedStmt.run(memoryId, vectorToBuffer(embedding));
          } catch { /* already exists or DB closed */ }
        }
      });

      return memoryId;
    },

    search(query: string): Memory[] {
      const seenIds = new Set<number>();
      const results: Memory[] = [];

      // 1. FTS keyword search
      try {
        const ftsStmt = db.prepare(`
          SELECT m.id, m.content, m.category, m.created_at, 'keyword' as source
          FROM memories_fts f
          JOIN memories m ON f.rowid = m.id
          WHERE memories_fts MATCH ?
          ORDER BY rank
          LIMIT 10
        `);
        const escaped = `"${query.replace(/"/g, '""')}"`;
        const ftsResults = ftsStmt.all(escaped) as Memory[];
        for (const r of ftsResults) {
          if (!seenIds.has(r.id)) {
            seenIds.add(r.id);
            results.push(r);
          }
        }
      } catch { /* FTS may fail on special chars */ }

      // 2. Fallback: LIKE search if FTS found nothing
      if (results.length === 0) {
        try {
          const likeStmt = db.prepare(`
            SELECT id, content, category, created_at, 'like' as source
            FROM memories
            WHERE content LIKE ?
            ORDER BY created_at DESC
            LIMIT 10
          `);
          const likeResults = likeStmt.all(`%${query}%`) as Memory[];
          for (const r of likeResults) {
            if (!seenIds.has(r.id)) {
              seenIds.add(r.id);
              results.push(r);
            }
          }
        } catch { /* ignore */ }
      }

      return results;
    },

    list(limit = 20): Memory[] {
      const stmt = db.prepare("SELECT id, content, category, created_at FROM memories ORDER BY created_at DESC LIMIT ?");
      return stmt.all(limit) as Memory[];
    },

    forget(id: number): boolean {
      const result = db.prepare("DELETE FROM memories WHERE id = ?").run(id);
      return result.changes > 0;
    },

    count(): number {
      const row = db.prepare("SELECT COUNT(*) as count FROM memories").get() as any;
      return row.count;
    },

    close(): void {
      db.close();
    },
  };
}
