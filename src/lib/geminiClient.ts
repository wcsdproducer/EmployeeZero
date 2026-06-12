/**
 * Centralized Gemini AI client factory — Vertex AI (production) with API key fallback (dev).
 *
 * In production (App Hosting): Uses Vertex AI with Application Default Credentials.
 * In local dev: Falls back to API key if available.
 */

import { GoogleGenAI } from "@google/genai";
import { GoogleAuth } from "google-auth-library";

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "employee-zero-production";
const LOCATION = "us-central1";

let _cachedAuth: GoogleAuth | null = null;

function getAuth(): GoogleAuth {
  if (!_cachedAuth) {
    _cachedAuth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
  }
  return _cachedAuth;
}

/** Get a short-lived access token for Vertex AI (used by REST calls and client-side voice) */
export async function getAccessToken(): Promise<string> {
  const auth = getAuth();
  const client = await auth.getClient();
  const tokenRes = await client.getAccessToken();
  return tokenRes.token || "";
}

/**
 * Create a GoogleGenAI client configured for Vertex AI.
 * Falls back to API key mode if Vertex AI auth isn't available (local dev).
 */
export function createGeminiClient(apiKeyOverride?: string): GoogleGenAI {
  // Try Vertex AI first (production)
  try {
    return new GoogleGenAI({
      vertexai: true,
      project: PROJECT_ID,
      location: LOCATION,
    });
  } catch (err) {
    // Fallback to API key (local dev)
    const apiKey = apiKeyOverride || process.env.GOOGLE_GENAI_API_KEY;
    if (apiKey) {
      return new GoogleGenAI({ apiKey });
    }
    throw new Error("No Gemini auth available: Vertex AI credentials and API key both missing");
  }
}

/**
 * Make a Vertex AI REST call (for browser.ts, research.ts that use direct fetch).
 * Uses access token auth instead of API key.
 */
export async function vertexGenerateContent(
  model: string,
  body: Record<string, any>,
  timeoutMs = 15000
): Promise<any> {
  const token = await getAccessToken();
  const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${model}:generateContent`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`Vertex AI ${res.status}: ${errorText.substring(0, 200)}`);
  }

  return res.json();
}

/** Get the Vertex AI WebSocket URL for Gemini Live (voice) */
export function getVertexLiveWsUrl(): string {
  return `wss://${LOCATION}-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent`;
}

export { PROJECT_ID, LOCATION };
