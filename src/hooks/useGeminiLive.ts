"use client";

import { useState, useEffect, useRef } from "react";
import { authFetch } from "@/lib/authFetch";

export type GeminiLiveStatus = "disconnected" | "connecting" | "connected" | "disconnecting";

interface UseGeminiLiveOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (msg: { source: "ai" | "user"; message: string }) => void;
  onError?: (error: any) => void;
}

export function useGeminiLive(options: UseGeminiLiveOptions = {}) {
  const [status, setStatus] = useState<GeminiLiveStatus>("disconnected");
  const statusRef = useRef<GeminiLiveStatus>("disconnected");
  const setStatusSync = (s: GeminiLiveStatus) => { statusRef.current = s; setStatus(s); };
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const modelTextRef = useRef<string>("");
  const agentIdRef = useRef<string>("primary");
  const callbacksRef = useRef(options);
  const chunksSentRef = useRef<number>(0);
  const chunksReceivedRef = useRef<number>(0);
  // Pre-fetched setup config cache — loaded on page mount so mic click is instant
  const setupCacheRef = useRef<{ agentId: string; config: any; fetchedAt: number } | null>(null);

  useEffect(() => { callbacksRef.current = options; }, [options]);

  // ── Helpers ──────────────────────────────────────────────────────

  const buf2b64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let bin = "";
    // Process in chunks to avoid stack overflow on large buffers
    const CHUNK = 8192;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return window.btoa(bin);
  };

  const b642buf = (b64: string): ArrayBuffer => {
    const bin = window.atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  };

  const resample = (input: Float32Array, fromRate: number, toRate: number): Float32Array => {
    if (fromRate === toRate) return input;
    const ratio = fromRate / toRate;
    const outLen = Math.round(input.length / ratio);
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const lo = Math.floor(i * ratio);
      const hi = Math.min(lo + 1, input.length - 1);
      const frac = (i * ratio) - lo;
      out[i] = input[lo] * (1 - frac) + input[hi] * frac;
    }
    return out;
  };

  const f32ToI16 = (f32: Float32Array): Int16Array => {
    const i16 = new Int16Array(f32.length);
    for (let i = 0; i < f32.length; i++) {
      const s = Math.max(-1, Math.min(1, f32[i]));
      i16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return i16;
  };

  const i16ToF32 = (i16: Int16Array): Float32Array => {
    const f32 = new Float32Array(i16.length);
    for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 32768;
    return f32;
  };

  // ── Cleanup ───────────────────────────────────────────────────────

  const cleanUp = () => {
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.onaudioprocess = null;
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    activeSourcesRef.current.forEach(s => { try { s.stop(); } catch {} });
    activeSourcesRef.current = [];
    nextPlayTimeRef.current = 0;
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    chunksSentRef.current = 0;
    chunksReceivedRef.current = 0;
  };

  // ── Audio Playback ────────────────────────────────────────────────

  const playChunk = (f32: Float32Array) => {
    const ctx = audioCtxRef.current;
    if (!ctx) { console.warn("[GeminiLive] playChunk: no AudioContext"); return; }
    if (f32.length === 0) { console.warn("[GeminiLive] playChunk: empty chunk"); return; }

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    chunksReceivedRef.current++;
    const sampleRate = 24000; // Gemini Live always outputs 24kHz
    const buf = ctx.createBuffer(1, f32.length, sampleRate);
    buf.getChannelData(0).set(f32);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);

    const now = ctx.currentTime;
    const playAt = Math.max(nextPlayTimeRef.current, now);
    src.start(playAt);
    nextPlayTimeRef.current = playAt + buf.duration;

    if (chunksReceivedRef.current <= 3) {
      console.log(`[GeminiLive] Playing chunk #${chunksReceivedRef.current}: ${f32.length} samples @ ${sampleRate}Hz, starts at ${playAt.toFixed(3)}s`);
    }

    src.onended = () => {
      const idx = activeSourcesRef.current.indexOf(src);
      if (idx > -1) activeSourcesRef.current.splice(idx, 1);
    };
    activeSourcesRef.current.push(src);
  };

  // ── Microphone Recording ──────────────────────────────────────────

  const startRecording = (stream: MediaStream) => {
    const ctx = audioCtxRef.current;
    if (!ctx) { console.error("[GeminiLive] startRecording: no AudioContext"); return; }

    const nativeSR = ctx.sampleRate;
    console.log(`[GeminiLive] Starting mic recording. Native sample rate: ${nativeSR}Hz`);

    // Use ScriptProcessorNode for maximum browser compatibility
    // (AudioWorklet can silently fail when the audio graph has no output sink)
    const bufferSize = 4096;
    const processor = ctx.createScriptProcessor(bufferSize, 1, 1);
    scriptProcessorRef.current = processor;

    const source = ctx.createMediaStreamSource(stream);
    sourceNodeRef.current = source;

    processor.onaudioprocess = (e) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      const input = e.inputBuffer.getChannelData(0);
      const resampled = resample(new Float32Array(input), nativeSR, 16000);
      const i16 = f32ToI16(resampled);
      const b64 = buf2b64(i16.buffer as ArrayBuffer);

      chunksSentRef.current++;
      if (chunksSentRef.current <= 3) {
        console.log(`[GeminiLive] Sending mic chunk #${chunksSentRef.current}: ${i16.length} samples, b64 len=${b64.length}`);
      }

      ws.send(JSON.stringify({
        realtimeInput: { audio: { mimeType: "audio/pcm;rate=16000", data: b64 } }
      }));
    };

    // Connect: mic source → processor → silent gain → destination
    // The gain=0 keeps the audio graph alive without feeding the mic back to speakers
    const silentGain = ctx.createGain();
    silentGain.gain.value = 0;
    source.connect(processor);
    processor.connect(silentGain);
    silentGain.connect(ctx.destination);
    console.log("[GeminiLive] Mic pipeline: source → ScriptProcessor → silent gain (0) → destination (no feedback)");
  };

  // ── Session Control ───────────────────────────────────────────────

  const endSession = () => {
    if (statusRef.current === "disconnected" || statusRef.current === "disconnecting") return;
    setStatusSync("disconnecting");
    cleanUp();
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatusSync("disconnected");
    callbacksRef.current.onDisconnect?.();
  };

  /** Call this on page mount to pre-warm the setup config so mic click is instant */
  const prefetchSetup = async (agentId: string) => {
    try {
      const t0 = Date.now();
      const res = await authFetch(`/api/gemini/live-setup?agentId=${agentId}`);
      if (res.ok) {
        const config = await res.json();
        setupCacheRef.current = { agentId, config, fetchedAt: Date.now() };
        console.log(`[GeminiLive] Setup pre-fetched in ${Date.now() - t0}ms`);
      }
    } catch (err) {
      console.warn("[GeminiLive] Prefetch failed (non-critical):", err);
    }
  };

  const startSession = async (params: { agentId: string }) => {
    if (statusRef.current !== "disconnected") return;
    setStatusSync("connecting");
    agentIdRef.current = params.agentId || "primary";
    modelTextRef.current = "";

    // Create AudioContext synchronously on the user gesture stack
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtx({ sampleRate: 48000 });
      if (audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume();
      }
      console.log(`[GeminiLive] AudioContext created: state=${audioCtxRef.current.state}, sampleRate=${audioCtxRef.current.sampleRate}`);
    } catch (err) {
      console.error("[GeminiLive] Failed to create AudioContext:", err);
    }

    try {
      // 1. Get setup config — use cached version if available and fresh (<5 min)
      const cache = setupCacheRef.current;
      const isCacheFresh = cache && cache.agentId === params.agentId && (Date.now() - cache.fetchedAt) < 300_000;
      let setupConfig: any;
      if (isCacheFresh) {
        setupConfig = cache.config;
        console.log(`[GeminiLive] Using pre-fetched setup config (age: ${Math.round((Date.now() - cache.fetchedAt)/1000)}s)`);
        setupCacheRef.current = null; // consume cache
      } else {
        const t0 = Date.now();
        const res = await authFetch(`/api/gemini/live-setup?agentId=${params.agentId}`);
        if (!res.ok) throw new Error(`live-setup failed: ${await res.text()}`);
        setupConfig = await res.json();
        console.log(`[GeminiLive] Setup fetched in ${Date.now() - t0}ms`);
      }
      const { apiKey, systemPrompt, tools, voice } = setupConfig;
      console.log(`[GeminiLive] Config: voice=${voice}, tools=${tools?.length || 0}`);

      // 2. Grab mic
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 } });
      mediaStreamRef.current = stream;
      console.log("[GeminiLive] Microphone stream acquired");

      // 3. Open WebSocket
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      console.log("[GeminiLive] WebSocket opening...");

      ws.onopen = () => {
        console.log("[GeminiLive] WebSocket open — sending setup");
        ws.send(JSON.stringify({
          setup: {
            model: "models/gemini-3.1-flash-live-preview",
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice || "Aoede" } } },
            },
            // Enable bidirectional audio transcription (at top-level setup, not inside generationConfig)
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: { parts: [{ text: systemPrompt }] },
            tools: tools?.length > 0 ? [{ functionDeclarations: tools }] : undefined,
          },
        }));
      };

      ws.onmessage = async (event) => {
        try {
          const raw: string = event.data instanceof Blob
            ? await event.data.text()
            : typeof event.data === "string"
              ? event.data
              : String(event.data);
          const msg = JSON.parse(raw);
          const keys = Object.keys(msg).join(",");

          if (msg.setupComplete) {
            console.log("[GeminiLive] setupComplete ✅ — starting mic + sending greeting trigger");
            setStatusSync("connected");
            callbacksRef.current.onConnect?.();
            startRecording(mediaStreamRef.current!);
            // Immediately trigger Atlas's greeting — brief, no tool calls
            ws.send(JSON.stringify({
              clientContent: {
                turns: [{ role: "user", parts: [{ text: "(voice session just connected — say a single warm greeting sentence and then stop and wait. Do NOT call any tools, check emails, check calendar, or do anything else. Just say hello.)" }] }],
                turnComplete: true,
              },
            }));
            return;
          }

          // Handle GoAway: server wants us to close gracefully (session limit, etc.)
          if (msg.goAway) {
            console.log(`[GeminiLive] GoAway received — timeLeft: ${msg.goAway.timeLeft || 'unknown'}. Closing gracefully.`);
            // Close cleanly — this is NOT an error, just a server-initiated session end
            if (wsRef.current) {
              wsRef.current.onclose = null; // prevent duplicate cleanup
              wsRef.current.close(1000, "GoAway");
              wsRef.current = null;
            }
            cleanUp();
            setStatusSync("disconnected");
            callbacksRef.current.onDisconnect?.();
            return;
          }

          if (msg.serverContent?.interrupted) {
            console.log("[GeminiLive] Server interrupted — clearing playback queue");
            activeSourcesRef.current.forEach(s => { try { s.stop(); } catch {} });
            activeSourcesRef.current = [];
            nextPlayTimeRef.current = 0;
            return;
          }

          // Handle tool calls
          // Slow read/search tools are auto-backgrounded so they never block the voice conversation.
          // Atlas gets an instant "fetching" response and can keep talking; results arrive via clientContent.
          const AUTO_BACKGROUND_TOOLS = new Set([
            "search_emails", "read_email", "get_unread_count",
            "web_search", "browse_url", "click_url",
            "list_events", "get_event", "find_free_slots",
            "list_drive_files", "get_drive_file", "read_drive_file",
            "list_notes", "search_notes", "get_note",
            "list_contacts", "get_contact",
            "list_youtube_channels", "list_youtube_videos", "get_youtube_analytics", "search_youtube",
            "get_linkedin_posts", "get_linkedin_profile",
            "get_instagram_media", "get_instagram_profile", "get_instagram_comments",
            "get_facebook_page_posts", "get_facebook_page_insights", "get_facebook_post_comments",
            "list_google_tasks", "get_document",
            "read_sheet", "list_spreadsheets",
            "get_stripe_balance", "get_stripe_metrics", "list_stripe_charges",
            "list_analytics_properties", "run_analytics_report", "get_realtime_analytics",
            "get_form_responses", "list_business_accounts", "list_business_locations", "get_business_reviews",
          ]);

          const fcalls = (msg.serverContent?.modelTurn?.parts || [])
            .filter((p: any) => p.functionCall)
            .map((p: any) => p.functionCall);

          if (fcalls.length > 0) {
            const TOOL_TIMEOUT_MS = 12_000;

            const executeCall = async (call: any) => {
              const { name, args, id } = call;

              // ── Auto-background slow read tools ──────────────────────────────
              if (AUTO_BACKGROUND_TOOLS.has(name)) {
                console.log(`[GeminiLive] Auto-backgrounding slow tool: ${name}`);
                const friendlyName = name.replace(/_/g, " ");

                // Return instantly — explicitly tell Gemini NOT to call any more tools
                const instant = {
                  response: {
                    output: {
                      status: "fetching_in_background",
                      instruction: `IMPORTANT: Results for '${friendlyName}' are being fetched in the background. Do NOT call any other tools. Just tell the user you are fetching it and will report back in a moment. Say something like: "I'm looking that up now — give me just a second."`,
                    }
                  },
                  id
                };

                // Execute the actual tool in the background (10s timeout)
                (async () => {
                  try {
                    const r = await authFetch("/api/tools/execute", {
                      method: "POST",
                      body: JSON.stringify({ name, arguments: args || {}, agentId: agentIdRef.current }),
                      signal: AbortSignal.timeout(45_000),
                    });
                    const result = await r.json();
                    // Inject result back into voice session as a concise summary request
                    const resultText = JSON.stringify(result).substring(0, 1500);
                    const injection = `[RESULT for ${friendlyName}]: ${resultText}

Please tell the user the answer in one or two conversational sentences. Be direct and specific.`;
                    if (wsRef.current?.readyState === WebSocket.OPEN) {
                      wsRef.current.send(JSON.stringify({
                        clientContent: { turns: [{ role: "user", parts: [{ text: injection }] }], turnComplete: true },
                      }));
                    }
                  } catch (err: any) {
                    console.warn(`[GeminiLive] Background tool ${name} failed:`, err.message);
                    if (wsRef.current?.readyState === WebSocket.OPEN) {
                      wsRef.current.send(JSON.stringify({
                        clientContent: { turns: [{ role: "user", parts: [{ text: `[${friendlyName} could not be fetched: ${err.message}]. Tell the user briefly that it didn't work and they can try again.` }] }], turnComplete: true },
                      }));
                    }
                  }
                })();

                return instant;
              }

              // ── Synchronous execution for write/action tools ─────────────────
              console.log(`[GeminiLive] Tool call (sync): ${name}`);
              try {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), TOOL_TIMEOUT_MS);
                const r = await authFetch("/api/tools/execute", {
                  method: "POST",
                  body: JSON.stringify({ name, arguments: args || {}, agentId: agentIdRef.current }),
                  signal: controller.signal,
                });
                clearTimeout(timer);
                const output = await r.json();
                // If the tool returned chart data, emit it as a special message
                if (output.__chart) {
                  callbacksRef.current.onMessage?.({ source: "ai", message: `__chart::${JSON.stringify(output.__chart)}` });
                }
                return { response: { output }, id };
              } catch (err: any) {
                const isTimeout = err.name === "AbortError";
                console.warn(`[GeminiLive] Tool ${name} ${isTimeout ? "timed out" : "failed"}:`, err.message);
                return { response: { error: isTimeout ? `'${name}' is taking too long — please try again` : err.message }, id };
              }
            };

            // Execute all tool calls (auto-background returns instantly, sync waits)
            const responses = await Promise.all(fcalls.map(executeCall));
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ toolResponse: { functionResponses: responses } }));
            }
            return;
          }


          // Play audio + accumulate AI text
          const parts = msg.serverContent?.modelTurn?.parts || [];
          for (const part of parts) {
            if (part.inlineData?.mimeType?.startsWith("audio/pcm")) {
              const ab = b642buf(part.inlineData.data);
              const i16 = new Int16Array(ab);
              playChunk(i16ToF32(i16));
            }
            if (part.text) modelTextRef.current += part.text;
          }

          // Handle AI speech transcription (outputAudioTranscription)
          const aiTranscript = msg.serverContent?.outputTranscription?.text;
          if (aiTranscript) {
            modelTextRef.current += aiTranscript;
          }

          // Handle user speech transcription (inputAudioTranscription / STT)
          const userTranscript = msg.serverContent?.inputTranscription?.text;
          if (userTranscript) {
            callbacksRef.current.onMessage?.({ source: "user", message: userTranscript });
          }

          // Legacy: userTurn parts (fallback)
          const userParts = (msg.serverContent?.userTurn?.parts || [])
            .map((p: any) => p.text).filter(Boolean).join("");
          if (userParts && !userTranscript) {
            callbacksRef.current.onMessage?.({ source: "user", message: userParts });
          }

          // Turn complete
          if (msg.serverContent?.turnComplete) {
            const t = modelTextRef.current.trim();
            if (t) {
              callbacksRef.current.onMessage?.({ source: "ai", message: t });
              modelTextRef.current = "";
            }
          }

        } catch (err) {
          console.error("[GeminiLive] onmessage error:", err);
        }
      };

      ws.onerror = (e) => {
        console.error("[GeminiLive] WebSocket error:", e);
        callbacksRef.current.onError?.(e);
      };

      ws.onclose = (e) => {
        console.log(`[GeminiLive] WebSocket closed: code=${e.code} reason="${e.reason}" sent=${chunksSentRef.current} recv=${chunksReceivedRef.current}`);
        // Only surface unexpected errors — 1000=normal, 1001=going away (GoAway), 1006=network drop
        const isExpected = e.code === 1000 || e.code === 1001 || e.reason === "GoAway";
        if (!isExpected && e.code !== 0) {
          callbacksRef.current.onError?.(new Error(`Voice disconnected: ${e.reason || "code " + e.code}`));
        }
        cleanUp();
        wsRef.current = null;
        setStatusSync("disconnected");
        callbacksRef.current.onDisconnect?.();
      };

    } catch (err: any) {
      console.error("[GeminiLive] startSession failed:", err);
      callbacksRef.current.onError?.(err);
      cleanUp();
      setStatusSync("disconnected");
    }
  };

  useEffect(() => {
    return () => {
      cleanUp();
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
    };
  }, []);

  /** Inject text into the active voice session as a user turn (used to push background task results) */
  const sendClientContent = (text: string): boolean => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        clientContent: {
          turns: [{ role: "user", parts: [{ text }] }],
          turnComplete: true,
        },
      }));
      return true;
    }
    return false;
  };

  return { status, startSession, endSession, prefetchSetup, sendClientContent };
}
