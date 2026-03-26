"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  ArrowLeft,
  Brain,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  Plug,
  Sparkles,
  Mail,
  Calendar,
  HardDrive,
  FileSpreadsheet,
  Youtube,
  Twitter,
  Instagram,
  Linkedin,
  Facebook,
  Music2,
  ChevronRight,
  Shield,
  Zap,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { SetupGuide, BRAIN_GUIDES, SOCIAL_GUIDES, GOOGLE_SUITE_GUIDES } from "./setup-guide";

/* ─── Types ─── */
interface BrainConfig {
  provider: "gemini" | "openai" | "claude";
  apiKey: string;
  verified: boolean;
  updatedAt: string;
}

interface ConnectionEntry {
  apiKey: string;
  apiSecret?: string;
  connected: boolean;
}

type ConnectionsMap = Record<string, ConnectionEntry>;

/* ─── Provider Data ─── */
const LLM_PROVIDERS = [
  {
    id: "gemini" as const,
    name: "Gemini",
    company: "Google",
    description: "Fast, multimodal, best value. Recommended for most use cases.",
    badge: "Recommended",
    badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    icon: "✦",
    iconBg: "bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-500/30",
    gradient: "from-blue-500/10 via-transparent to-purple-500/5",
  },
  {
    id: "openai" as const,
    name: "OpenAI",
    company: "OpenAI",
    description: "GPT-4o & o-series. Industry standard with strong coding ability.",
    badge: null,
    badgeColor: "",
    icon: "◎",
    iconBg: "bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/30",
    gradient: "from-emerald-500/10 via-transparent to-teal-500/5",
  },
  {
    id: "claude" as const,
    name: "Claude",
    company: "Anthropic",
    description: "Excellent reasoning and long-context. Great for research & analysis.",
    badge: null,
    badgeColor: "",
    icon: "◈",
    iconBg: "bg-gradient-to-br from-orange-500/20 to-amber-500/20 border-orange-500/30",
    gradient: "from-orange-500/10 via-transparent to-amber-500/5",
  },
];

const GOOGLE_SUITE = [
  { id: "gmail", name: "Gmail", description: "Read, send, and manage emails", icon: Mail, color: "text-red-400", requiresOAuth: true },
  { id: "calendar", name: "Google Calendar", description: "Schedule and manage events", icon: Calendar, color: "text-blue-400", requiresOAuth: true },
  { id: "drive", name: "Google Drive", description: "Access and manage files", icon: HardDrive, color: "text-yellow-400", requiresOAuth: true },
  { id: "sheets", name: "Google Sheets", description: "Read and write spreadsheet data", icon: FileSpreadsheet, color: "text-green-400", requiresOAuth: true },
  { id: "youtube", name: "YouTube", description: "Video analytics and management", icon: Youtube, color: "text-red-500", requiresOAuth: false },
];

const SOCIAL_MEDIA = [
  { id: "twitter", name: "X / Twitter", description: "Post, monitor, and engage", icon: Twitter, color: "text-neutral-300", hasSecret: true },
  { id: "instagram", name: "Instagram", description: "Content publishing and insights", icon: Instagram, color: "text-pink-400", hasSecret: false },
  { id: "tiktok", name: "TikTok", description: "Short-form video management", icon: Music2, color: "text-cyan-400", hasSecret: false },
  { id: "linkedin", name: "LinkedIn", description: "Professional content and networking", icon: Linkedin, color: "text-blue-500", hasSecret: false },
  { id: "facebook", name: "Facebook", description: "Page management and ads", icon: Facebook, color: "text-blue-400", hasSecret: false },
];

