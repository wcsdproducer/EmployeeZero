"use client";

import { useState, useEffect, useRef } from "react";
import { authFetch } from "@/lib/authFetch";

export type GeminiLiveStatus = "disconnected" | "connecting" | "connected" | "disconnecting";

/** Recursively extract {name, url} pairs from tool results (Drive files, emails, etc.) */
function extractLinks(obj: any, links: { name: string; url: string }[] = []): { name: string; url: string }[] {
  if (!obj || typeof obj !== "object") return links;
  if (Array.isArray(obj)) { obj.forEach(item => extractLinks(item, links)); return links; }
  // Look for common link/url fields paired with a name/title/subject
  const url = obj.link || obj.url || obj.webViewLink || obj.htmlLink || obj.threadLink || null;
  const name = obj.name || obj.title || obj.subject || obj.filename || null;
  if (url && typeof url === "string" && url.startsWith("http") && name) {
    links.push({ name: String(name), url });
  }
  // Recurse into nested objects
  for (const val of Object.values(obj)) {
    if (val && typeof val === "object") extractLinks(val, links);
  }
  return links;
}

/** Deep-clone an object and strip URL fields so the voice model doesn't try to speak them */
function stripUrls(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(stripUrls);
  const clone: any = {};
  for (const [k, v] of Object.entries(obj)) {
    // Skip URL fields entirely
    if (["link", "url", "webViewLink", "htmlLink", "threadLink", "webContentLink"].includes(k)) continue;
    clone[k] = (v && typeof v === "object") ? stripUrls(v) : v;
  }
  return clone;
}

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
  const transcriptionRef = useRef<string>("");
  const agentIdRef = useRef<string>("primary");
  const turnIndexRef = useRef<number>(0); // Increments each turnComplete — guards against duplicate flushes
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

    // Audio batching: accumulate chunks and send in batches to reduce HTTP overhead
    let pendingAudioChunks: Int16Array[] = [];
    let batchTimer: ReturnType<typeof setTimeout> | null = null;
    const BATCH_INTERVAL_MS = 200; // Send accumulated audio every 200ms

    const flushAudio = () => {
      if (pendingAudioChunks.length === 0) return;
      const currentWs = wsRef.current;
      if (!currentWs || currentWs.readyState !== WebSocket.OPEN) return;
      const totalLen = pendingAudioChunks.reduce((s, c) => s + c.length, 0);
      const merged = new Int16Array(totalLen);
      let offset = 0;
      for (const chunk of pendingAudioChunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      pendingAudioChunks = [];
      const b64 = buf2b64(merged.buffer as ArrayBuffer);

      chunksSentRef.current++;
      if (chunksSentRef.current <= 3) {
        console.log(`[GeminiLive] Sending batched mic chunk #${chunksSentRef.current}: ${merged.length} samples, b64 len=${b64.length}`);
      }

      currentWs.send(JSON.stringify({
        realtimeInput: { audio: { mimeType: "audio/pcm;rate=16000", data: b64 } }
      }));
    };

    processor.onaudioprocess = (e) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      const input = e.inputBuffer.getChannelData(0);
      const resampled = resample(new Float32Array(input), nativeSR, 16000);
      const i16 = f32ToI16(resampled);
      pendingAudioChunks.push(i16);

      // Schedule a flush if not already scheduled
      if (!batchTimer) {
        batchTimer = setTimeout(() => {
          batchTimer = null;
          flushAudio();
        }, BATCH_INTERVAL_MS);
      }
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

  const startSession = async (params: { agentId: string; conversationId?: string | null }) => {
    if (statusRef.current !== "disconnected") return;
    setStatusSync("connecting");
    agentIdRef.current = params.agentId || "primary";
    modelTextRef.current = "";
    transcriptionRef.current = "";

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
      // 1. Get setup config — use cached version if available and fresh (<5 min) AND conversationId is not provided
      const cache = setupCacheRef.current;
      const isCacheFresh = !params.conversationId && cache && cache.agentId === params.agentId && (Date.now() - cache.fetchedAt) < 300_000;
      let setupConfig: any;
      if (isCacheFresh) {
        setupConfig = cache.config;
        console.log(`[GeminiLive] Using pre-fetched setup config (age: ${Math.round((Date.now() - cache.fetchedAt)/1000)}s)`);
        setupCacheRef.current = null; // consume cache
      } else {
        const t0 = Date.now();
        const url = `/api/gemini/live-setup?agentId=${params.agentId}${params.conversationId ? `&conversationId=${encodeURIComponent(params.conversationId)}` : ""}`;
        const res = await authFetch(url);
        if (!res.ok) throw new Error(`live-setup failed: ${await res.text()}`);
        setupConfig = await res.json();
        console.log(`[GeminiLive] Setup fetched in ${Date.now() - t0}ms`);
      }
      const { systemPrompt, tools, voice, agentName, hasHistory } = setupConfig;
      console.log(`[GeminiLive] Config: voice=${voice}, tools=${tools?.length || 0}, agent=${agentName}, hasHistory=${!!hasHistory}`);

      // 2. Grab mic
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 } });
      mediaStreamRef.current = stream;
      console.log("[GeminiLive] Microphone stream acquired");

      // 3. Create voice session via server-side proxy (Vertex AI — no API key needed)
      const createRes = await authFetch("/api/gemini/voice-proxy", {
        method: "POST",
        body: JSON.stringify({
          action: "create",
          data: { systemPrompt, tools, voice },
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({ error: "Failed to create voice session" }));
        throw new Error(err.error || "Failed to create voice session");
      }

      const { sessionId } = await createRes.json();
      console.log(`[GeminiLive] Voice proxy session created: ${sessionId}`);

      // Store sessionId for sending
      const proxySessionId = sessionId;

      // Helper to send data to the proxy
      const proxySend = async (data: any) => {
        try {
          await authFetch("/api/gemini/voice-proxy", {
            method: "POST",
            body: JSON.stringify({ action: "send", sessionId: proxySessionId, data }),
          });
        } catch (err) {
          console.error("[GeminiLive] proxySend error:", err);
        }
      };

      // Create a fake WebSocket-like object so the rest of the code (recording, tool responses) works
      const fakeWs = {
        readyState: WebSocket.OPEN as number,
        send: (dataStr: string) => {
          const parsed = JSON.parse(dataStr);
          if (parsed.realtimeInput) {
            // Audio chunk — send as audio
            const audioData = parsed.realtimeInput?.audio?.data || parsed.realtimeInput?.mediaChunks?.[0]?.data;
            if (audioData) proxySend({ audio: audioData });
          } else if (parsed.clientContent) {
            // Text message
            const text = parsed.clientContent?.turns?.[0]?.parts?.[0]?.text;
            if (text) proxySend({ text });
          } else if (parsed.toolResponse) {
            // Tool response
            proxySend({ toolResponse: parsed.toolResponse });
          }
        },
        close: () => {
          fakeWs.readyState = WebSocket.CLOSED;
          authFetch("/api/gemini/voice-proxy", {
            method: "POST",
            body: JSON.stringify({ action: "close", sessionId: proxySessionId }),
          }).catch(() => {});
        },
        onclose: null as any,
        onerror: null as any,
        onmessage: null as any,
      };

      wsRef.current = fakeWs as any;
      console.log("[GeminiLive] Voice proxy connected, opening SSE...");

      // 4. Open SSE to receive messages from Gemini (with auto-reconnect)
      const sseUrl = `/api/gemini/voice-proxy?sessionId=${encodeURIComponent(proxySessionId)}`;

      // Process SSE messages exactly like the old ws.onmessage
      const processMessage = async (msg: any) => {
        try {
          const keys = Object.keys(msg).join(",");

          if (msg.setupComplete) {
            console.log("[GeminiLive] setupComplete ✅ — starting mic + sending greeting trigger");
            setStatusSync("connected");
            callbacksRef.current.onConnect?.();
            startRecording(mediaStreamRef.current!);
            
            if (hasHistory) {
              proxySend({ text: `(voice session reconnected or resumed — say ONE brief conversational sentence acknowledging you are ready to continue, e.g. "I'm back, let's continue.", then stop and wait. Do NOT call any tools or greet them as a new connection.)` });
            } else {
              // Immediately trigger greeting using the agent's configured name
              const nameForGreeting = agentName || "Employee Zero";
              proxySend({ text: `(voice session just connected — greet the user warmly as ${nameForGreeting}. Say ONE short greeting sentence using your name ${nameForGreeting}, then stop and wait. Do NOT call any tools, check emails, check calendar, or do anything else. Just say hello as ${nameForGreeting}.)` });
            }
            return;
          }

          if (msg.goAway) {
            console.log(`[GeminiLive] GoAway received`);
            eventSource.close();
            fakeWs.readyState = WebSocket.CLOSED;
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
          const fcalls = [
            ...(msg.toolCall?.functionCalls || []),
            ...(msg.serverContent?.modelTurn?.parts || [])
              .filter((p: any) => p.functionCall)
              .map((p: any) => p.functionCall)
          ];

          if (fcalls.length > 0) {
            const TOOL_TIMEOUT_MS = 30_000;
            const executeCall = async (call: any) => {
              const { name, args, id } = call;
              console.log(`[GeminiLive] Tool call event received. Name: "${name}", ID: "${id}"`);
              console.log(`[GeminiLive] Tool arguments passed by model:`, JSON.stringify(args, null, 2));
              try {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), TOOL_TIMEOUT_MS);
                const r = await authFetch("/api/tools/execute", {
                  method: "POST",
                  body: JSON.stringify({ name, arguments: args || {}, agentId: agentIdRef.current }),
                  signal: controller.signal,
                });
                clearTimeout(timer);
                console.log(`[GeminiLive] Tool "${name}" API response status: ${r.status} ${r.statusText}`);
                const output = await r.json();
                console.log(`[GeminiLive] Tool "${name}" API parsed JSON output:`, JSON.stringify(output, null, 2));
                if (output.__chart) {
                  callbacksRef.current.onMessage?.({ source: "ai", message: `__chart::${JSON.stringify(output.__chart)}` });
                }
                const links = extractLinks(output);
                if (links.length > 0) {
                  const linkMsg = links.map(l => `[${l.name}](${l.url})`).join("\n");
                  callbacksRef.current.onMessage?.({ source: "ai", message: linkMsg });
                }
                const cleanOutput = stripUrls(output);
                return { name, response: { output: cleanOutput }, id };
              } catch (err: any) {
                const isTimeout = err.name === "AbortError";
                console.warn(`[GeminiLive] Tool "${name}" ${isTimeout ? "timed out" : "failed"}:`, err.message);
                return { name, response: { error: isTimeout ? `'${name}' timed out — please try again` : err.message }, id };
              }
            };

            const responses = await Promise.all(fcalls.map(executeCall));
            if (fakeWs.readyState === WebSocket.OPEN) {
              proxySend({ toolResponse: { functionResponses: responses } });
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

          // Handle AI speech transcription — accumulate spoken text
          // outputTranscription is the most reliable source of what Veronica actually says
          const aiTranscript =
            msg.outputTranscription?.text ||
            msg.serverContent?.outputTranscription?.text;
          if (aiTranscript) {
            transcriptionRef.current += aiTranscript;
          }

          // Handle user speech transcription
          const userTranscript =
            msg.inputTranscription?.text ||
            msg.serverContent?.inputTranscription?.text;
          if (userTranscript) {
            // Filter out internal prompts the system injects (greeting triggers, etc.)
            const isInternalPrompt =
              userTranscript.includes("voice session just connected") ||
              userTranscript.includes("voice session reconnected") ||
              userTranscript.includes("say ONE brief") ||
              userTranscript.includes("say ONE short");
            if (!isInternalPrompt) {
              callbacksRef.current.onMessage?.({ source: "user", message: userTranscript });
            }
          }

          // Legacy userTurn fallback
          const userParts = (msg.serverContent?.userTurn?.parts || [])
            .map((p: any) => p.text).filter(Boolean).join("");
          if (userParts && !userTranscript) {
            const isInternalPrompt =
              userParts.includes("voice session just connected") ||
              userParts.includes("voice session reconnected") ||
              userParts.includes("say ONE brief") ||
              userParts.includes("say ONE short");
            if (!isInternalPrompt) {
              callbacksRef.current.onMessage?.({ source: "user", message: userParts });
            }
          }

          // Turn complete — flush accumulated AI text to chat log
          if (msg.serverContent?.turnComplete) {
            const thisTurn = ++turnIndexRef.current;
            // Prefer modelText (inline text parts), fall back to transcription (speech-to-text)
            const textToSave = modelTextRef.current.trim() || transcriptionRef.current.trim();
            modelTextRef.current = "";
            transcriptionRef.current = "";

            if (textToSave && thisTurn === turnIndexRef.current) {
              // Small debounce: some models fire turnComplete twice in quick succession
              setTimeout(() => {
                if (thisTurn === turnIndexRef.current) {
                  callbacksRef.current.onMessage?.({ source: "ai", message: textToSave });
                }
              }, 80);
            }
          }
        } catch (err) {
          console.error("[GeminiLive] message processing error:", err);
        }
      };

      let sseReconnectAttempts = 0;
      const MAX_SSE_RECONNECTS = 3;

      const connectSSE = () => {
        const es = new EventSource(sseUrl);
        
        es.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            sseReconnectAttempts = 0; // Reset on successful message
            processMessage(msg);
          } catch (err) {
            console.error("[GeminiLive] SSE parse error:", err);
          }
        };

        es.onerror = (e) => {
          console.error("[GeminiLive] SSE error:", e);
          es.close();
          
          if (statusRef.current === "connected" && sseReconnectAttempts < MAX_SSE_RECONNECTS) {
            sseReconnectAttempts++;
            console.log(`[GeminiLive] SSE reconnecting (attempt ${sseReconnectAttempts}/${MAX_SSE_RECONNECTS})...`);
            setTimeout(() => {
              if (statusRef.current === "connected") {
                const newEs = connectSSE();
                if (wsRef.current) {
                  (wsRef.current as any).__eventSource = newEs;
                }
              }
            }, 2000);
          } else {
            fakeWs.readyState = WebSocket.CLOSED;
            cleanUp();
            setStatusSync("disconnected");
            callbacksRef.current.onDisconnect?.();
          }
        };

        return es;
      };

      const eventSource = connectSSE();

      // Store eventSource ref for cleanup
      (wsRef.current as any).__eventSource = eventSource;
      (wsRef.current as any).__proxySessionId = proxySessionId;

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
      if (wsRef.current) {
        // Close SSE if proxy mode
        try { (wsRef.current as any).__eventSource?.close(); } catch {}
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
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
