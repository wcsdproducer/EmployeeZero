"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { SOULConfig, TONE_DESCRIPTIONS, DEFAULT_SOUL } from "@/lib/soul";
import { Loader2, Sparkles, Check } from "lucide-react";
import Link from "next/link";

const FOCUS_OPTIONS = [
  "Email Management", "Scheduling", "Research", "Sales", "Marketing",
  "Operations", "Customer Support", "Finance", "HR", "Legal", "Content Creation",
  "Data Analysis", "Social Media", "Project Management",
];

const TONE_OPTIONS: SOULConfig["tone"][] = [
  "professional", "friendly", "direct", "warm", "playful",
];

const STYLE_PRESETS = [
  "Clear, concise, and action-oriented. Always lead with what was done.",
  "Brief bullet points. Skip preamble.",
  "Conversational and detailed. Explain your reasoning.",
  "Executive summaries only. TL;DR first.",
  "Step-by-step breakdowns with clear next actions.",
];

export default function SOULSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [config, setConfig] = useState<SOULConfig>(DEFAULT_SOUL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [focusInput, setFocusInput] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/soul", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.soul) setConfig(data.soul);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    try {
      const token = await user.getIdToken();
      await fetch("/api/soul", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(config),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  function toggleFocus(area: string) {
    setConfig((prev) => ({
      ...prev,
      focusAreas: prev.focusAreas.includes(area)
        ? prev.focusAreas.filter((f) => f !== area)
        : [...prev.focusAreas, area],
    }));
  }

  function addCustomFocus() {
    const trimmed = focusInput.trim();
    if (!trimmed || config.focusAreas.includes(trimmed)) return;
    setConfig((prev) => ({ ...prev, focusAreas: [...prev.focusAreas, trimmed] }));
    setFocusInput("");
  }

  if (authLoading || loading) {
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
            <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center">
              <Sparkles size={22} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Agent SOUL</h1>
              <p className="text-sm text-neutral-400">
                Define who your agent is — its personality, tone, and focus.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-10">
          {/* Agent Name */}
          <div>
            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-3">
              Agent Name
            </label>
            <input
              type="text"
              value={config.agentName}
              onChange={(e) => setConfig((p) => ({ ...p, agentName: e.target.value }))}
              placeholder="e.g. Aria, Atlas, Echo..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30 transition-all text-sm"
            />
          </div>

          {/* Tone */}
          <div>
            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-3">
              Tone
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TONE_OPTIONS.map((tone) => (
                <button
                  key={tone}
                  onClick={() => setConfig((p) => ({ ...p, tone }))}
                  className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                    config.tone === tone
                      ? "bg-purple-500/10 border-purple-500/30"
                      : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                    config.tone === tone ? "border-purple-400 bg-purple-400" : "border-white/20"
                  }`}>
                    {config.tone === tone && <Check size={8} className="text-black" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold capitalize text-white">{tone}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{TONE_DESCRIPTIONS[tone]}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Personality */}
          <div>
            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-3">
              Personality Description
            </label>
            <textarea
              value={config.personality}
              onChange={(e) => setConfig((p) => ({ ...p, personality: e.target.value }))}
              rows={4}
              placeholder="Describe who your agent is..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30 transition-all text-sm resize-none"
            />
          </div>

          {/* Communication Style */}
          <div>
            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-3">
              Communication Style
            </label>
            <div className="space-y-2 mb-3">
              {STYLE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setConfig((p) => ({ ...p, communicationStyle: preset }))}
                  className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-all ${
                    config.communicationStyle === preset
                      ? "bg-purple-500/10 border-purple-500/30 text-white"
                      : "bg-white/[0.02] border-white/5 text-neutral-400 hover:bg-white/[0.04] hover:border-white/10"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={config.communicationStyle}
              onChange={(e) => setConfig((p) => ({ ...p, communicationStyle: e.target.value }))}
              placeholder="Or write your own style..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30 transition-all text-sm"
            />
          </div>

          {/* Focus Areas */}
          <div>
            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-3">
              Focus Areas
            </label>
            <div className="flex flex-wrap gap-2 mb-4">
              {FOCUS_OPTIONS.map((area) => (
                <button
                  key={area}
                  onClick={() => toggleFocus(area)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                    config.focusAreas.includes(area)
                      ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                      : "bg-white/[0.03] border-white/10 text-neutral-400 hover:bg-white/[0.06] hover:border-white/20"
                  }`}
                >
                  {config.focusAreas.includes(area) && <span className="mr-1">✓</span>}
                  {area}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={focusInput}
                onChange={(e) => setFocusInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomFocus()}
                placeholder="Add custom focus area..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-sm"
              />
              <button
                onClick={addCustomFocus}
                className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-neutral-400 hover:bg-white/10 transition-all"
              >
                Add
              </button>
            </div>
          </div>

          {/* Signature Phrase */}
          <div>
            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-3">
              Signature Phrase <span className="text-neutral-700 normal-case">— optional</span>
            </label>
            <input
              type="text"
              value={config.signaturePhrase || ""}
              onChange={(e) => setConfig((p) => ({ ...p, signaturePhrase: e.target.value }))}
              placeholder="e.g. Consider it done. / On it!"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30 transition-all text-sm"
            />
          </div>

          {/* Preview */}
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">System Prompt Preview</p>
            <p className="text-xs text-neutral-400 leading-relaxed whitespace-pre-wrap font-mono">
              {`You are ${config.agentName || "Employee Zero"}, an autonomous AI agent.
Tone: ${TONE_DESCRIPTIONS[config.tone] || ""}
${config.personality}
${config.focusAreas.length ? `Focus: ${config.focusAreas.join(", ")}.` : ""}
${config.communicationStyle}`}
            </p>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-14 bg-white text-black font-bold text-base rounded-2xl hover:bg-neutral-100 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
          >
            {saving ? (
              <><Loader2 size={18} className="animate-spin" /> Saving...</>
            ) : saved ? (
              <><Check size={18} className="text-emerald-500" /> Saved!</>
            ) : (
              <><Sparkles size={16} /> Save SOUL Configuration</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
