"use client";

import { useState, useEffect, Suspense } from "react";
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
  ExternalLink,
  Contact,
  StickyNote,
  Image,
  ListTodo,
  FileText,
  Store,
  BarChart2,
  ClipboardList,
  Presentation,
  Cable,
  Plus,
  Trash2,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { SetupGuide, BRAIN_GUIDES, SOCIAL_GUIDES, GOOGLE_SUITE_GUIDES } from "./setup-guide";
import { useSearchParams, useRouter } from "next/navigation";

/* ─── Types ─── */
interface BrainConfig {
  provider: "gemini" | "openai" | "claude";
  apiKey: string;
  verified: boolean;
  updatedAt: string;
}

interface ConnectionEntry {
  apiKey?: string;
  apiSecret?: string;
  connected: boolean;
  tokenType?: "oauth" | "api_key";
  connectedAt?: string;
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
  { id: "gmail", name: "Gmail", description: "Read, send, and manage emails", icon: Mail, color: "text-red-400", requiresOAuth: true, comingSoon: false },
  { id: "calendar", name: "Google Calendar", description: "Schedule and manage events", icon: Calendar, color: "text-blue-400", requiresOAuth: true, comingSoon: false },
  { id: "drive", name: "Google Drive", description: "Access and manage files", icon: HardDrive, color: "text-yellow-400", requiresOAuth: true, comingSoon: false },
  { id: "sheets", name: "Google Sheets", description: "Read and write spreadsheet data", icon: FileSpreadsheet, color: "text-green-400", requiresOAuth: true, comingSoon: false },
  { id: "youtube", name: "YouTube", description: "Video analytics and management", icon: Youtube, color: "text-red-500", requiresOAuth: true, comingSoon: false },
  { id: "contacts", name: "Google Contacts", description: "Manage contacts — auto-connects with Google", icon: Contact, color: "text-indigo-400", requiresOAuth: true, comingSoon: false },
  { id: "tasks", name: "Google Tasks", description: "To-do lists synced with Gmail & Calendar", icon: ListTodo, color: "text-cyan-400", requiresOAuth: true, comingSoon: false },
  { id: "docs", name: "Google Docs", description: "Create and edit documents", icon: FileText, color: "text-blue-300", requiresOAuth: true, comingSoon: false },
  { id: "forms", name: "Google Forms", description: "Create surveys and collect responses", icon: ClipboardList, color: "text-purple-400", requiresOAuth: true, comingSoon: false },
  { id: "slides", name: "Google Slides", description: "Create presentations", icon: Presentation, color: "text-orange-400", requiresOAuth: true, comingSoon: false },
  { id: "analytics", name: "Google Analytics", description: "Website traffic and performance data", icon: BarChart2, color: "text-yellow-300", requiresOAuth: true, comingSoon: false },
  { id: "business", name: "Business Profile", description: "Manage Google Business listing & reviews", icon: Store, color: "text-green-300", requiresOAuth: true, comingSoon: false },
  { id: "notes", name: "Notes & KB", description: "Persistent notes & knowledge base — always available", icon: StickyNote, color: "text-amber-400", requiresOAuth: false, comingSoon: false },
];

const SOCIAL_MEDIA = [
  { id: "twitter", name: "X / Twitter", description: "Post, monitor, and engage", icon: Twitter, color: "text-neutral-300", hasSecret: true, comingSoon: false, requiresOAuth: true },
  { id: "instagram", name: "Instagram", description: "Content publishing and insights", icon: Instagram, color: "text-pink-400", hasSecret: false, comingSoon: false, requiresOAuth: true },
  { id: "tiktok", name: "TikTok", description: "Short-form video management", icon: Music2, color: "text-cyan-400", hasSecret: false, comingSoon: false, requiresOAuth: true },
  { id: "linkedin", name: "LinkedIn", description: "Professional content and networking", icon: Linkedin, color: "text-blue-500", hasSecret: false, comingSoon: false, requiresOAuth: true },
  { id: "facebook", name: "Facebook", description: "Page management and ads", icon: Facebook, color: "text-blue-400", hasSecret: false, comingSoon: false, requiresOAuth: true },
];

