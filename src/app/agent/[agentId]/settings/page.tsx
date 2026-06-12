"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { SOULConfig, TONE_DESCRIPTIONS, DEFAULT_SOUL } from "@/lib/soul";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { 
  Loader2, Sparkles, Check, ArrowLeft, Shield, Plug, Mic, Play, Square, Settings2, ImagePlus, Wand2 
} from "lucide-react";
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

const SERVICES = [
  { id: "gmail", name: "Gmail", desc: "Access emails, search inbox, draft replies, send emails", icon: "📧" },
  { id: "calendar", name: "Google Calendar", desc: "View schedule, check free/busy times, create events", icon: "📅" },
  { id: "drive", name: "Google Drive", desc: "List files, check metadata, find documents", icon: "📁" },
  { id: "sheets", name: "Google Sheets", desc: "Read and write spreadsheets, log data", icon: "📊" },
  { id: "tasks", name: "Google Tasks", desc: "Manage tasks, complete and delete tasks", icon: "✅" },
  { id: "docs", name: "Google Docs", desc: "Create, read, and write to documents", icon: "📄" },
  { id: "slides", name: "Google Slides", desc: "Create slides, edit presentation text", icon: "📽️" },
  { id: "forms", name: "Google Forms", desc: "Access forms and response data", icon: "📋" },
  { id: "contacts", name: "Google Contacts", desc: "Search and manage contacts", icon: "👤" },
  { id: "youtube", name: "YouTube", desc: "Search videos, manage playlists", icon: "🎬" },
  { id: "stripe", name: "Stripe", desc: "Create invoices, view customers, payment links", icon: "💳" },
  { id: "business", name: "Business Profile", desc: "Monitor reviews, draft review replies", icon: "🏢" },
  { id: "analytics", name: "Google Analytics", desc: "Generate data and traffic reports", icon: "📈" },
  { id: "linkedin", name: "LinkedIn", desc: "Share updates and create posts", icon: "🔗" },
  { id: "twitter", name: "X / Twitter", desc: "Post tweets, monitor mentions", icon: "🐦" },
  { id: "instagram", name: "Instagram", desc: "Post photos, stories, and insights", icon: "📸" },
  { id: "facebook", name: "Facebook", desc: "Manage page posts and comments", icon: "👥" },
  { id: "tiktok", name: "TikTok", desc: "Manage videos and profile content", icon: "🎵" },
];

const SERVICE_TOOL_MAP: Record<string, string[]> = {
  gmail: ["search_emails", "read_email", "send_email", "reply_to_email", "get_unread_count", "archive_email", "mark_as_read", "trash_email"],
  calendar: ["list_events", "get_event", "create_event", "update_event", "delete_event", "find_free_slots"],
  drive: ["list_files", "get_file_metadata", "read_file_content", "create_file", "update_file_content", "delete_file", "search_files"],
  sheets: ["get_spreadsheet", "read_sheet_rows", "add_sheet_row", "update_sheet_row", "create_spreadsheet"],
  tasks: ["list_tasks", "create_task", "complete_task", "delete_task", "clear_completed_tasks"],
  docs: ["get_document", "create_document", "append_document_text"],
  slides: ["get_presentation", "create_presentation", "add_slide"],
  forms: ["get_form", "list_form_responses"],
  contacts: ["list_contacts", "search_contacts", "create_contact", "update_contact"],
  youtube: ["search_youtube_videos", "get_video_details"],
  stripe: ["list_stripe_customers", "create_stripe_customer", "create_stripe_payment_link", "list_stripe_invoices", "create_stripe_invoice"],
  business: ["list_business_reviews", "reply_to_business_review", "get_business_info"],
  analytics: ["get_analytics_report", "list_analytics_accounts"],
  linkedin: ["share_linkedin_post"],
  twitter: ["post_tweet"],
  instagram: ["post_instagram_photo"],
  facebook: ["post_facebook_page_post"],
  tiktok: ["post_tiktok_video"],
};

