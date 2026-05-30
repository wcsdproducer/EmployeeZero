"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Play, Square, Settings2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Voice {
  voice_id: string;
  name: string;
  preview_url: string;
}

export function ElevenLabsVoiceSelector({ apiKey, agentId }: { apiKey: string, agentId: string }) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [updating, setUpdating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Fetch available voices
    fetch("/api/elevenlabs/voices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.voices) {
          setVoices(data.voices);
        }
      })
      .catch((err) => console.error("Failed to load voices", err))
      .finally(() => setLoading(false));

    // Fetch current agent config to get the active voice ID
    fetch(`/api/elevenlabs/agent?apiKey=${apiKey}&agentId=${agentId}`)
      .then(res => res.json())
      .then(data => {
        if (data?.conversation_config?.tts?.voice_id) {
          setSelectedVoice(data.conversation_config.tts.voice_id);
        }
      })
      .catch(err => console.error("Failed to fetch agent config", err));

    // Also silently patch the agent to ensure the search_memories tool is attached
    fetch("/api/elevenlabs/agent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey,
        agentId,
        tools: [
          {
            type: "client",
            name: "search_memories",
            description: "Searches the user's personal memory database for relevant facts, notes, and past conversations.",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string", description: "The search query" }
              },
              required: ["query"]
            }
          }
        ]
      }),
    }).catch(err => console.error("Failed to sync tool", err));
  }, [apiKey, agentId]);

  const handlePlay = (voice: Voice) => {
    if (playingId === voice.voice_id && audioRef.current) {
      audioRef.current.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(voice.preview_url);
    audioRef.current = audio;
    setPlayingId(voice.voice_id);
    audio.play();
    audio.onended = () => setPlayingId(null);
  };

  const handleSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const voiceId = e.target.value;
    setSelectedVoice(voiceId);
    if (!voiceId) return;

    setUpdating(true);
    setShowSuccess(false);
    try {
      const res = await fetch("/api/elevenlabs/agent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, agentId, voiceId }),
      });
      if (!res.ok) throw new Error("Failed to update agent");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to update agent voice");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-neutral-400 p-4 border-t border-white/5">
        <Loader2 size={14} className="animate-spin" />
        <span className="text-xs">Loading voices...</span>
      </div>
    );
  }

  if (!voices.length) return null;

  return (
    <div className="p-4 border-t border-white/5 bg-black/20 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
        <Settings2 size={14} className="text-purple-400" />
        Agent Voice Settings
      </div>
      
      <div className="flex items-center gap-3 max-w-md">
        <div className="relative flex-1">
          <select
            value={selectedVoice || ""}
            onChange={handleSelect}
            disabled={updating}
            className="w-full appearance-none bg-[#111111] border border-white/10 rounded-lg py-2 pl-3 pr-10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 cursor-pointer disabled:opacity-50"
          >
            <option value="" disabled>Select a voice...</option>
            {voices.map((v) => (
              <option key={v.voice_id} value={v.voice_id}>
                {v.name}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
            {updating ? <Loader2 size={12} className="animate-spin" /> : (
              showSuccess ? <Check size={12} className="text-emerald-400" /> : <div className="text-[10px]">▼</div>
            )}
          </div>
        </div>
        
        {selectedVoice && (
          <button
            onClick={() => {
              const v = voices.find(x => x.voice_id === selectedVoice);
              if (v) handlePlay(v);
            }}
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Preview Voice"
          >
            {playingId === selectedVoice ? <Square size={12} className="fill-current" /> : <Play size={12} className="fill-current" />}
          </button>
        )}
      </div>
    </div>
  );
}
