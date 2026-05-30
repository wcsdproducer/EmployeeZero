"use client";

import { useState, useEffect, useRef } from "react";
import { authFetch } from "@/lib/authFetch";

// Types matching ElevenLabs interface for drop-in compatibility
export type GeminiLiveStatus = "disconnected" | "connecting" | "connected" | "disconnecting";

interface UseGeminiLiveOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (msg: { source: "ai" | "user"; message: string }) => void;
  onError?: (error: any) => void;
}

export function useGeminiLive(options: UseGeminiLiveOptions = {}) {
  const [status, setStatus] = useState<GeminiLiveStatus>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  
  // Audio Input variables
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // Audio Playback variables
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextPlayTimeRef = useRef<number>(0);
  
  // Accumulated model text transcription
  const modelTextAccumulatorRef = useRef<string>("");
  const currentAgentIdRef = useRef<string>("primary");

  // Options callbacks references to prevent hook re-triggering
  const callbacksRef = useRef(options);
  useEffect(() => {
    callbacksRef.current = options;
  }, [options]);

  const cleanUpAudio = () => {
    // Stop recording Nodes
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // Stop playback
    activeSourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch (e) {}
    });
    activeSourcesRef.current = [];
    nextPlayTimeRef.current = 0;

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const endSession = async () => {
    if (status === "disconnected") return;
    setStatus("disconnecting");

    cleanUpAudio();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus("disconnected");
    callbacksRef.current.onDisconnect?.();
  };

  const startSession = async (params: { agentId: string }) => {
    if (status !== "disconnected") return;
    setStatus("connecting");
    currentAgentIdRef.current = params.agentId || "primary";

    // Initialize AudioContext synchronously to capture user gesture stack
    try {
      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume().catch((err) => console.warn("Failed to resume AudioContext:", err));
      }
    } catch (err) {
      console.warn("Failed to initialize AudioContext on user gesture:", err);
    }

    try {
      // 1. Fetch Session Configurations securely from the backend
      const res = await authFetch(`/api/gemini/live-setup?agentId=${params.agentId}`);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to load agent setup: ${errText}`);
      }
      const setupConfig = await res.json();
      const { apiKey, systemPrompt, tools, voice } = setupConfig;

      // 2. Request mic permissions early
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // 3. Establish WebSocket connection to Gemini Live
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Send setup payload
        const setupMsg = {
          setup: {
            model: "models/gemini-2.0-flash",
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: voice || "Aoede",
                  },
                },
              },
            },
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
            tools: tools?.length > 0 ? [{ functionDeclarations: tools }] : undefined,
          },
        };
        ws.send(JSON.stringify(setupMsg));
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle Setup Complete before sending any user content
          if (data.setupComplete) {
            console.log("[Gemini Live] Setup complete. Active session established.");
            setStatus("connected");
            callbacksRef.current.onConnect?.();
            if (mediaStreamRef.current) {
              startRecording(mediaStreamRef.current);
            }
            return;
          }
          
          // Handle Interruption
          if (data.serverContent?.interrupted) {
            console.log("[Gemini Live] Interruption signal received. Stopping playback.");
            activeSourcesRef.current.forEach((src) => {
              try {
                src.stop();
              } catch (e) {}
            });
            activeSourcesRef.current = [];
            nextPlayTimeRef.current = 0;
            return;
          }

          // Handle Tool Calls
          const functionCalls = data.serverContent?.modelTurn?.parts?.filter(
            (p: any) => p.functionCall
          ).map((p: any) => p.functionCall);

          if (functionCalls && functionCalls.length > 0) {
            for (const call of functionCalls) {
              const { name, args, id } = call;
              console.log(`[Gemini Live] Received tool call request: ${name}`);
              
              try {
                // Execute tool via secure local client proxy route
                const toolRes = await authFetch("/api/tools/execute", {
                  method: "POST",
                  body: JSON.stringify({ name, arguments: args || {}, agentId: currentAgentIdRef.current }),
                });
                const toolOutput = await toolRes.json();
                
                // Return tool results to WebSocket
                ws.send(
                  JSON.stringify({
                    toolResponse: {
                      functionResponses: [
                        {
                          response: { output: toolOutput },
                          id,
                        },
                      ],
                    },
                  })
                );
              } catch (err: any) {
                console.error(`[Gemini Live] Tool execution failed for ${name}:`, err);
                ws.send(
                  JSON.stringify({
                    toolResponse: {
                      functionResponses: [
                        {
                          response: { error: err.message || "Failed to execute tool" },
                          id,
                        },
                      ],
                    },
                  })
                );
              }
            }
            return;
          }

          // Handle Output Speech Audio
          const parts = data.serverContent?.modelTurn?.parts || [];
          for (const part of parts) {
            if (part.inlineData && part.inlineData.mimeType?.startsWith("audio/pcm")) {
              const base64Audio = part.inlineData.data;
              const audioBuffer = base64ToArrayBuffer(base64Audio);
              const int16Array = new Int16Array(audioBuffer);
              const float32Array = int16ToFloat32(int16Array);
              playAudioChunk(float32Array);
            }
            
            // Accumulate response text transcription
            if (part.text) {
              modelTextAccumulatorRef.current += part.text;
            }
          }

          // Handle User Turn text transcription (STT)
          const userParts = data.serverContent?.userTurn?.parts || [];
          const userText = userParts.map((p: any) => p.text).filter(Boolean).join("");
          if (userText) {
            callbacksRef.current.onMessage?.({ source: "user", message: userText });
          }

          // Handle Turn Completion
          if (data.serverContent?.turnComplete) {
            const finalModelText = modelTextAccumulatorRef.current.trim();
            if (finalModelText) {
              callbacksRef.current.onMessage?.({ source: "ai", message: finalModelText });
              modelTextAccumulatorRef.current = ""; // Reset
            }
          }

        } catch (err) {
          console.error("[Gemini Live] Error parsing WebSocket message:", err);
        }
      };

      ws.onerror = (error) => {
        callbacksRef.current.onError?.(error);
        endSession();
      };

      ws.onclose = () => {
        endSession();
      };

    } catch (err: any) {
      console.error("[Gemini Live] Connection initialization failed:", err);
      callbacksRef.current.onError?.(err);
      setStatus("disconnected");
    }
  };

  const startRecording = async (stream: MediaStream) => {
    try {
      const audioCtx = audioContextRef.current;
      if (!audioCtx) {
        throw new Error("AudioContext is not initialized");
      }

      // Register the AudioWorklet processor script
      await audioCtx.audioWorklet.addModule("/pcm-processor.worklet.js");

      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      sourceNodeRef.current = audioCtx.createMediaStreamSource(stream);
      workletNodeRef.current = new AudioWorkletNode(audioCtx, "pcm-processor");

      const nativeSampleRate = audioCtx.sampleRate;

      // Receive audio floats from the processor worklet
      workletNodeRef.current.port.onmessage = (event) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const float32Array = event.data as Float32Array;
        
        // Resample native browser microphone rate to 16kHz PCM
        const resampledFloat32 = resample(float32Array, nativeSampleRate, 16000);
        const int16Array = float32ToInt16(resampledFloat32);
        const base64Audio = arrayBufferToBase64(int16Array.buffer);

        wsRef.current.send(
          JSON.stringify({
            realtimeInput: {
              mediaChunks: [
                {
                  mimeType: "audio/pcm;rate=16000",
                  data: base64Audio,
                },
              ],
            },
          })
        );
      };

      sourceNodeRef.current.connect(workletNodeRef.current);
    } catch (err) {
      console.error("[Gemini Live] Failed to initialize microphone recording:", err);
      callbacksRef.current.onError?.(err);
    }
  };

  const playAudioChunk = (float32Array: Float32Array) => {
    const audioCtx = audioContextRef.current;
    if (!audioCtx) {
      console.warn("[Gemini Live] Cannot play audio chunk: AudioContext not initialized");
      return;
    }

    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch((err) => console.warn("[Gemini Live] Failed to resume AudioContext during playback:", err));
    }

    const playoutBuffer = audioCtx.createBuffer(1, float32Array.length, 24000);
    playoutBuffer.getChannelData(0).set(float32Array);

    const source = audioCtx.createBufferSource();
    source.buffer = playoutBuffer;
    source.connect(audioCtx.destination);

    const currentTime = audioCtx.currentTime;
    let playTime = nextPlayTimeRef.current;

    if (playTime < currentTime) {
      playTime = currentTime;
    }

    source.start(playTime);
    nextPlayTimeRef.current = playTime + playoutBuffer.duration;

    // Track playing nodes for interruption support
    source.onended = () => {
      const idx = activeSourcesRef.current.indexOf(source);
      if (idx > -1) {
        activeSourcesRef.current.splice(idx, 1);
      }
    };
    activeSourcesRef.current.push(source);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanUpAudio();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    status,
    startSession,
    endSession,
  };
}

// ── Audio Resampling & Conversion Helpers ──────────────────────────

function resample(
  inputBuffer: Float32Array,
  fromSampleRate: number,
  toSampleRate: number
): Float32Array {
  if (fromSampleRate === toSampleRate) {
    return inputBuffer;
  }
  const ratio = fromSampleRate / toSampleRate;
  const newLength = Math.round(inputBuffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < inputBuffer.length; i++) {
      accum += inputBuffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function float32ToInt16(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16Array;
}

function int16ToFloat32(int16Array: Int16Array): Float32Array {
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32768;
  }
  return float32Array;
}

function arrayBufferToBase64(buffer: ArrayBufferLike): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