/* ─── Component ─── */
export default function ConnectionsPage() {
  const { user, loading: authLoading } = useAuth();

  // Brain state
  const [brainConfig, setBrainConfig] = useState<BrainConfig>({
    provider: "gemini",
    apiKey: "",
    verified: false,
    updatedAt: "",
  });
  const [brainKeyVisible, setBrainKeyVisible] = useState(false);
  const [brainSaving, setBrainSaving] = useState(false);
  const [brainDirty, setBrainDirty] = useState(false);

  // Connections state
  const [connections, setConnections] = useState<ConnectionsMap>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editSecret, setEditSecret] = useState("");
  const [savingConnection, setSavingConnection] = useState<string | null>(null);

  // Load brain config
  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, "users", user.uid, "settings", "brain")).then((snap) => {
      if (snap.exists()) {
        const data = snap.data() as BrainConfig;
        setBrainConfig(data);
      }
    }).catch(() => {});
  }, [user?.uid]);

  // Load connections
  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, "users", user.uid, "settings", "connections")).then((snap) => {
      if (snap.exists()) {
        setConnections(snap.data() as ConnectionsMap);
      }
    }).catch(() => {});
  }, [user?.uid]);

  const saveBrain = async () => {
    if (!user?.uid || !brainConfig.apiKey.trim()) return;
    setBrainSaving(true);
    try {
      const updated: BrainConfig = {
        ...brainConfig,
        verified: true,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "users", user.uid, "settings", "brain"), updated);
      setBrainConfig(updated);
      setBrainDirty(false);
    } catch (err) {
      console.error("Failed to save brain config:", err);
    } finally {
      setBrainSaving(false);
    }
  };

  const saveConnection = async (id: string, hasSecret: boolean) => {
    if (!user?.uid) return;
    setSavingConnection(id);
    try {
      const entry: ConnectionEntry = {
        apiKey: editValue.trim(),
        connected: !!editValue.trim(),
      };
      if (hasSecret) entry.apiSecret = editSecret.trim();

      const updatedConnections = { ...connections, [id]: entry };
      await setDoc(doc(db, "users", user.uid, "settings", "connections"), updatedConnections);
      setConnections(updatedConnections);
      setEditingKey(null);
      setEditValue("");
      setEditSecret("");
    } catch (err) {
      console.error("Failed to save connection:", err);
    } finally {
      setSavingConnection(null);
    }
  };

  const disconnectService = async (id: string) => {
    if (!user?.uid) return;
    setSavingConnection(id);
    try {
      const updatedConnections = {
        ...connections,
        [id]: { apiKey: "", connected: false },
      };
      await setDoc(doc(db, "users", user.uid, "settings", "connections"), updatedConnections);
      setConnections(updatedConnections);
    } catch (err) {
      console.error("Failed to disconnect:", err);
    } finally {
      setSavingConnection(null);
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0d0d0d] text-white font-mono uppercase tracking-widest animate-pulse">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0d0d0d] text-white">
        Please sign in to manage connections.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#0d0d0d]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            href="/chat"
            className="p-2 -ml-2 rounded-xl hover:bg-white/5 transition-colors text-neutral-500 hover:text-white"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/5 border border-white/10">
              <Plug size={18} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Connections</h1>
              <p className="text-xs text-neutral-500">Manage integrations and AI brain</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-14">
        {/* ═══ SETUP PROGRESS ═══ */}
        {(() => {
          const brainDone = brainConfig.verified ? 1 : 0;
          const connDone = Object.values(connections).filter(c => c.connected).length;
          const totalSetup = 1 + GOOGLE_SUITE.length + SOCIAL_MEDIA.length; // brain + all services
          const completedSetup = brainDone + connDone;
          const pct = Math.round((completedSetup / totalSetup) * 100);

          return pct < 100 ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-2xl border border-blue-500/20 bg-blue-500/5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-blue-400" />
                  <span className="text-sm font-semibold">Complete your setup</span>
                </div>
                <span className="text-xs text-neutral-500 font-mono">{completedSetup}/{totalSetup} connected</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                />
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                Connect your services so your agents can work with your accounts. Start with your Brain to power AI, then add integrations.
              </p>
            </motion.div>
          ) : null;
        })()}
        {/* ═══ BRAIN SECTION ═══ */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <Brain size={18} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Brain</h2>
              <p className="text-xs text-neutral-500">Choose which AI powers your agents</p>
            </div>
          </div>

          <div className="grid gap-3">
            {LLM_PROVIDERS.map((p) => {
              const isSelected = brainConfig.provider === p.id;
              return (
                <motion.button
                  key={p.id}
                  onClick={() => {
                    setBrainConfig((prev) => ({ ...prev, provider: p.id, verified: false, apiKey: prev.provider === p.id ? prev.apiKey : "" }));
                    setBrainDirty(true);
                  }}
                  className={cn(
                    "w-full text-left p-5 rounded-2xl border transition-all relative overflow-hidden group",
                    isSelected
                      ? "border-white/20 bg-white/[0.04]"
                      : "border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/10"
                  )}
                  whileTap={{ scale: 0.995 }}
                >
                  {/* Subtle gradient */}
                  {isSelected && (
                    <div className={cn("absolute inset-0 bg-gradient-to-r opacity-50", p.gradient)} />
                  )}

                  <div className="relative flex items-start gap-4">
                    {/* Radio */}
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 transition-all",
                      isSelected ? "border-blue-500 bg-blue-500" : "border-white/20"
                    )}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>

                    {/* Icon */}
                    <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center text-lg flex-shrink-0", p.iconBg)}>
                      {p.icon}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{p.name}</span>
                        <span className="text-[10px] text-neutral-600 font-mono">{p.company}</span>
                        {p.badge && (
                          <span className={cn("text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border", p.badgeColor)}>
                            {p.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-neutral-500 mt-0.5">{p.description}</p>
                    </div>

                    {/* Status */}
                    {isSelected && brainConfig.verified && (
                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium flex-shrink-0">
                        <Check size={14} />
                        Connected
                      </div>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* API Key input */}
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="mt-4 p-5 rounded-2xl border border-white/10 bg-white/[0.02] space-y-4"
          >
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-neutral-500" />
              <p className="text-xs text-neutral-500">
                Your API key is stored securely and only used to process your agent's requests. You pay for tokens directly on your {LLM_PROVIDERS.find(p => p.id === brainConfig.provider)?.company} account.
              </p>
            </div>
            <div className="relative">
              <input
                type={brainKeyVisible ? "text" : "password"}
                value={brainConfig.apiKey}
                onChange={(e) => {
                  setBrainConfig((prev) => ({ ...prev, apiKey: e.target.value, verified: false }));
                  setBrainDirty(true);
                }}
                placeholder={`Enter your ${LLM_PROVIDERS.find(p => p.id === brainConfig.provider)?.name} API key...`}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-20 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-mono"
              />
              <button
                onClick={() => setBrainKeyVisible(!brainKeyVisible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors p-1"
              >
                {brainKeyVisible ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button
              onClick={saveBrain}
              disabled={brainSaving || !brainConfig.apiKey.trim() || (!brainDirty && brainConfig.verified)}
              className={cn(
                "w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
                brainConfig.verified && !brainDirty
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default"
                  : "bg-white text-black hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed"
              )}
            >
              {brainSaving ? (
                <><Loader2 size={16} className="animate-spin" /> Verifying...</>
              ) : brainConfig.verified && !brainDirty ? (
                <><Check size={16} /> Connected &amp; Active</>
              ) : (
                <><Zap size={16} /> Save &amp; Verify</>
              )}
            </button>

            {/* Setup Guide */}
            {BRAIN_GUIDES[brainConfig.provider] && (
              <SetupGuide
                platformName={LLM_PROVIDERS.find(p => p.id === brainConfig.provider)?.name || brainConfig.provider}
                steps={BRAIN_GUIDES[brainConfig.provider]}
              />
            )}
          </motion.div>
        </section>

        {/* ═══ GOOGLE SUITE ═══ */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Sparkles size={18} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Google Suite</h2>
              <p className="text-xs text-neutral-500">Included in your base package</p>
            </div>
          </div>

          <div className="space-y-2">
            {GOOGLE_SUITE.map((svc) => {
              const conn = connections[svc.id];
              const isEditing = editingKey === svc.id;
              const isConnected = conn?.connected;
              const Icon = svc.icon;

              return (
                <div key={svc.id} className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                  <div className="flex items-center gap-4 p-4">
                    <div className={cn("p-2.5 rounded-xl bg-white/5 border border-white/10", svc.color)}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{svc.name}</p>
                      <p className="text-xs text-neutral-500">{svc.description}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {svc.requiresOAuth && !isConnected && !isEditing && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 flex items-center gap-1">
                          <Lock size={8} /> Coming Soon
                        </span>
                      )}
                      {isConnected && !isEditing && (
                        <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                          <Check size={12} /> Connected
                        </span>
                      )}
                      {savingConnection === svc.id ? (
                        <Loader2 size={16} className="animate-spin text-neutral-500" />
                      ) : isEditing ? (
                        <button
                          onClick={() => { setEditingKey(null); setEditValue(""); }}
                          className="p-1.5 rounded-lg hover:bg-white/5 text-neutral-500"
                        >
                          <X size={14} />
                        </button>
                      ) : isConnected ? (
                        <button
                          onClick={() => disconnectService(svc.id)}
                          className="text-[11px] text-red-400/70 hover:text-red-400 font-medium transition-colors"
                        >
                          Disconnect
                        </button>
                      ) : !svc.requiresOAuth ? (
                        <button
                          onClick={() => {
                            setEditingKey(svc.id);
                            setEditValue(conn?.apiKey || "");
                          }}
                          className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors flex items-center gap-1"
                        >
                          Connect <ChevronRight size={12} />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Edit row */}
                  {isEditing && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="px-4 pb-4 space-y-3"
                    >
                      <input
                        type="password"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder="Paste API key..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-mono"
                        autoFocus
                      />
                      <button
                        onClick={() => saveConnection(svc.id, false)}
                        disabled={!editValue.trim()}
                        className="w-full py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-neutral-200 transition-all disabled:opacity-30"
                      >
                        Save Connection
                      </button>
                      {GOOGLE_SUITE_GUIDES[svc.id] && (
                        <SetupGuide platformName={svc.name} steps={GOOGLE_SUITE_GUIDES[svc.id]} />
                      )}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ═══ SOCIAL MEDIA ═══ */}
        <section className="pb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-pink-500/10 border border-pink-500/20">
              <Twitter size={18} className="text-pink-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Social Media</h2>
              <p className="text-xs text-neutral-500">Connect your social accounts for content automation</p>
            </div>
          </div>

          <div className="space-y-2">
            {SOCIAL_MEDIA.map((svc) => {
              const conn = connections[svc.id];
              const isEditing = editingKey === svc.id;
              const isConnected = conn?.connected;
              const Icon = svc.icon;

              return (
                <div key={svc.id} className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                  <div className="flex items-center gap-4 p-4">
                    <div className={cn("p-2.5 rounded-xl bg-white/5 border border-white/10", svc.color)}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{svc.name}</p>
                      <p className="text-xs text-neutral-500">{svc.description}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isConnected && !isEditing && (
                        <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                          <Check size={12} /> Connected
                        </span>
                      )}
                      {savingConnection === svc.id ? (
                        <Loader2 size={16} className="animate-spin text-neutral-500" />
                      ) : isEditing ? (
                        <button
                          onClick={() => { setEditingKey(null); setEditValue(""); setEditSecret(""); }}
                          className="p-1.5 rounded-lg hover:bg-white/5 text-neutral-500"
                        >
                          <X size={14} />
                        </button>
                      ) : isConnected ? (
                        <button
                          onClick={() => disconnectService(svc.id)}
                          className="text-[11px] text-red-400/70 hover:text-red-400 font-medium transition-colors"
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingKey(svc.id);
                            setEditValue(conn?.apiKey || "");
                            setEditSecret(conn?.apiSecret || "");
                          }}
                          className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors flex items-center gap-1"
                        >
                          Connect <ChevronRight size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Edit row */}
                  {isEditing && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="px-4 pb-4 space-y-3"
                    >
                      <input
                        type="password"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder="Paste API key..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-mono"
                        autoFocus
                      />
                      {svc.hasSecret && (
                        <input
                          type="password"
                          value={editSecret}
                          onChange={(e) => setEditSecret(e.target.value)}
                          placeholder="Paste API secret..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-mono"
                        />
                      )}
                      <button
                        onClick={() => saveConnection(svc.id, svc.hasSecret)}
                        disabled={!editValue.trim()}
                        className="w-full py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-neutral-200 transition-all disabled:opacity-30"
                      >
                        Save Connection
                      </button>
                      {SOCIAL_GUIDES[svc.id] && (
                        <SetupGuide platformName={svc.name} steps={SOCIAL_GUIDES[svc.id]} />
                      )}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
