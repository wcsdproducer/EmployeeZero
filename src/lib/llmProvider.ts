/**
 * LLM Provider — OpenRouter Gateway
 *
 * Employee Zero never pays API costs. All LLM usage is billed directly
 * to the user's OpenRouter account. EZ only stores the routing config.
 *
 * Architecture:
 *   - User connects OpenRouter (one account, every AI model)
 *   - Task engine uses their key + chosen model for every task
 *   - If not connected, falls back to platform Gemini (grace period only)
 */

import { adminDb } from "@/lib/admin";
import OpenAI from "openai";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LLMConfig {
  apiKey: string;       // OpenRouter API key (stored encrypted in Firestore)
  model: string;        // OpenRouter model ID, e.g. "anthropic/claude-sonnet-4-5"
  modelLabel: string;   // Human-readable name, e.g. "Claude Sonnet 4.5"
  connectedAt: string;
}

export interface CuratedModel {
  id: string;           // OpenRouter model ID
  label: string;        // Display name
  provider: string;     // Brand name: "Anthropic", "OpenAI", "Google", etc.
  description: string;  // One-line pitch
  costTier: 1 | 2 | 3; // 1 = cheap, 2 = mid, 3 = premium
  recommended?: boolean;
}

// ─── Curated Model List ────────────────────────────────────────────────────────

export const CURATED_MODELS: CuratedModel[] = [
  // Anthropic
  {
    id: "anthropic/claude-sonnet-4-5",
    label: "Claude Sonnet 4.5",
    provider: "Anthropic",
    description: "Best for writing, analysis & complex reasoning",
    costTier: 2,
    recommended: true,
  },
  {
    id: "anthropic/claude-haiku-3-5",
    label: "Claude Haiku 3.5",
    provider: "Anthropic",
    description: "Fast & affordable — great for routine tasks",
    costTier: 1,
  },
  // OpenAI
  {
    id: "openai/gpt-4o",
    label: "GPT-4o",
    provider: "OpenAI",
    description: "Best for versatile tasks & multimodal work",
    costTier: 2,
  },
  {
    id: "openai/gpt-4o-mini",
    label: "GPT-4o Mini",
    provider: "OpenAI",
    description: "Lightweight & fast for everyday automation",
    costTier: 1,
  },
  // Google
  {
    id: "google/gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    provider: "Google",
    description: "Best for Google Workspace tasks & long context",
    costTier: 2,
  },
  {
    id: "google/gemini-2.0-flash",
    label: "Gemini 2.0 Flash",
    provider: "Google",
    description: "Ultra-fast, great for high-volume workflows",
    costTier: 1,
  },
  // Meta
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    label: "Llama 3.3 70B",
    provider: "Meta",
    description: "Free & open source — powerful for the price",
    costTier: 1,
  },
];

// ─── Firestore CRUD ────────────────────────────────────────────────────────────

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

// ─── Client Factory ────────────────────────────────────────────────────────────

/**
 * Creates an OpenRouter-backed OpenAI-compatible client.
 * The openai SDK works out of the box with OpenRouter — just swap the baseURL.
 */
export function createOpenRouterClient(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "https://employeezero.app",
      "X-Title": "Employee Zero",
    },
  });
}

// ─── Connection Test ───────────────────────────────────────────────────────────

/**
 * Sends a minimal ping to OpenRouter to verify the key + model are valid.
 * Called from the setup wizard and settings page.
 */
export async function testOpenRouterConnection(
  apiKey: string,
  model: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = createOpenRouterClient(apiKey);
    await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: "Hi" }],
      max_tokens: 5,
    });
    return { ok: true };
  } catch (err: any) {
    const msg = err?.message || "Unknown error";
    if (/401|unauthorized|invalid.*key/i.test(msg)) {
      return { ok: false, error: "That connection code doesn't look right. Try copying it again." };
    }
    if (/404|model.*not.*found/i.test(msg)) {
      return { ok: false, error: "That AI model isn't available. Try selecting a different one." };
    }
    if (/402|insufficient.*credits/i.test(msg)) {
      return { ok: false, error: "Your OpenRouter account needs credits. Add some at openrouter.ai/credits" };
    }
    return { ok: false, error: `Connection failed: ${msg}` };
  }
}

// ─── OpenRouter-to-Gemini Tool Format Converter ───────────────────────────────

/**
 * Converts Gemini-style function declarations to OpenAI/OpenRouter format.
 * The task engine declares tools in Gemini format — we translate on the fly.
 */
export function convertToolsToOpenAIFormat(geminiTools: any[]): OpenAI.Chat.ChatCompletionTool[] {
  return geminiTools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description || "",
      parameters: convertSchema(tool.parameters || {}),
    },
  }));
}

function convertSchema(schema: any): any {
  if (!schema || typeof schema !== "object") return { type: "object", properties: {} };
  const result: any = { type: "object", properties: {}, required: [] };
  if (schema.properties) {
    for (const [key, val] of Object.entries(schema.properties as Record<string, any>)) {
      result.properties[key] = convertSchemaField(val);
    }
  }
  if (schema.required) result.required = schema.required;
  return result;
}

function convertSchemaField(field: any): any {
  if (!field) return { type: "string" };
  const out: any = {};
  // Map Gemini Type enums to JSON Schema strings
  const typeMap: Record<string, string> = {
    STRING: "string", NUMBER: "number", INTEGER: "integer",
    BOOLEAN: "boolean", ARRAY: "array", OBJECT: "object",
  };
  out.type = typeMap[field.type] || (typeof field.type === "string" ? field.type.toLowerCase() : "string");
  if (field.description) out.description = field.description;
  if (field.enum) out.enum = field.enum;
  if (field.items) out.items = convertSchemaField(field.items);
  if (field.properties) {
    out.properties = {};
    for (const [k, v] of Object.entries(field.properties as Record<string, any>)) {
      out.properties[k] = convertSchemaField(v);
    }
  }
  return out;
}
