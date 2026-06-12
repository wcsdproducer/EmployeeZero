/**
 * Voice Proxy: Server-side relay for Gemini Live API via Vertex AI
 * 
 * Uses Server-Sent Events (SSE) for server→client audio streaming
 * and the Vertex AI Live SDK for the actual Gemini session.
 * 
 * Flow:
 * 1. Client POSTs to create a session → gets sessionId
 * 2. Client opens SSE connection (GET with sessionId) → receives audio/messages
 * 3. Client POSTs audio chunks (with sessionId) → relayed to Gemini
 * 4. Client POSTs close (with sessionId) → closes session
 */

import { GoogleGenAI } from "@google/genai";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minute max for voice sessions

interface ActiveSession {
  session: any;
  messageQueue: any[];
  closed: boolean;
  lastActivity: number;
  sseController: ReadableStreamDefaultController | null;
}

// In-memory session store (per-instance, ok for single-instance voice)
const activeSessions = new Map<string, ActiveSession>();

// Cleanup stale sessions every 60s
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [id, entry] of activeSessions) {
      if (now - entry.lastActivity > 600000) {
        console.log(`[VoiceProxy] Cleaning up stale session ${id}`);
        try { entry.session.close(); } catch {}
        activeSessions.delete(id);
      }
    }
  }, 60000);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, sessionId, data } = body;

    if (action === "create") {
      const { systemPrompt, tools, voice } = data || {};

      const ai = new GoogleGenAI({
        vertexai: true,
        project: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "employee-zero-production",
        location: "us-central1",
      });

      const id = crypto.randomUUID();
      const entry: ActiveSession = {
        session: null as any,
        messageQueue: [],
        closed: false,
        lastActivity: Date.now(),
        sseController: null,
      };

      // Pre-register so onMessage callback can find the entry
      activeSessions.set(id, entry);

      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: ["AUDIO" as any],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice || "Aoede" },
            },
          },
          systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
          tools: tools?.length > 0 ? [{ functionDeclarations: tools }] : undefined,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            console.log(`[VoiceProxy] Vertex AI session open: ${id}`);
          },
          onmessage: (msg: any) => {
            if (entry.closed) return;
            if (entry.sseController) {
              try {
                const encoder = new TextEncoder();
                entry.sseController.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
              } catch {
                entry.messageQueue.push(msg);
              }
            } else {
              entry.messageQueue.push(msg);
            }
          },
          onerror: (err: any) => {
            console.error(`[VoiceProxy] Vertex AI error: ${id}`, err);
          },
          onclose: (e: any) => {
            console.log(`[VoiceProxy] Vertex AI closed: ${id}`);
          },
        },
      });

      entry.session = session;
      console.log(`[VoiceProxy] Session created: ${id}`);

      return Response.json({ sessionId: id, status: "created" });
    }

    if (action === "send") {
      const entry = activeSessions.get(sessionId);
      if (!entry) return Response.json({ error: "Session not found" }, { status: 404 });
      entry.lastActivity = Date.now();

      if (data.audio) {
        await entry.session.sendRealtimeInput({
          audio: { data: data.audio, mimeType: "audio/pcm;rate=16000" },
        });
      } else if (data.text) {
        await entry.session.sendClientContent({
          turns: [{ role: "user", parts: [{ text: data.text }] }],
        });
      } else if (data.toolResponse) {
        await entry.session.sendToolResponse(data.toolResponse);
      }

      return Response.json({ status: "sent" });
    }

    if (action === "poll") {
      // Fallback polling for messages (if SSE isn't used)
      const entry = activeSessions.get(sessionId);
      if (!entry) return Response.json({ error: "Session not found" }, { status: 404 });
      entry.lastActivity = Date.now();

      const messages = [...entry.messageQueue];
      entry.messageQueue.length = 0;

      return Response.json({ messages });
    }

    if (action === "close") {
      const entry = activeSessions.get(sessionId);
      if (entry) {
        entry.closed = true;
        try { entry.session.close(); } catch {}
        if (entry.sseController) {
          try { entry.sseController.close(); } catch {}
        }
        activeSessions.delete(sessionId);
        console.log(`[VoiceProxy] Session closed: ${sessionId}`);
      }
      return Response.json({ status: "closed" });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("[VoiceProxy] Error:", error);
    return Response.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}

// SSE endpoint for receiving messages from Gemini
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return Response.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const entry = activeSessions.get(sessionId);
  if (!entry) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      entry.sseController = controller;
      entry.lastActivity = Date.now();

      // Flush any queued messages
      for (const msg of entry.messageQueue) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
      }
      entry.messageQueue.length = 0;

      // Send keepalive every 15s
      const keepalive = setInterval(() => {
        if (entry.closed) {
          clearInterval(keepalive);
          return;
        }
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          clearInterval(keepalive);
        }
      }, 15000);
    },
    cancel() {
      entry.sseController = null;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