/* ─── Tool Map ─── */
const TOOL_MAP: Record<string, string[]> = {
  gmail: ["Search Emails", "Read Email", "Send Email", "Reply", "Unread Count", "Archive", "Trash"],
  calendar: ["List Events", "Get Event", "Create Event", "Update Event", "Delete Event", "Find Free Slots"],
  drive: ["List Files", "Get File", "Read Content", "Upload File", "Create Folder"],
  sheets: ["List Spreadsheets", "Read Sheet", "Write Sheet", "Append Rows", "Create Spreadsheet"],
  youtube: ["List Channels", "List Videos", "Analytics", "Search", "Playlists", "Add to Playlist", "Comments", "Reply to Comment"],
  contacts: ["List Contacts", "Search Contacts", "Create Contact", "Delete Contact"],
  tasks: ["List Task Lists", "List Tasks", "Create Task", "Complete Task", "Delete Task", "Clear Completed"],
  docs: ["Create Document", "Get Document", "Append Text"],
  forms: ["Create Form", "Add Question", "Get Form", "Get Responses"],
  slides: ["Create Presentation", "Get Presentation", "Add Slide", "Insert Text"],
  analytics: ["List Properties", "Run Report", "Realtime Data"],
  business: ["List Accounts", "List Locations", "Get Reviews", "Reply to Review", "Create Post"],
  notes: ["Create Note", "List Notes", "Update Note", "Delete Note", "Search Notes", "Knowledge Base"],
  twitter: ["Profile", "Timeline", "Tweet", "Search", "Delete", "Reply", "Retweet", "Like", "Unlike", "Mentions", "Followers", "Bookmark", "Bookmarks", "Liked Tweets", "Follow", "Unfollow", "Mute", "Block"],
  instagram: ["Profile", "Media", "Post", "Comments", "Reply", "Carousel", "Reel", "Post Insights", "Account Insights", "Stories", "Hashtag Search", "Delete Post", "Create Story", "Story Insights", "Tagged Media"],
  facebook: ["Profile", "Pages", "Page Posts", "Create Post", "Insights", "Comments", "Reply", "Delete Post", "Photo Post", "Schedule Post", "Video Upload", "Create Reel", "Scheduled Posts", "Cancel Scheduled"],
  tiktok: ["Profile"],
  linkedin: ["Profile", "Create Post", "Post with Link", "Get Posts", "Delete Post", "Image Post", "Comment", "React"],
};

/* ─── Component ─── */
export default function ConnectionsPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-[#0d0d0d] text-white font-mono uppercase tracking-widest animate-pulse">
        Loading...
      </div>
    }>
      <ConnectionsPageInner />
    </Suspense>
  );
}

