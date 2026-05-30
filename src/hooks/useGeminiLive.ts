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

    // Connect: mic source → processor → destination (required to keep graph alive)
    source.connect(processor);
    processor.connect(ctx.destination);
    console.log("[GeminiLive] Mic pipeline: source → ScriptProcessor → destination");
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
      // 1. Get setup config from server
      const res = await authFetch(`/api/gemini/live-setup?agentId=${params.agentId}`);
      if (!res.ok) throw new Error(`live-setup failed: ${await res.text()}`);
      const { apiKey, systemPrompt, tools, voice } = await res.json();
      console.log(`[GeminiLive] Setup loaded: voice=${voice}, tools=${tools?.length || 0}`);

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
            console.log("[GeminiLive] setupComplete ✅ — starting mic");
            setStatusSync("connected");
            callbacksRef.current.onConnect?.();
            startRecording(mediaStreamRef.current!);
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
          const fcalls = (msg.serverContent?.modelTurn?.parts || [])
            .filter((p: any) => p.functionCall)
            .map((p: any) => p.functionCall);

          if (fcalls.length > 0) {
            for (const call of fcalls) {
              const { name, args, id } = call;
              console.log(`[GeminiLive] Tool call: ${name}`);
              try {
                const r = await authFetch("/api/tools/execute", {
                  method: "POST",
                  body: JSON.stringify({ name, arguments: args || {}, agentId: agentIdRef.current }),
                });
                const output = await r.json();
                ws.send(JSON.stringify({ toolResponse: { functionResponses: [{ response: { output }, id }] } }));
              } catch (err: any) {
                ws.send(JSON.stringify({ toolResponse: { functionResponses: [{ response: { error: err.message }, id }] } }));
              }
            }
            return;
          }

          // Play audio + accumulate text
          const parts = msg.serverContent?.modelTurn?.parts || [];
          for (const part of parts) {
            if (part.inlineData?.mimeType?.startsWith("audio/pcm")) {
              const ab = b642buf(part.inlineData.data);
              const i16 = new Int16Array(ab);
              playChunk(i16ToF32(i16));
            }
            if (part.text) modelTextRef.current += part.text;
          }

          // STT output
          const userText = (msg.serverContent?.userTurn?.parts || [])
            .map((p: any) => p.text).filter(Boolean).join("");
          if (userText) callbacksRef.current.onMessage?.({ source: "user", message: userText });

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

  return { status, startSession, endSession };
}
