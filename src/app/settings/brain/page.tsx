"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { CURATED_MODELS, CuratedModel } from "@/lib/llmProvider";
import { Check, ExternalLink, Loader2, Brain, Trash2, RefreshCw, ChevronRight } from "lucide-react";
import Link from "next/link";

const PROVIDER_ICONS: Record<string, { emoji: string; color: string }> = {
  Anthropic: { emoji: "🟠", color: "from-orange-500/20 to-amber-500/10 border-orange-500/20" },
  OpenAI:    { emoji: "🟢", color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/20" },
  Google:    { emoji: "🔵", color: "from-blue-500/20 to-sky-500/10 border-blue-500/20" },
  Meta:      { emoji: "⚡", color: "from-purple-500/20 to-violet-500/10 border-purple-500/20" },
};

interface ConnectedBrain {
  model: string;
  modelLabel: string;
  connectedAt: string;
}

export default function BrainSettingsPage() {
  const { user, loading } = useAuth();
  const [config, setConfig] = useState<ConnectedBrain | null>(null);
  const [loading2, setLoading2] = useState(true);
  const [selectedModel, setSelectedModel] = useState<CuratedModel | null>(null);
  const [connectionCode, setConnectionCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const providers = [...new Set(CURATED_MODELS.map((m) => m.provider))];

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/brain", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.config) {
          setConfig(data.config);
          const match = CURATED_MODELS.find((m) => m.id === data.config.model);
          setSelectedModel(match || null);
        }
      } finally {
        setLoading2(false);
      }
    })();
  }, [user]);

  async function handleSave() {
    if (!user || !selectedModel || !connectionCode.trim()) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/brain", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "save",
          apiKey: connectionCode.trim(),
          model: selectedModel.id,
          modelLabel: selectedModel.label,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Connection failed.");
      } else {
        setSaved(true);
        setConfig({ model: selectedModel.id, modelLabel: selectedModel.label, connectedAt: new Date().toISOString() });
        setConnectionCode("");
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect your AI? Tasks will fall back to platform default until you reconnect.")) return;
    setDisconnecting(true);
    try {
      const token = await user!.getIdToken();
      await fetch("/api/brain", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "disconnect" }),
      });
      setConfig(null);
      setSelectedModel(null);
      setConnectionCode("");
    } finally {
      setDisconnecting(false);
    }
  }

  if (loading || loading2) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-neutral-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <Link href="/settings" className="text-neutral-500 hover:text-neutral-300 text-sm flex items-center gap-1 mb-6 transition-colors">
            ← Settings
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center">
              <Brain size={22} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Your AI Brain</h1>
              <p className="text-sm text-neutral-400">
                Connect your own AI account — you only pay for what you use.
              </p>
            </div>
          </div>
        </div>

        {/* Current status */}
        {config && (
          <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-2xl p-5 mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <Check size={14} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{config.modelLabel} connected</p>
                <p className="text-xs text-neutral-500">
                  Connected {new Date(config.connectedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="text-xs text-neutral-500 hover:text-red-400 transition-colors flex items-center gap-1.5"
            >
              {disconnecting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Disconnect
            </button>
          </div>
        )}

        {/* Change or connect */}
        <div className="space-y-8">
          {/* Model picker */}
          <div>
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4">
              {config ? "Switch AI Model" : "Choose Your AI"}
            </p>
            <div className="space-y-3">
              {providers.map((provider) => {
                const providerModels = CURATED_MODELS.filter((m) => m.provider === provider);
                const pIcon = PROVIDER_ICONS[provider] || { emoji: "⚡", color: "from-white/10 to-white/5 border-white/10" };
                return (
                  <div key={provider}>
                    <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-1.5 px-1">
                      {pIcon.emoji} {provider}
                    </p>
                    <div className="space-y-1.5">
                      {providerModels.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => setSelectedModel(model)}
                          className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                            selectedModel?.id === model.id
                              ? `bg-gradient-to-r ${pIcon.color}`
                              : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10"
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold">{model.label}</p>
                              {config?.model === model.id && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
                                  ACTIVE
                                </span>
                              )}
                              {model.recommended && config?.model !== model.id && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/20">
                                  RECOMMENDED
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-400 mt-0.5">{model.description}</p>
                          </div>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                            selectedModel?.id === model.id ? "border-white bg-white" : "border-white/20"
                          }`}>
                            {selectedModel?.id === model.id && <Check size={10} className="text-black" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Connection code */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                {config ? "New Connection Code (to update)" : "Connection Code"}
              </label>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
              >
                Get code <ExternalLink size={10} />
              </a>
            </div>
            <input
              type="password"
              value={connectionCode}
              onChange={(e) => { setConnectionCode(e.target.value); setError(""); setSaved(false); }}
              placeholder={config ? "Paste new code to update..." : "Paste your connection code..."}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 transition-all font-mono text-sm"
            />
            {error && <p className="mt-2 text-sm text-red-400">⚠️ {error}</p>}
          </div>

          <div className="space-y-3">
            <button
              onClick={handleSave}
              disabled={!selectedModel || !connectionCode.trim() || saving}
              className="w-full h-14 bg-white text-black font-bold text-base rounded-2xl hover:bg-neutral-100 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
            >
              {saving ? (
                <><Loader2 size={18} className="animate-spin" /> Connecting...</>
              ) : saved ? (
                <><Check size={18} className="text-emerald-500" /> Connected!</>
              ) : (
                <>{config ? <><RefreshCw size={16} /> Update Connection</> : <>Activate My AI <ChevronRight size={18} /></>}</>
              )}
            </button>
            <p className="text-center text-xs text-neutral-600">
              Your connection code is encrypted and never shared.{" "}
              <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-neutral-300 underline">
                Manage at openrouter.ai
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