function ConnectionsPageInner() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    brain: true,
    google: false,
    social: false,
    mcp: false,
  });
  const toggleSection = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

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

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Setup instructions for social platforms
  const [setupPlatform, setSetupPlatform] = useState<string | null>(null);

  const SETUP_INFO: Record<string, { name: string; url: string; steps: string[] }> = {
    twitter: {
      name: "X / Twitter",
      url: "https://developer.twitter.com/en/portal/dashboard",
      steps: [
        "Go to the X Developer Portal and create a project + app",
        "Enable OAuth 2.0 with \"Read and Write\" permissions",
        "Add the callback URL: https://employeezero.app/api/auth/social/callback",
        "Copy your Client ID and Client Secret",
        "Add them to your Employee Zero settings as TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET",
      ],
    },
    instagram: {
      name: "Instagram",
      url: "https://developers.facebook.com/apps/",
      steps: [
        "Go to Meta for Developers and create a new app (type: Business)",
        "Add the Instagram Basic Display or Instagram Graph API product",
        "Configure OAuth with redirect: https://employeezero.app/api/auth/social/callback",
        "Copy your App ID and App Secret",
        "Add them to your Employee Zero settings as META_APP_ID and META_APP_SECRET",
      ],
    },
    facebook: {
      name: "Facebook",
      url: "https://developers.facebook.com/apps/",
      steps: [
        "Go to Meta for Developers and create a new app (type: Business)",
        "Add the Facebook Login product",
        "Configure OAuth with redirect: https://employeezero.app/api/auth/social/callback",
        "Copy your App ID and App Secret",
        "Add them as META_APP_ID and META_APP_SECRET (shared with Instagram)",
      ],
    },
    tiktok: {
      name: "TikTok",
      url: "https://developers.tiktok.com/",
      steps: [
        "Go to TikTok for Developers and register an app",
        "Apply for Login Kit and Content Posting API access",
        "Add the callback URL: https://employeezero.app/api/auth/social/callback",
        "Copy your Client Key and Client Secret",
        "Add them as TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET",
      ],
    },
    linkedin: {
      name: "LinkedIn",
      url: "https://www.linkedin.com/developers/apps",
      steps: [
        "Go to LinkedIn Developers and create a new app",
        "Request access to \"Share on LinkedIn\" and \"Sign In with LinkedIn v2\"",
        "Add the callback URL: https://employeezero.app/api/auth/social/callback",
        "Copy your Client ID and Client Secret",
        "Add them as LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET",
      ],
    },
  };

  // Handle OAuth callback params
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    const setup = searchParams.get("setup");

    if (connected) {
      setToast({ message: `${connected.charAt(0).toUpperCase() + connected.slice(1)} connected successfully!`, type: "success" });
      router.replace("/connections", { scroll: false });
    } else if (setup && SETUP_INFO[setup]) {
      setSetupPlatform(setup);
      router.replace("/connections", { scroll: false });
    } else if (error) {
      const detail = searchParams.get("detail");
      const messages: Record<string, string> = {
        access_denied: "You denied access. No changes were made.",
        token_exchange_failed: detail
          ? `Token exchange failed: ${detail}`
          : "Failed to exchange token. Please try again.",
        storage_failed: "Connected but failed to save. Try again.",
        missing_params: "Connection request was missing required information.",
        unknown_platform: "Unknown platform requested.",
      };
      setToast({ message: messages[error] || `OAuth error: ${error}`, type: "error" });
      router.replace("/connections", { scroll: false });
    }
  }, [searchParams, router]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

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
        tokenType: "api_key",
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

  const connectWithOAuth = (serviceId: string) => {
    if (!user?.uid) return;
    // Full-page redirect to our OAuth initiation endpoint
    window.location.href = `/api/auth/google?service=${serviceId}&userId=${user.uid}`;
  };

  // Social media platforms use their own OAuth
  const SOCIAL_PLATFORM_IDS = ["twitter", "instagram", "tiktok", "linkedin", "facebook"];

  const connectSocialOAuth = (platformId: string) => {
    if (!user?.uid) return;
    window.location.href = `/api/auth/social?platform=${platformId}&userId=${user.uid}`;
  };

  const disconnectSocialOAuth = async (platformId: string) => {
    if (!user?.uid) return;
    setSavingConnection(platformId);
    try {
      await setDoc(
        doc(db, "users", user.uid, "settings", "connections"),
        { [platformId]: { connected: false, accessToken: "", refreshToken: "" } },
        { merge: true }
      );
      setConnections((prev) => ({ ...prev, [platformId]: { connected: false } }));
    } catch (err) {
      console.error("Failed to disconnect:", err);
    } finally {
      setSavingConnection(null);
    }
  };

  const disconnectOAuthService = async (serviceId: string) => {
    if (!user?.uid) return;
    setSavingConnection(serviceId);
    try {
      const res = await fetch("/api/auth/google/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, service: serviceId }),
      });

      if (res.ok) {
        const updated = { ...connections };
        delete updated[serviceId];
        setConnections(updated);
        setToast({ message: `${serviceId.charAt(0).toUpperCase() + serviceId.slice(1)} disconnected.`, type: "success" });
      } else {
        const data = await res.json();
        setToast({ message: `Failed to disconnect: ${data.error}`, type: "error" });
      }
    } catch (err) {
      console.error("Failed to disconnect:", err);
      setToast({ message: "Failed to disconnect. Check your connection.", type: "error" });
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
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className={cn(
              "fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl border text-sm font-medium shadow-2xl backdrop-blur-xl flex items-center gap-2",
              toast.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            )}
          >
            {toast.type === "success" ? <Check size={14} /> : <X size={14} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Setup Instructions Modal */}
      <AnimatePresence>
        {setupPlatform && SETUP_INFO[setupPlatform] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setSetupPlatform(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#141414] border border-white/10 rounded-3xl p-6 max-w-lg w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">
                  Connect {SETUP_INFO[setupPlatform].name}
                </h3>
                <button
                  onClick={() => setSetupPlatform(null)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-500 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-sm text-neutral-400 mb-4">
                To connect {SETUP_INFO[setupPlatform].name}, you need to set up a developer app first. This is a one-time setup:
              </p>

              <ol className="space-y-2.5 mb-5">
                {SETUP_INFO[setupPlatform].steps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center text-[10px] font-bold mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-neutral-300">{step}</span>
                  </li>
                ))}
              </ol>

              <div className="flex gap-3">
                <a
                  href={SETUP_INFO[setupPlatform].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center text-sm font-semibold px-4 py-2.5 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-colors flex items-center justify-center gap-2"
                >
                  Open Developer Portal
                  <ExternalLink size={12} />
                </a>
                <button
                  onClick={() => setSetupPlatform(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-neutral-400 hover:bg-white/10 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-4">
        {/* ═══ SETUP PROGRESS ═══ */}
        {(() => {
          const brainDone = brainConfig.verified ? 1 : 0;
          const connDone = Object.values(connections).filter(c => c.connected).length;
          const activeSocial = SOCIAL_MEDIA.filter(s => !(s as any).upgradeRequired && !(s as any).pendingReview);
          const totalSetup = 1 + GOOGLE_SUITE.length + activeSocial.length; // brain + active services
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
        <section className="rounded-2xl border border-white/5 bg-white/[0.015] overflow-hidden">
          <button
            onClick={() => toggleSection('brain')}
            className="w-full flex items-center gap-3 p-5 hover:bg-white/[0.02] transition-colors"
          >
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <Brain size={18} className="text-purple-400" />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Brain</h2>
                {brainConfig.verified && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">Active</span>
                )}
              </div>
              <p className="text-xs text-neutral-500">Choose which AI powers your agents</p>
            </div>
            <motion.div animate={{ rotate: openSections.brain ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={18} className="text-neutral-500" />
            </motion.div>
          </button>
          <AnimatePresence initial={false}>
          {openSections.brain && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
          <div className="px-5 pb-5">

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
          </div>
          </motion.div>
          )}
          </AnimatePresence>
        </section>

        {/* ═══ GOOGLE SUITE ═══ */}
        <section className="rounded-2xl border border-white/5 bg-white/[0.015] overflow-hidden">
          <button
            onClick={() => toggleSection('google')}
            className="w-full flex items-center gap-3 p-5 hover:bg-white/[0.02] transition-colors"
          >
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Sparkles size={18} className="text-blue-400" />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Google Suite</h2>
                {(() => { const c = Object.entries(connections).filter(([k,v]) => GOOGLE_SUITE.some(g => g.id === k) && v.connected).length; return c > 0 ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">{c} connected</span> : null; })()}
              </div>
              <p className="text-xs text-neutral-500">Included in your base package</p>
            </div>
            <motion.div animate={{ rotate: openSections.google ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={18} className="text-neutral-500" />
            </motion.div>
          </button>
          <AnimatePresence initial={false}>
          {openSections.google && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
          <div className="px-5 pb-5">

          <div className="space-y-2">
            {GOOGLE_SUITE.map((svc) => {
              const conn = connections[svc.id];
              const isEditing = editingKey === svc.id;
              // Contacts auto-connects with any Google connection; Notes & Imagen are always available
              const isAlwaysOn = svc.id === "notes" || svc.id === "imagen";
              const isAutoGoogle = svc.id === "contacts" && (connections.gmail?.connected || connections.calendar?.connected || connections.drive?.connected);
              const isConnected = isAlwaysOn || isAutoGoogle || conn?.connected;
              const isOAuth = isAlwaysOn || isAutoGoogle || conn?.tokenType === "oauth";
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
                        <span className={cn(
                          "text-xs font-medium flex items-center gap-1",
                          isOAuth ? "text-emerald-400" : "text-emerald-400"
                        )}>
                          {isOAuth && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 mr-1">
                              OAuth
                            </span>
                          )}
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
                          onClick={() => isOAuth ? disconnectOAuthService(svc.id) : disconnectService(svc.id)}
                          className="text-[11px] text-red-400/70 hover:text-red-400 font-medium transition-colors"
                        >
                          Disconnect
                        </button>
                      ) : svc.comingSoon ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-neutral-500">
                          Coming Soon
                        </span>
                      ) : svc.requiresOAuth ? (
                        <button
                          onClick={() => connectWithOAuth(svc.id)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white transition-all flex items-center gap-1.5 group"
                        >
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                          Connect with Google
                          <ExternalLink size={10} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingKey(svc.id);
                            setEditValue(conn?.apiKey || "");
                          }}
                          className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors flex items-center gap-1"
                        >
                          Connect <ChevronRight size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Edit row — for non-OAuth services like YouTube */}
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

                  {/* OAuth info row for connected OAuth services */}
                  {isConnected && isOAuth && (
                    <div className="px-4 pb-3">
                      <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                        <Lock size={10} />
                        <span>Authenticated via Google OAuth — tokens are stored securely</span>
                        {conn?.connectedAt && (
                          <span className="text-neutral-600 ml-auto">
                            Connected {new Date(conn.connectedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tools list */}
                  {TOOL_MAP[svc.id] && (
                    <div className="px-4 pb-3">
                      <div className="flex flex-wrap gap-1.5">
                        {TOOL_MAP[svc.id].map((tool) => (
                          <span
                            key={tool}
                            className={cn(
                              "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                              isConnected
                                ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400/70"
                                : "bg-white/[0.02] border-white/5 text-neutral-600"
                            )}
                          >
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          </div>
          </motion.div>
          )}
          </AnimatePresence>
        </section>

        {/* ═══ SOCIAL MEDIA ═══ */}
        <section className="rounded-2xl border border-white/5 bg-white/[0.015] overflow-hidden">
          <button
            onClick={() => toggleSection('social')}
            className="w-full flex items-center gap-3 p-5 hover:bg-white/[0.02] transition-colors"
          >
            <div className="p-2 rounded-xl bg-pink-500/10 border border-pink-500/20">
              <Twitter size={18} className="text-pink-400" />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Social Media</h2>
                {(() => { const c = Object.entries(connections).filter(([k,v]) => SOCIAL_MEDIA.some(s => s.id === k) && v.connected).length; return c > 0 ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">{c} connected</span> : null; })()}
              </div>
              <p className="text-xs text-neutral-500">Connect your social accounts for content automation</p>
            </div>
            <motion.div animate={{ rotate: openSections.social ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={18} className="text-neutral-500" />
            </motion.div>
          </button>
          <AnimatePresence initial={false}>
          {openSections.social && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
          <div className="px-5 pb-5">

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
                          onClick={() => disconnectSocialOAuth(svc.id)}
                          className="text-[11px] text-red-400/70 hover:text-red-400 font-medium transition-colors"
                        >
                          Disconnect
                        </button>
                      ) : (svc as any).upgradeRequired ? (
                        <span className="text-[11px] text-amber-400/70 font-medium px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          Coming Soon
                        </span>
                      ) : (svc as any).pendingReview ? (
                        <span className="text-[11px] text-amber-400/70 font-medium px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          Coming Soon
                        </span>
                      ) : (svc as any).requiresOAuth ? (
                        <button
                          onClick={() => connectSocialOAuth(svc.id)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white transition-all flex items-center gap-1.5 group"
                        >
                          <Plug size={12} className="opacity-60" />
                          Connect
                          <ExternalLink size={10} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Tools list */}
                  {TOOL_MAP[svc.id] && (
                    <div className="px-4 pb-3">
                      <div className="flex flex-wrap gap-1.5">
                        {TOOL_MAP[svc.id].map((tool) => (
                          <span
                            key={tool}
                            className={cn(
                              "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                              isConnected
                                ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400/70"
                                : "bg-white/[0.02] border-white/5 text-neutral-600"
                            )}
                          >
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

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
          </div>
          </motion.div>
          )}
          </AnimatePresence>
        </section>
        {/* ═══ UNIVERSAL MCP CONNECTOR ═══ */}
        <McpSection userId={user?.uid || ""} toast={toast} setToast={setToast} openSections={openSections} toggleSection={toggleSection} />
      </div>
    </div>
  );
}

/* ─── MCP Section Component ─── */

interface McpConnectionUI {
  id: string;
  name: string;
  url: string;
  status: string;
  toolCount: number;
  tools: { name: string; description: string }[];
  lastConnected?: string;
}

function McpSection({
  userId,
  toast,
  setToast,
  openSections,
  toggleSection,
}: {
  userId: string;
  toast: any;
  setToast: (t: any) => void;
  openSections: Record<string, boolean>;
  toggleSection: (key: string) => void;
}) {
  const [mcpConnections, setMcpConnections] = useState<McpConnectionUI[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [mcpName, setMcpName] = useState("");
  const [mcpUrl, setMcpUrl] = useState("");
  const [mcpLoading, setMcpLoading] = useState(false);
  const [mcpError, setMcpError] = useState("");
  const [expandedMcp, setExpandedMcp] = useState<string | null>(null);

  // Load MCP connections
  useEffect(() => {
    if (!userId) return;
    fetch("/api/mcp", {
      headers: { "x-user-id": userId },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.connections) setMcpConnections(data.connections);
      })
      .catch(() => {});
  }, [userId]);

  const addMcpConnection = async () => {
    if (!mcpName.trim() || !mcpUrl.trim()) return;
    setMcpLoading(true);
    setMcpError("");
    try {
      const res = await fetch("/api/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({ name: mcpName.trim(), url: mcpUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connection failed");

      setMcpConnections((prev) => [
        {
          id: data.id,
          name: data.name,
          url: mcpUrl.trim(),
          status: "connected",
          toolCount: data.toolCount,
          tools: data.tools,
        },
        ...prev,
      ]);
      setMcpName("");
      setMcpUrl("");
      setShowAddForm(false);
      setToast({ message: `Connected! ${data.toolCount} tools discovered.`, type: "success" });
    } catch (err: any) {
      setMcpError(err.message);
    } finally {
      setMcpLoading(false);
    }
  };

  const removeMcpConnection = async (connectionId: string) => {
    try {
      await fetch("/api/mcp", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({ connectionId }),
      });
      setMcpConnections((prev) => prev.filter((c) => c.id !== connectionId));
      setToast({ message: "MCP server disconnected.", type: "success" });
    } catch {
      setToast({ message: "Failed to disconnect.", type: "error" });
    }
  };

  return (
    <section className="rounded-2xl border border-white/5 bg-white/[0.015] overflow-hidden">
      <button
        onClick={() => toggleSection('mcp')}
        className="w-full flex items-center gap-3 p-5 hover:bg-white/[0.02] transition-colors"
      >
        <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
          <Cable size={18} className="text-violet-400" />
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight">MCP Servers</h2>
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-violet-500/30 bg-violet-500/20 text-violet-400">
              Power User
            </span>
            {mcpConnections.length > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">{mcpConnections.length} connected</span>
            )}
          </div>
          <p className="text-xs text-neutral-500">
            Connect to any MCP server for unlimited integrations
          </p>
        </div>
        <motion.div animate={{ rotate: openSections.mcp ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={18} className="text-neutral-500" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
      {openSections.mcp && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="overflow-hidden"
      >
      <div className="px-5 pb-5">
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 text-violet-400 transition-all flex items-center gap-1.5"
          >
            <Plus size={14} />
            Add Server
          </button>
        </div>

      {/* Add Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="p-5 rounded-2xl border border-violet-500/20 bg-violet-500/5 space-y-3">
              <div className="flex items-center gap-2 text-xs text-violet-300">
                <Cable size={12} />
                <span className="font-medium">Connect to a remote MCP server via HTTP/SSE</span>
              </div>
              <input
                type="text"
                value={mcpName}
                onChange={(e) => setMcpName(e.target.value)}
                placeholder="Server name (e.g., Stripe, Slack, Notion)..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
              <input
                type="url"
                value={mcpUrl}
                onChange={(e) => setMcpUrl(e.target.value)}
                placeholder="Server URL (e.g., https://mcp.example.com/sse)..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30 font-mono"
              />
              {mcpError && (
                <p className="text-xs text-red-400 flex items-center gap-1.5">
                  <X size={12} />
                  {mcpError}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={addMcpConnection}
                  disabled={mcpLoading || !mcpName.trim() || !mcpUrl.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300 text-sm font-bold hover:bg-violet-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {mcpLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Testing connection...
                    </>
                  ) : (
                    <>
                      <Zap size={14} />
                      Connect & Discover Tools
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setMcpError("");
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-neutral-500 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
              <p className="text-[10px] text-neutral-600">
                Supports Streamable HTTP and SSE transports. Your Atlas will automatically gain access to all tools discovered on the server.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connected MCP Servers */}
      <div className="space-y-2">
        {mcpConnections.length === 0 && !showAddForm && (
          <div className="text-center py-8 text-neutral-600">
            <Cable size={24} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No MCP servers connected</p>
            <p className="text-xs mt-1">Add a server to unlock unlimited integrations</p>
          </div>
        )}

        {mcpConnections.map((conn) => (
          <div
            key={conn.id}
            className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden"
          >
            <div className="flex items-center gap-4 p-4">
              <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <Cable size={18} className="text-violet-400" />
              </div>
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() =>
                  setExpandedMcp(expandedMcp === conn.id ? null : conn.id)
                }
              >
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">{conn.name}</p>
                  <span className="text-[10px] font-mono text-neutral-600 truncate max-w-[200px]">
                    {conn.url}
                  </span>
                </div>
                <p className="text-xs text-neutral-500">
                  {conn.toolCount} tools available
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-medium flex items-center gap-1 text-emerald-400">
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 mr-1">
                    MCP
                  </span>
                  <Check size={12} />
                  {conn.toolCount} tools
                </span>
                <button
                  onClick={() => removeMcpConnection(conn.id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-neutral-600 hover:text-red-400 transition-all"
                  title="Disconnect"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Expanded tool list */}
            <AnimatePresence>
              {expandedMcp === conn.id && conn.tools.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-3">
                    <div className="flex flex-wrap gap-1.5">
                      {conn.tools.map((tool) => (
                        <span
                          key={tool.name}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-violet-500/5 border-violet-500/20 text-violet-400/70"
                          title={tool.description}
                        >
                          {tool.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
      </div>
      </motion.div>
      )}
      </AnimatePresence>
    </section>
  );
}