export default function AgentSettingsPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [config, setConfig] = useState<SOULConfig>({ ...DEFAULT_SOUL, jobTitle: "Executive Assistant", enabledTools: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [focusInput, setFocusInput] = useState("");
  const [activeTab, setActiveTab] = useState<"identity" | "permissions" | "voice">("identity");

  // Voice setup state
  const [connections, setConnections] = useState<Record<string, any>>({});
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Avatar generation state
  const [avatarPrompt, setAvatarPrompt] = useState("");
  const [generatedAvatars, setGeneratedAvatars] = useState<{ image: string; mimeType: string }[]>([]);
  const [generatingAvatars, setGeneratingAvatars] = useState(false);
  const [selectedAvatarIdx, setSelectedAvatarIdx] = useState<number | null>(null);
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);
  const [showAvatarGen, setShowAvatarGen] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/soul?agentId=${agentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.soul) {
          setConfig({
            ...DEFAULT_SOUL,
            jobTitle: "Executive Assistant",
            enabledTools: [],
            ...data.soul,
          });
        }

        // Load connections
        const connSnap = await getDoc(doc(db, "users", user.uid, "settings", "connections"));
        if (connSnap.exists()) {
          setConnections(connSnap.data());
        }

        // Load custom avatar
        const agentSnap = await getDoc(doc(db, "users", user.uid, "agents", agentId));
        if (agentSnap.exists() && agentSnap.data()?.customAvatar) {
          setCustomAvatarUrl(agentSnap.data().customAvatar);
        }
      } catch (err) {
        console.error("Failed to load settings data:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, agentId]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    try {
      const token = await user.getIdToken();
      await fetch(`/api/soul?agentId=${agentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(config),
      });

      // Update name on agent document in Firestore if not primary
      if (agentId !== "primary" && config.agentName) {
        await updateDoc(doc(db, "users", user.uid, "agents", agentId), {
          name: config.agentName,
        });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save SOUL config:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateAvatars() {
    if (!avatarPrompt.trim() || !user) return;
    setGeneratingAvatars(true);
    setGeneratedAvatars([]);
    setSelectedAvatarIdx(null);
    setAvatarError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/gemini/generate-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ description: avatarPrompt.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAvatarError(data.error || "Failed to generate avatar.");
        return;
      }
      setGeneratedAvatars(data.avatars || []);
    } catch (err: any) {
      console.error("Avatar generation error:", err);
      setAvatarError(err.message || "Unexpected error.");
    } finally {
      setGeneratingAvatars(false);
    }
  }

  async function handleSelectAvatar(idx: number) {
    if (!user || !generatedAvatars[idx]) return;
    setSelectedAvatarIdx(idx);
    const avatar = generatedAvatars[idx];
    const dataUrl = `data:${avatar.mimeType};base64,${avatar.image}`;
    
    // Save to Firestore via server API (Admin SDK — more reliable than client writes)
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/avatar/save", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ agentId, customAvatar: dataUrl }),
      });
      if (!res.ok) {
        let errorMsg = `Server error (${res.status})`;
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } catch { /* response wasn't JSON */ }
        throw new Error(errorMsg);
      }
      setCustomAvatarUrl(dataUrl);
    } catch (err: any) {
      console.error("Failed to save avatar:", err);
      setAvatarError(`Failed to save avatar: ${err.message}`);
    }
  }

  async function handlePreviewVoice(voiceId: string) {
    // If already playing this voice, stop it
    if (previewingVoice === voiceId) {
      previewAudioRef.current?.pause();
      previewAudioRef.current = null;
      setPreviewingVoice(null);
      return;
    }

    // Stop any currently playing preview
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
      setPreviewingVoice(null);
    }

    if (!user) return;
    setLoadingPreview(voiceId);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/gemini/voice-preview?voice=${voiceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        console.error("Voice preview failed:", err.error);
        return;
      }
      const { audio, mimeType } = await res.json();

      // Convert base64 to audio blob and play
      const audioBytes = atob(audio);
      const audioArray = new Uint8Array(audioBytes.length);
      for (let i = 0; i < audioBytes.length; i++) {
        audioArray[i] = audioBytes.charCodeAt(i);
      }

      // Gemini returns PCM — wrap in WAV or use the mimeType directly
      const blob = new Blob([audioArray], { type: mimeType || "audio/wav" });
      const url = URL.createObjectURL(blob);
      const audioEl = new Audio(url);
      previewAudioRef.current = audioEl;
      setPreviewingVoice(voiceId);

      audioEl.onended = () => {
        setPreviewingVoice(null);
        previewAudioRef.current = null;
        URL.revokeObjectURL(url);
      };
      audioEl.onerror = () => {
        setPreviewingVoice(null);
        previewAudioRef.current = null;
        URL.revokeObjectURL(url);
      };
      await audioEl.play();
    } catch (err) {
      console.error("Voice preview error:", err);
    } finally {
      setLoadingPreview(null);
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

  // Permissions / Tool filtering logic
  const isServiceEnabled = (serviceId: string) => {
    const tools = SERVICE_TOOL_MAP[serviceId] || [];
    // If enabledTools is not defined, everything is enabled (backward compatible default)
    if (!config.enabledTools || config.enabledTools.length === 0) {
      return true;
    }
    return tools.every(t => config.enabledTools?.includes(t));
  };

  const handleToggleService = (serviceId: string, isChecked: boolean) => {
    const serviceTools = SERVICE_TOOL_MAP[serviceId] || [];
    
    setConfig((prev) => {
      let currentEnabled = prev.enabledTools || [];
      if (currentEnabled.length === 0) {
        // Initialize with all tools from all connected services
        currentEnabled = Object.entries(SERVICE_TOOL_MAP)
          .filter(([id]) => connections[id]?.connected)
          .flatMap(([_, tools]) => tools);
      }

      if (isChecked) {
        const updated = Array.from(new Set([...currentEnabled, ...serviceTools]));
        return { ...prev, enabledTools: updated };
      } else {
        const updated = currentEnabled.filter(t => !serviceTools.includes(t));
        return { ...prev, enabledTools: updated };
      }
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-neutral-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] text-white font-sans selection:bg-white selection:text-black">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Back Link */}
        <Link 
          href="/chat" 
          className="inline-flex items-center gap-2 text-neutral-500 hover:text-neutral-300 text-sm mb-8 transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Chat Terminal
        </Link>

        {/* Hero Title */}
        <div className="flex items-center justify-between border-b border-white/5 pb-8 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-tr from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center shadow-inner">
              <Sparkles size={24} className="text-purple-400 animate-pulse" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
                {config.agentName || "Employee Zero"} Settings
              </h1>
              <p className="text-sm text-neutral-500 mt-1">
                Configure your agent's soul, workspace tool permissions, and voice credentials.
              </p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="h-11 px-6 bg-white text-black font-bold text-sm rounded-xl hover:bg-neutral-200 active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
          >
            {saving ? (
              <><Loader2 size={16} className="animate-spin" /> Saving...</>
            ) : saved ? (
              <><Check size={16} className="text-emerald-600" /> Saved!</>
            ) : (
              "Save Settings"
            )}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/5 mb-8">
          <button
            onClick={() => setActiveTab("identity")}
            className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all ${
              activeTab === "identity" 
                ? "border-purple-500 text-white" 
                : "border-transparent text-neutral-500 hover:text-neutral-300"
            }`}
          >
            Identity & SOUL
          </button>
          <button
            onClick={() => setActiveTab("permissions")}
            className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all ${
              activeTab === "permissions" 
                ? "border-purple-500 text-white" 
                : "border-transparent text-neutral-500 hover:text-neutral-300"
            }`}
          >
            Tool Permissions
          </button>
          <button
            onClick={() => setActiveTab("voice")}
            className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all ${
              activeTab === "voice" 
                ? "border-purple-500 text-white" 
                : "border-transparent text-neutral-500 hover:text-neutral-300"
            }`}
          >
            Voice Connection
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          <AnimatePresence mode="wait">
            {activeTab === "identity" && (
              <motion.div
                key="identity"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Agent Name & Job Title */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-2 font-mono">
                      Agent Name
                    </label>
                    <input
                      type="text"
                      value={config.agentName}
                      onChange={(e) => setConfig((p) => ({ ...p, agentName: e.target.value }))}
                      placeholder="e.g. Aria, Atlas, Echo..."
                      className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-2 font-mono">
                      Job Title / Role
                    </label>
                    <input
                      type="text"
                      value={config.jobTitle || ""}
                      onChange={(e) => setConfig((p) => ({ ...p, jobTitle: e.target.value }))}
                      placeholder="e.g. Chief of Staff, Lead Researcher..."
                      className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Agent Avatar */}
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-3 font-mono">
                    Agent Avatar
                  </label>
                  <div className="flex items-start gap-4">
                    {/* Current avatar preview — shows shimmer while generating */}
                    <div className="flex-shrink-0 relative">
                      {generatingAvatars ? (
                        <div className="w-16 h-16 rounded-2xl border border-purple-500/30 overflow-hidden">
                          <div className="w-full h-full bg-gradient-to-r from-purple-500/10 via-purple-500/20 to-purple-500/10 animate-pulse flex items-center justify-center">
                            <Loader2 size={20} className="text-purple-400 animate-spin" />
                          </div>
                        </div>
                      ) : customAvatarUrl ? (
                        <img src={customAvatarUrl} alt="Agent avatar" className="w-16 h-16 rounded-2xl object-cover border border-white/10 shadow-lg" />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-tr from-purple-500/10 to-blue-500/10 border border-white/10 rounded-2xl flex items-center justify-center">
                          <ImagePlus size={22} className="text-neutral-600" />
                        </div>
                      )}
                    </div>
                    {/* Description + generate */}
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={avatarPrompt}
                          onChange={(e) => setAvatarPrompt(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && !generatingAvatars && handleGenerateAvatars()}
                          placeholder="Describe your agent's look, e.g. a sleek android with glowing blue eyes..."
                          disabled={generatingAvatars}
                          className="flex-1 bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all text-sm disabled:opacity-50"
                        />
                        <button
                          onClick={handleGenerateAvatars}
                          disabled={generatingAvatars || !avatarPrompt.trim()}
                          className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-xs rounded-xl hover:from-purple-500 hover:to-blue-500 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 whitespace-nowrap"
                        >
                          {generatingAvatars ? (
                            <><Loader2 size={13} className="animate-spin" /> Generating...</>
                          ) : (
                            <><Wand2 size={13} /> Generate</>
                          )}
                        </button>
                      </div>
                      <p className="text-[10px] text-neutral-600 pl-1">
                        {generatingAvatars ? "Creating your avatar..." : customAvatarUrl ? "Generate again to replace your current avatar." : "Describe what you'd like and click Generate."}
                      </p>
                      {avatarError && (
                        <p className="text-[10px] text-red-400 pl-1 mt-1">⚠️ {avatarError}</p>
                      )}
                    </div>
                  </div>

                  {/* Generated avatar result */}
                  {generatedAvatars.length > 0 && !generatingAvatars && (
                    <div className="mt-4 flex items-start gap-4">
                      <button
                        onClick={() => handleSelectAvatar(0)}
                        className={`relative rounded-2xl overflow-hidden border-2 transition-all w-32 h-32 flex-shrink-0 ${
                          selectedAvatarIdx === 0
                            ? "border-purple-500 ring-2 ring-purple-500/30"
                            : "border-white/10 hover:border-white/30"
                        }`}
                      >
                        <img
                          src={`data:${generatedAvatars[0].mimeType};base64,${generatedAvatars[0].image}`}
                          alt="Generated avatar"
                          className="w-full h-full object-cover"
                        />
                        {selectedAvatarIdx === 0 && (
                          <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center shadow-lg">
                              <Check size={16} className="text-white" />
                            </div>
                          </div>
                        )}
                      </button>
                      <div className="flex flex-col gap-2 pt-2">
                        <button
                          onClick={() => handleSelectAvatar(0)}
                          disabled={selectedAvatarIdx === 0}
                          className="px-4 py-2 text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-all disabled:opacity-50"
                        >
                          {selectedAvatarIdx === 0 ? "✓ Selected" : "Use This Avatar"}
                        </button>
                        <button
                          onClick={handleGenerateAvatars}
                          disabled={generatingAvatars}
                          className="px-4 py-2 text-xs font-semibold text-neutral-400 border border-white/10 rounded-lg hover:bg-white/5 hover:text-white transition-all"
                        >
                          🔄 Try Again
                        </button>
                        {selectedAvatarIdx !== null && (
                          <p className="text-xs text-emerald-400 flex items-center gap-1.5 mt-1">
                            <Check size={12} /> Avatar saved!
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Tone */}
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-3 font-mono">
                    Tone / Personality Mode
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                    {TONE_OPTIONS.map((tone) => (
                      <button
                        key={tone}
                        onClick={() => setConfig((p) => ({ ...p, tone }))}
                        className={`flex flex-col items-start gap-1 p-3.5 rounded-xl border text-left transition-all ${
                          config.tone === tone
                            ? "bg-purple-500/10 border-purple-500/30 text-white"
                            : "bg-[#111]/40 border-white/5 text-neutral-400 hover:bg-[#111] hover:border-white/10"
                        }`}
                      >
                        <p className="text-xs font-bold capitalize">{tone}</p>
                        <p className="text-[10px] text-neutral-500 mt-1 leading-normal">{TONE_DESCRIPTIONS[tone]}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Personality */}
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-2 font-mono">
                    Core Personality Description
                  </label>
                  <textarea
                    value={config.personality}
                    onChange={(e) => setConfig((p) => ({ ...p, personality: e.target.value }))}
                    rows={4}
                    placeholder="Describe who your agent is, its temperament, and its working style..."
                    className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all text-sm resize-none"
                  />
                </div>

                {/* Communication Style */}
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-2 font-mono">
                    Communication Style
                  </label>
                  <div className="space-y-2 mb-3">
                    {STYLE_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setConfig((p) => ({ ...p, communicationStyle: preset }))}
                        className={`w-full text-left px-4 py-2.5 rounded-xl border text-xs transition-all ${
                          config.communicationStyle === preset
                            ? "bg-purple-500/10 border-purple-500/30 text-white"
                            : "bg-[#111]/40 border-white/5 text-neutral-400 hover:bg-[#111] hover:border-white/10"
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
                    placeholder="Or write custom instructions (e.g. 'Highly technical, uses developer jargon')..."
                    className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all text-sm"
                  />
                </div>

                {/* Focus Areas */}
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-2 font-mono">
                    Areas of Expertise / Focus Areas
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {FOCUS_OPTIONS.map((area) => {
                      const isSelected = config.focusAreas.includes(area);
                      return (
                        <button
                          key={area}
                          onClick={() => toggleFocus(area)}
                          className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all ${
                            isSelected
                              ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                              : "bg-[#111]/40 border-white/10 text-neutral-400 hover:bg-[#111] hover:border-white/20"
                          }`}
                        >
                          {isSelected && <span className="mr-1">✓</span>}
                          {area}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={focusInput}
                      onChange={(e) => setFocusInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addCustomFocus()}
                      placeholder="Add custom expertise area..."
                      className="flex-1 bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-xs"
                    />
                    <button
                      onClick={addCustomFocus}
                      className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-neutral-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                      Add Custom
                    </button>
                  </div>
                </div>

                {/* Signature Phrase */}
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-2 font-mono">
                    Signature Catchphrase <span className="text-neutral-700 normal-case">— optional</span>
                  </label>
                  <input
                    type="text"
                    value={config.signaturePhrase || ""}
                    onChange={(e) => setConfig((p) => ({ ...p, signaturePhrase: e.target.value }))}
                    placeholder="e.g. Atlas on it. / Understood, starting analysis."
                    className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all text-sm"
                  />
                </div>
              </motion.div>
            )}

            {activeTab === "permissions" && (
              <motion.div
                key="permissions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-2xl p-4 mb-6">
                  <Shield size={20} className="text-purple-400 flex-shrink-0" />
                  <p className="text-xs text-neutral-400 leading-normal">
                    Restrict this agent's access to specific workspace tools. Unchecked services will not be exposed to the agent's LLM model. By default, agents have access to all your connected tools.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SERVICES.map((svc) => {
                    const isConnected = connections[svc.id]?.connected;
                    const isAllowed = isServiceEnabled(svc.id);
                    
                    return (
                      <div 
                        key={svc.id}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                          isConnected 
                            ? "bg-[#111]/40 border-white/5" 
                            : "bg-black/40 border-white/[0.02] opacity-40"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl flex-shrink-0">{svc.icon}</span>
                          <div>
                            <h3 className="text-sm font-semibold">{svc.name}</h3>
                            <p className="text-[10px] text-neutral-500 leading-normal mt-0.5">{svc.desc}</p>
                          </div>
                        </div>

                        {isConnected ? (
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={isAllowed} 
                              onChange={(e) => handleToggleService(svc.id, e.target.checked)}
                              className="sr-only peer" 
                            />
                            <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-400 after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600 peer-checked:after:bg-white"></div>
                          </label>
                        ) : (
                          <span className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest font-mono">Not Connected</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {activeTab === "voice" && (
              <motion.div
                key="voice"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                  <div className="flex items-start gap-4 mb-6">
                    <Mic size={24} className="text-purple-400 flex-shrink-0 mt-1" />
                    <div>
                      <h2 className="text-lg font-bold">Voice Settings</h2>
                      <p className="text-xs text-neutral-400 mt-1 leading-normal">
                        Select a voice preset for your agent. Real-time voice calls use high-fidelity, end-to-end multimodal synthesis.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: "Rachel", name: "Rachel (Aoede - Female)", desc: "Warm, professional, and clear" },
                      { id: "Drew", name: "Drew (Charon - Male)", desc: "Deep, professional, and confident" },
                      { id: "Clyde", name: "Clyde (Fenrir - Male)", desc: "Casual, friendly, and natural" },
                      { id: "Nicole", name: "Nicole (Kore - Female)", desc: "Direct, energetic, and articulate" },
                      { id: "Adam", name: "Adam (Puck - Male)", desc: "Energetic, playful, and expressive" }
                    ].map((v) => {
                      const isSelected = (config.voice || "Rachel") === v.id;
                      const isPlaying = previewingVoice === v.id;
                      const isLoading = loadingPreview === v.id;
                      return (
                        <div
                          key={v.id}
                          className={`flex flex-col items-start gap-1 p-4 rounded-xl border text-left transition-all ${
                            isSelected
                              ? "bg-purple-500/10 border-purple-500/30 text-white"
                              : "bg-[#111]/40 border-white/5 text-neutral-400 hover:bg-[#111] hover:border-white/10"
                          }`}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <button
                              onClick={() => setConfig((p) => ({ ...p, voice: v.id }))}
                              className="flex items-center gap-2 flex-1 min-w-0"
                            >
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${isSelected ? "border-purple-500" : "border-neutral-700"}`}>
                                {isSelected && <div className="w-2 h-2 rounded-full bg-purple-500" />}
                              </div>
                              <span className="text-sm font-semibold truncate">{v.name}</span>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handlePreviewVoice(v.id); }}
                              disabled={isLoading}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
                                isPlaying
                                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                  : isLoading
                                  ? "bg-white/5 text-neutral-500 border border-white/5"
                                  : "bg-white/5 text-neutral-400 border border-white/10 hover:bg-white/10 hover:text-white"
                              }`}
                              title={isPlaying ? "Stop preview" : "Preview voice"}
                            >
                              {isLoading ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : isPlaying ? (
                                <Square size={12} />
                              ) : (
                                <Play size={12} />
                              )}
                              {isLoading ? "Loading..." : isPlaying ? "Stop" : "Preview"}
                            </button>
                          </div>
                          <p className="text-xs text-neutral-500 mt-1 pl-6">{v.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
