"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { Send, Plus, History, Brain, Loader2, User, Bot, CheckCircle2, Circle, PanelLeftOpen, Search, Settings, MoreHorizontal, ArrowUp, Zap, Eye, Shield, Sparkles, X, Check, Users, Plug, Mail, Calendar, Target, Star, FileSpreadsheet, BarChart3, Clock, Globe, TrendingUp, Briefcase, ChevronRight, Copy, Share2, LogOut, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { authFetch } from "@/lib/authFetch";
import { collection, query, where, orderBy, onSnapshot, addDoc, Timestamp, doc, getDoc, updateDoc, setDoc, deleteDoc } from "firebase/firestore";
import { signOut } from "@/lib/firebase";

interface AgentDoc {
  id: string;
  name: string;
  avatar: string;
  status: string;
  plan: string;
}

interface ChatMessage {
  role: "user" | "model";
  content: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  status: string; // "idle" | "running" | "error"
  createdAt: any;
  userId: string;
  lastError?: string;
}

const AVATAR_EMOJIS: Record<string, string> = {
  bolt: "⚡", ghost: "👻", rocket: "🚀", brain: "🧠", robot: "🤖",
  fire: "🔥", crystal: "💎", star: "⭐", alien: "👾",
};

/* ─── Workflow Suggestions ─── */
interface WorkflowSuggestion {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  skills: string[];
  connections: string[];
  frequency: string;
}

const CONNECTION_ICONS: Record<string, string> = {
  Gmail: "📧", "Google Calendar": "📅", "Google Tasks": "✅", "Google Contacts": "👤",
  "Google Drive": "📁", "Google Docs": "📄", "Business Profile": "🏢", "Google Analytics": "📊",
  "Google Sheets": "📊", "Google Forms": "📋", "Google Slides": "📽️",
};

const WORKFLOW_SUGGESTIONS: WorkflowSuggestion[] = [
  { id: "morning-briefing", name: "Morning Briefing", tagline: "Start every day knowing what matters", description: "Scans your email, calendar, and files every morning. Delivers a prioritized summary with today's meetings, urgent emails, and suggested priorities — straight to your chat.", icon: <Sparkles size={16} />, iconBg: "from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400", skills: ["Email Scanning", "Calendar Analysis", "Priority Scoring"], connections: ["Gmail", "Google Calendar"], frequency: "Daily at your wake-up time" },
  { id: "inbox-commander", name: "Inbox Commander", tagline: "Your inbox, triaged and handled", description: "Categorizes every email as urgent, action-needed, FYI, or noise. Drafts replies for urgent items, auto-archives junk, and delivers a clean digest every 30 minutes.", icon: <Mail size={16} />, iconBg: "from-red-500/20 to-pink-500/20 border-red-500/30 text-red-400", skills: ["Email Triage", "Auto-Reply Drafting", "Smart Archiving"], connections: ["Gmail"], frequency: "Every 30 minutes" },
  { id: "meeting-prep", name: "Meeting Prep", tagline: "Walk into meetings already informed", description: "15 minutes before each meeting, researches attendees by checking past email threads. Generates a briefing with context, talking points, and open items.", icon: <Users size={16} />, iconBg: "from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400", skills: ["Attendee Research", "Email History Search", "Talking Points"], connections: ["Gmail", "Google Calendar"], frequency: "Before every meeting" },
  { id: "eod-wrapup", name: "End-of-Day Wrap-Up", tagline: "Close every day with clarity", description: "Reviews your day's emails, calendar events, and completed tasks. Generates a summary of accomplishments, pending items, and priorities for tomorrow.", icon: <Clock size={16} />, iconBg: "from-purple-500/20 to-violet-500/20 border-purple-500/30 text-purple-400", skills: ["Activity Review", "Priority Setting", "Summary Generation"], connections: ["Gmail", "Google Calendar"], frequency: "Daily at your chosen time" },
  { id: "lead-tracker", name: "Lead Tracker", tagline: "Never lose a lead again", description: "Scans incoming emails for potential leads and new business opportunities. Enriches contacts and sets up automatic follow-up sequences.", icon: <Target size={16} />, iconBg: "from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400", skills: ["Lead Detection", "Contact Enrichment", "Follow-Up Sequences"], connections: ["Gmail", "Google Contacts"], frequency: "Every 2 hours" },
  { id: "appointment-scheduler", name: "Appointment Scheduler", tagline: "Clients book via email — no Calendly", description: "Monitors emails for scheduling requests. Checks your calendar availability, proposes times, and books confirmed appointments automatically.", icon: <Calendar size={16} />, iconBg: "from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400", skills: ["Availability Check", "Time Proposal", "Email Negotiation", "Booking"], connections: ["Gmail", "Google Calendar"], frequency: "Every 30 minutes" },
  { id: "review-responder", name: "Review Responder", tagline: "Every review gets a thoughtful reply", description: "Monitors your Google Business Profile for new reviews. Crafts professional, on-brand responses for both positive and negative feedback.", icon: <Star size={16} />, iconBg: "from-yellow-500/20 to-amber-500/20 border-yellow-500/30 text-yellow-400", skills: ["Sentiment Analysis", "Response Drafting", "Brand Voice"], connections: ["Business Profile"], frequency: "Every 2 hours" },
  { id: "invoice-tracker", name: "Invoice Tracker", tagline: "Every dollar tracked automatically", description: "Scans emails for invoices and payment notifications. Logs amounts, due dates, and vendors into a spreadsheet for easy tracking.", icon: <FileSpreadsheet size={16} />, iconBg: "from-green-500/20 to-lime-500/20 border-green-500/30 text-green-400", skills: ["Invoice Detection", "Expense Logging", "Payment Tracking"], connections: ["Gmail", "Google Sheets"], frequency: "Daily" },
  { id: "weekly-report", name: "Weekly Report", tagline: "One-click executive summary", description: "Aggregates your week's email volume, meetings attended, tasks completed, and key metrics into a polished executive summary.", icon: <BarChart3 size={16} />, iconBg: "from-indigo-500/20 to-purple-500/20 border-indigo-500/30 text-indigo-400", skills: ["Data Aggregation", "Trend Analysis", "Report Generation"], connections: ["Gmail", "Google Calendar"], frequency: "Weekly on Fridays" },
  { id: "content-calendar", name: "Content Calendar", tagline: "A week of content in 10 seconds", description: "Generates a full week of social media posts tailored to your brand voice and industry. Includes hooks, copy, and optimal posting times.", icon: <Globe size={16} />, iconBg: "from-pink-500/20 to-rose-500/20 border-pink-500/30 text-pink-400", skills: ["Copy Generation", "Calendar Planning", "Platform Optimization"], connections: ["Google Docs"], frequency: "Weekly on Mondays" },
  { id: "competitor-intel", name: "Competitor Intel", tagline: "Know what competitors do first", description: "Monitors competitor websites and social channels for changes, new products, and announcements. Delivers a weekly intelligence briefing.", icon: <Search size={16} />, iconBg: "from-orange-500/20 to-red-500/20 border-orange-500/30 text-orange-400", skills: ["Web Monitoring", "Competitive Analysis", "Alert Generation"], connections: ["Google Docs"], frequency: "Weekly" },
  { id: "social-autopilot", name: "Social Autopilot", tagline: "Create once, publish everywhere", description: "Takes a single content piece and adapts it for multiple platforms, adjusting tone, length, and format for each audience.", icon: <TrendingUp size={16} />, iconBg: "from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-400", skills: ["Platform Adapt", "Copy Rewriting", "Scheduling"], connections: ["Google Docs"], frequency: "On demand" },
  { id: "business-pulse", name: "Business Pulse", tagline: "\"How's business?\" — answered instantly", description: "Aggregates signals from your email, calendar, and business profile to give you an instant health check on your business.", icon: <Briefcase size={16} />, iconBg: "from-violet-500/20 to-purple-500/20 border-violet-500/30 text-violet-400", skills: ["KPI Tracking", "Insight Generation", "Trend Analysis"], connections: ["Gmail", "Business Profile"], frequency: "Daily" },
];

function getAgents(employeeName: string, avatarId: string | null) {
  const emoji = AVATAR_EMOJIS[avatarId || "robot"] || "🤖";
  return [
    { id: "primary", name: employeeName, icon: <span className="text-sm">{emoji}</span>, color: "text-blue-400", emoji },
  ];
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-[#0d0d0d] text-white font-mono uppercase tracking-widest animate-pulse">
        Loading...
      </div>
    }>
      <ChatPageInner />
    </Suspense>
  );
}

function ChatPageInner() {
  const { user, loading: authLoading } = useAuth();
  const [input, setInput] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const hasAutoSelected = useRef(false);
  const [employeeName, setEmployeeName] = useState("Employee Zero");
  const [employeeAvatar, setEmployeeAvatar] = useState<string | null>(null);
  const agents = getAgents(employeeName, employeeAvatar);

  // Track active workflow IDs from both installed + cron
  const [activeWorkflowIds, setActiveWorkflowIds] = useState<string[]>([]);
  useEffect(() => {
    if (!user?.uid) return;
    // Load installed workflows
    getDoc(doc(db, "users", user.uid, "settings", "workflows")).then((snap) => {
      if (snap.exists()) {
        setActiveWorkflowIds(prev => Array.from(new Set([...prev, ...(snap.data().installed || [])])));
      }
    }).catch(() => {});
    // Listen for cron jobs
    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid, "settings", "cron"),
      (snap) => {
        if (snap.exists()) {
          const cronIds = (snap.data().jobs || []).filter((j: any) => j.enabled).map((j: any) => j.workflowId);
          setActiveWorkflowIds(prev => {
            const base = prev.filter(id => !cronIds.includes(id)); // remove stale cron ids
            return Array.from(new Set([...base, ...cronIds]));
          });
        }
      },
      () => {}
    );
    return () => unsubscribe();
  }, [user?.uid]);

  // Rotating workflow suggestions — reshuffle on every new conversation, exclude active
  const [visibleWorkflows, setVisibleWorkflows] = useState<WorkflowSuggestion[]>([]);
  const [wfKey, setWfKey] = useState(0);

  useEffect(() => {
    const available = WORKFLOW_SUGGESTIONS.filter(wf => !activeWorkflowIds.includes(wf.id));
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    setVisibleWorkflows(shuffled.slice(0, 4));
    setWfKey((k) => k + 1);
  }, [activeConvId, activeWorkflowIds]);

  // Handle ?workflow= query param (from workflows page "Run Now")
  const searchParams = useSearchParams();
  const router = useRouter();
  const workflowTriggered = useRef(false);
  useEffect(() => {
    const wfId = searchParams.get("workflow");
    if (!wfId || !user || workflowTriggered.current) return;
    workflowTriggered.current = true;
    // Find workflow name
    const wf = WORKFLOW_SUGGESTIONS.find((w) => w.id === wfId);
    const wfName = wf?.name || wfId;
    const workflowMessage = `Run the ${wfName} workflow`;
    // Create conversation and trigger
    (async () => {
      try {
        const docRef = await addDoc(collection(db, "conversations"), {
          userId: user.uid,
          title: `⚡ ${wfName}`,
          messages: [{ role: "user", content: workflowMessage, timestamp: new Date().toISOString() }],
          status: "running",
          createdAt: Timestamp.now(),
        });
        setActiveConvId(docRef.id);
        authFetch("/api/workflows/run", {
          method: "POST",
          body: JSON.stringify({ conversationId: docRef.id, workflowId: wfId }),
        }).catch((err) => console.error("Workflow API error:", err));
        // Clean up URL
        router.replace("/chat", { scroll: false });
      } catch (err) {
        console.error("Failed to start workflow from URL:", err);
      }
    })();
  }, [searchParams, user]);
  const [selectedAgentId, setSelectedAgentId] = useState("primary");
  const selectedAgent = agents.find(a => a.id === selectedAgentId) || agents[0];
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showHireModal, setShowHireModal] = useState(false);
  const [previewWorkflow, setPreviewWorkflow] = useState<WorkflowSuggestion | null>(null);
  const [foundingCount, setFoundingCount] = useState<number | null>(null);
  const [purchasedAgents, setPurchasedAgents] = useState<AgentDoc[]>([]);
  const [setupAgent, setSetupAgent] = useState<AgentDoc | null>(null);
  const [setupName, setSetupName] = useState("");
  const [setupAvatar, setSetupAvatar] = useState("robot");
  const [shareStatus, setShareStatus] = useState<"idle" | "copied">("idle");
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  const FOUNDING_LIMIT = 100;
  const FOUNDING_PRICE = 29;
  const REGULAR_PRICE = 39;
  const isFoundingAvailable = foundingCount !== null && foundingCount < FOUNDING_LIMIT;
  const slotsRemaining = foundingCount !== null ? Math.max(0, FOUNDING_LIMIT - foundingCount) : null;

  // Build full agents list: primary + purchased
  const allAgents = [
    ...agents,
    ...purchasedAgents
      .filter(a => a.status === "active")
      .map(a => ({
        id: a.id,
        name: a.name,
        icon: <span className="text-sm">{AVATAR_EMOJIS[a.avatar] || "🤖"}</span>,
        color: "text-blue-400" as const,
        emoji: AVATAR_EMOJIS[a.avatar] || "🤖",
      })),
  ];

  // Fetch user profile for employee name
  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.employeeName) setEmployeeName(data.employeeName);
        if (data.avatar) setEmployeeAvatar(data.avatar);
      }
    }).catch((err) => console.warn("Failed to fetch user profile:", err.message));
  }, [user?.uid]);

  // Real-time founding count listener
  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = onSnapshot(
      doc(db, "config", "pricing"),
      (snap) => {
        if (snap.exists()) {
          setFoundingCount(snap.data().foundingCount ?? 0);
        } else {
          setFoundingCount(0);
        }
      },
      (err) => {
        console.warn("Config listener error:", err.message);
        setFoundingCount(0);
      }
    );
    return () => unsubscribe();
  }, [user?.uid]);

  // Listen for purchased agents in subcollection
  useEffect(() => {
    if (!user?.uid) return;
    const agentsRef = collection(db, "users", user.uid, "agents");
    const unsubscribe = onSnapshot(
      agentsRef,
      (snapshot) => {
        const agentList = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data(),
        })) as AgentDoc[];
        setPurchasedAgents(agentList);

        // Auto-open setup modal for any pending agent
        const pending = agentList.find(a => a.status === "pending_setup");
        if (pending) {
          setSetupAgent(pending);
          setSetupName("");
          setSetupAvatar("robot");
        }
      },
      (err) => {
        console.warn("Agents listener error:", err.message);
      }
    );
    return () => unsubscribe();
  }, [user?.uid]);

  // Listen for conversations
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "conversations"),
      where("userId", "==", user.uid)
    );
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const convData = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }) as Conversation)
          .sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
            const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
            return bTime - aTime;
          });
        setConversations(convData);
        
        // Auto-select the most recent conversation on first page load only
        if (!hasAutoSelected.current && convData.length > 0) {
          hasAutoSelected.current = true;
          setActiveConvId(convData[0].id);
        }
      },
      (err) => {
        console.warn("Conversations listener error:", err.message);
      }
    );
    
    return () => unsubscribe();
  }, [user?.uid]);

  // Auto-scroll on message updates
  const activeConv = conversations.find(c => c.id === activeConvId);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeConv?.messages?.length, activeConv?.status]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || !user || submitting) return;

    const message = input.trim();
    setInput("");
    setSubmitting(true);

    try {
      let convId = activeConvId;

      // If no active conversation, create one
      if (!convId) {
        const docRef = await addDoc(collection(db, "conversations"), {
          userId: user.uid,
          title: message.slice(0, 80),
          messages: [{ role: "user", content: message, timestamp: new Date().toISOString() }],
          status: "running",
          createdAt: Timestamp.now(),
        });
        convId = docRef.id;
        setActiveConvId(convId);
      } else {
        // Update status to running
        await updateDoc(doc(db, "conversations", convId), { status: "running" });
      }

      // Fire the chat API (don't await — Firestore listener handles updates)
      authFetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          conversationId: convId,
          message,
          agentName: selectedAgent.name,
        }),
      }).catch((err) => console.error("Chat API error:", err));
    } catch (err) {
      console.error("Failed to submit message", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center font-mono uppercase tracking-widest animate-pulse bg-[#050505] text-white">Initializing Employee Zero...</div>;
  if (!user) return <div className="h-screen flex items-center justify-center bg-[#050505] text-white">Please sign in to access the terminal.</div>;

  return (
    <div className="flex h-screen bg-[#0d0d0d] text-white selection:bg-white selection:text-black overflow-hidden font-sans">
      
      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex-shrink-0 bg-[#000000] flex flex-col border-r border-white/5"
          >
            <div className="p-3 space-y-4">
              <Button 
                variant="ghost" 
                className="w-full justify-between gap-2 border border-white/10 hover:bg-white/5 hover:text-white rounded-lg px-3 py-6 group text-white"
                onClick={() => setActiveConvId(null)}
              >
                <div className="flex items-center gap-3 font-medium">
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-black">
                    <Plus size={14} strokeWidth={3} />
                  </div>
                  New Conversation
                </div>
              </Button>

              <div className="space-y-1">
                <p className="px-3 text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Active Workforce</p>
                {allAgents.map((agent) => (
                    <button
                        key={agent.id}
                        onClick={() => setSelectedAgentId(agent.id)}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group",
                            selectedAgent.id === agent.id ? "bg-white/10 text-white" : "text-neutral-500 hover:bg-white/5 hover:text-neutral-300"
                        )}
                    >
                        <div className={cn("p-1.5 rounded-md bg-white/5 group-hover:bg-white/10 transition-colors", agent.color)}>
                            {agent.icon}
                        </div>
                        <span className="font-medium">{agent.name}</span>
                        {selectedAgent.id === agent.id && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                        )}
                    </button>
                ))}
                <button
                  onClick={() => setShowHireModal(true)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group text-neutral-600 hover:bg-white/5 hover:text-neutral-400 border border-dashed border-white/10 mt-2"
                >
                  <div className="p-1.5 rounded-md bg-white/5 group-hover:bg-white/10 transition-colors">
                    <Plus size={14} />
                  </div>
                  <span className="font-medium">Hire Another Agent</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 pt-0">
              <div className="space-y-1 mt-4">
                <p className="px-3 text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Conversations</p>
                {conversations.slice(0, 20).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveConvId(c.id)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-lg text-[13px] truncate transition-all",
                      activeConvId === c.id ? "bg-white/5 text-white" : "text-neutral-500 hover:text-neutral-300"
                    )}
                  >
                    {c.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Workflows & Connections Links */}
            <div className="p-3 pt-0 space-y-1">
              <Link
                href="/workflows"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-neutral-500 hover:bg-white/5 hover:text-neutral-300 group"
              >
                <div className="p-1.5 rounded-md bg-white/5 group-hover:bg-white/10 transition-colors">
                  <Zap size={14} className="text-amber-400" />
                </div>
                <span className="font-medium">Workflows</span>
              </Link>
              <Link
                href="/cron"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-neutral-500 hover:bg-white/5 hover:text-neutral-300 group"
              >
                <div className="p-1.5 rounded-md bg-white/5 group-hover:bg-white/10 transition-colors">
                  <Clock size={14} className="text-cyan-400" />
                </div>
                <span className="font-medium">Scheduled Jobs</span>
              </Link>
              <Link
                href="/connections"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-neutral-500 hover:bg-white/5 hover:text-neutral-300 group"
              >
                <div className="p-1.5 rounded-md bg-white/5 group-hover:bg-white/10 transition-colors">
                  <Plug size={14} className="text-blue-400" />
                </div>
                <span className="font-medium">Connections</span>
              </Link>
            </div>

            {/* Legal Links */}
            <div className="px-6 pb-2 flex items-center gap-3 text-[10px] text-neutral-600">
              <Link href="/terms" className="hover:text-neutral-400 transition-colors">Terms</Link>
              <span>•</span>
              <Link href="/privacy" className="hover:text-neutral-400 transition-colors">Privacy</Link>
            </div>

            <div className="p-3 border-t border-white/5">
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-neutral-700 to-neutral-500 flex items-center justify-center text-[10px] font-bold">
                  {user.email?.[0].toUpperCase()}
                </div>
                <div className="flex-1 truncate">
                  <p className="text-[13px] font-medium truncate">{user.email}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500">
                    <MoreHorizontal size={14} />
                </Button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0d0d0d] relative">
        
        {/* Header */}
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 z-20 bg-[#0d0d0d]/80 backdrop-blur-md">
            <div className="flex items-center gap-3">
                {!isSidebarOpen && (
                    <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} className="text-neutral-500">
                        <PanelLeftOpen size={18} />
                    </Button>
                )}
                <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-md bg-white/5", selectedAgent.color)}>
                        {selectedAgent.icon}
                    </div>
                    <h2 className="text-sm font-semibold tracking-tight">{selectedAgent.name}</h2>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "text-[12px] font-medium flex items-center gap-1.5 transition-all",
                    shareStatus === "copied" ? "text-emerald-400" : "text-neutral-500 hover:text-neutral-300"
                  )}
                  onClick={async () => {
                    if (!activeConv) return;
                    const text = activeConv.messages.map(m => `${m.role === "user" ? "You" : selectedAgent.name}: ${m.content}`).join("\n\n");
                    const shareText = `--- ${activeConv.title} ---\n\n${text}\n\n— Shared from Employee Zero`;
                    try {
                      await navigator.clipboard.writeText(shareText);
                      setShareStatus("copied");
                      setTimeout(() => setShareStatus("idle"), 2000);
                    } catch {
                      // Fallback: try native share API
                      if (navigator.share) {
                        navigator.share({ title: activeConv.title, text: shareText }).catch(() => {});
                      }
                    }
                  }}
                  disabled={!activeConv}
                >
                  {shareStatus === "copied" ? <><Check size={12} /> Copied!</> : <><Share2 size={12} /> Share</>}
                </Button>
                <div className="h-4 w-px bg-white/10 mx-1" />
                <div className="relative" ref={settingsRef}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-8 w-8 transition-colors", showSettingsMenu ? "text-white bg-white/10" : "text-neutral-500 hover:text-neutral-300")}
                    onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  >
                    <Settings size={16} />
                  </Button>
                  <AnimatePresence>
                    {showSettingsMenu && (
                      <>
                        {/* Invisible backdrop to close */}
                        <div className="fixed inset-0 z-40" onClick={() => setShowSettingsMenu(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: -4, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-10 z-50 w-56 bg-[#151515] border border-white/10 rounded-xl shadow-2xl shadow-black/60 overflow-hidden"
                        >
                          <div className="p-1">
                            {activeConvId && (
                              <button
                                onClick={async () => {
                                  if (!activeConvId) return;
                                  try {
                                    await deleteDoc(doc(db, "conversations", activeConvId));
                                    setActiveConvId(null);
                                  } catch (err) { console.error("Failed to delete:", err); }
                                  setShowSettingsMenu(false);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-neutral-400 hover:text-red-400 hover:bg-red-500/5 transition-all"
                              >
                                <Trash2 size={14} /> Delete Conversation
                              </button>
                            )}
                            <div className="h-px bg-white/5 my-1" />
                            <Link href="/connections" onClick={() => setShowSettingsMenu(false)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-neutral-400 hover:text-white hover:bg-white/5 transition-all">
                              <Plug size={14} /> Connections
                            </Link>
                            <Link href="/workflows" onClick={() => setShowSettingsMenu(false)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-neutral-400 hover:text-white hover:bg-white/5 transition-all">
                              <Zap size={14} /> Workflows
                            </Link>
                            <Link href="/cron" onClick={() => setShowSettingsMenu(false)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-neutral-400 hover:text-white hover:bg-white/5 transition-all">
                              <Clock size={14} /> Scheduled Jobs
                            </Link>
                            <div className="h-px bg-white/5 my-1" />
                            <button
                              onClick={() => { signOut(); setShowSettingsMenu(false); }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-neutral-400 hover:text-red-400 hover:bg-red-500/5 transition-all"
                            >
                              <LogOut size={14} /> Sign Out
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
            </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto" ref={scrollRef}>
          <div className="max-w-3xl mx-auto px-6 py-10">
            {activeConvId && activeConv ? (
              <div className="space-y-8">
                {/* Render all messages in the conversation */}
                {activeConv.messages.map((msg, i) => (
                  <div key={i} className="flex gap-4 group">
                    {msg.role === "user" ? (
                      <div className="w-8 h-8 rounded-full bg-neutral-800 flex-shrink-0 flex items-center justify-center text-xs font-bold mt-1">U</div>
                    ) : (
                      <div className={cn("w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-1", selectedAgent.color, "bg-white/5 border border-white/5")}>{selectedAgent.icon}</div>
                    )}
                    <div className="space-y-2 flex-1">
                      <p className="text-sm font-semibold text-neutral-400">{msg.role === "user" ? "You" : selectedAgent.name}</p>
                      <div className={cn("text-[16px] leading-relaxed whitespace-pre-wrap", msg.role === "user" ? "text-neutral-200" : "text-neutral-100 prose prose-invert max-w-none")}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Loading indicator when waiting for response */}
                {activeConv.status === "running" && (
                  <div className="flex gap-4">
                    <div className={cn("w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-1", selectedAgent.color, "bg-white/5 border border-white/5")}>{selectedAgent.icon}</div>
                    <div className="space-y-4 flex-1">
                      <p className="text-sm font-semibold text-neutral-400">{selectedAgent.name}</p>
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3 text-neutral-500 italic text-sm">
                          <Loader2 size={14} className="animate-spin" />
                          Thinking...
                        </div>
                        <div className="space-y-2">
                          <div className="h-3 bg-white/5 rounded-full w-3/4 animate-pulse" />
                          <div className="h-3 bg-white/5 rounded-full w-1/2 animate-pulse" />
                          <div className="h-3 bg-white/5 rounded-full w-2/3 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-8 pt-20">
                <div className="relative">
                    <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl relative z-10", selectedAgent.color, "bg-white/5 border border-white/10")}>
                        {selectedAgent.id === "primary" ? <span className="text-4xl">{(selectedAgent as any).emoji || "🤖"}</span> : selectedAgent.icon}
                    </div>
                    <div className="absolute inset-0 bg-white/5 blur-3xl rounded-full -z-10" />
                </div>
                <div className="space-y-3">
                    <h1 className="text-3xl font-bold tracking-tight">How can {selectedAgent.name} help you today?</h1>
                    <p className="text-neutral-500 max-w-sm mx-auto text-sm">Deploy an autonomous mission to scale your tactical operations.</p>
                </div>
                {/* Rotating Workflow Suggestions */}
                <div className="w-full max-w-2xl pt-4">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Workflow Suggestions</p>
                    <Link href="/workflows" className="text-[10px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition-colors">
                      View all <ChevronRight size={10} />
                    </Link>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={wfKey}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="grid grid-cols-2 gap-3"
                    >
                      {visibleWorkflows.map((wf) => (
                        <button
                          key={wf.id}
                          onClick={() => setPreviewWorkflow(wf)}
                          className="text-left p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all group cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 mb-2">
                            <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br border flex items-center justify-center flex-shrink-0", wf.iconBg)}>
                              {wf.icon}
                            </div>
                            <span className="font-semibold text-[13px] text-neutral-200 group-hover:text-white transition-colors">{wf.name}</span>
                          </div>
                          <p className="text-[12px] text-neutral-500 leading-relaxed mb-2">{wf.tagline}</p>
                          <div className="flex gap-1.5">
                            {wf.skills.slice(0, 2).map((s) => (
                              <span key={s} className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-neutral-500">{s}</span>
                            ))}
                            {wf.skills.length > 2 && (
                              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-neutral-500">+{wf.skills.length - 2}</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-6 pt-0">
          <div className="max-w-3xl mx-auto relative group">
            <form onSubmit={handleSubmit} className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                    }
                }}
                placeholder={`Message ${selectedAgent.name}...`}
                className="w-full bg-[#171717] border border-white/10 rounded-2xl py-4 pl-4 pr-14 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-transparent transition-all min-h-[60px] max-h-[200px] resize-none text-[15px] placeholder:text-neutral-600 shadow-2xl"
              />
              <div className="absolute right-3 bottom-3">
                <Button 
                    type="submit" 
                    disabled={!input.trim() || submitting}
                    size="icon"
                    className={cn(
                        "h-8 w-8 rounded-xl transition-all",
                        input.trim() ? "bg-white text-black hover:bg-neutral-200" : "bg-white/5 text-neutral-600"
                    )}
                >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={18} strokeWidth={2.5} />}
                </Button>
              </div>
            </form>
            <p className="mt-3 text-[11px] text-neutral-600 text-center flex items-center justify-center gap-1.5 font-medium">
                <Sparkles size={10} /> {selectedAgent.name} can provide tactical intelligence but should be verified.
            </p>
          </div>
        </div>
      </main>

      {/* Workflow Preview Modal */}
      <AnimatePresence>
        {previewWorkflow && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            onClick={() => setPreviewWorkflow(null)}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md bg-[#111111] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/50"
            >
              {/* Close */}
              <button
                onClick={() => setPreviewWorkflow(null)}
                className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors p-1"
              >
                <X size={18} />
              </button>

              {/* Icon + Title */}
              <div className="flex items-center gap-4 mb-5">
                <div className={cn("w-14 h-14 rounded-2xl bg-gradient-to-br border flex items-center justify-center", previewWorkflow.iconBg)}>
                  {previewWorkflow.icon}
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">{previewWorkflow.name}</h2>
                  <p className="text-sm text-neutral-400">{previewWorkflow.tagline}</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-neutral-300 leading-relaxed mb-6">
                {previewWorkflow.description}
              </p>

              {/* Skills */}
              <div className="mb-5">
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Included Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {previewWorkflow.skills.map((skill) => (
                    <span key={skill} className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-300 flex items-center gap-1">
                      <Sparkles size={10} className="text-purple-400" />
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Connections */}
              <div className="mb-5">
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Required Connections</p>
                <div className="flex flex-wrap gap-1.5">
                  {previewWorkflow.connections.map((conn) => (
                    <span key={conn} className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-blue-500/5 border border-blue-500/15 text-blue-300 flex items-center gap-1.5">
                      <span className="text-xs">{CONNECTION_ICONS[conn] || "🔗"}</span>
                      {conn}
                    </span>
                  ))}
                </div>
              </div>

              {/* Frequency */}
              <div className="flex items-center gap-2 mb-8 text-sm text-neutral-400">
                <Clock size={14} className="text-neutral-500" />
                <span>Runs: <strong className="text-neutral-200">{previewWorkflow.frequency}</strong></span>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    if (!user || submitting) return;
                    const wf = previewWorkflow;
                    setPreviewWorkflow(null);
                    const workflowMessage = `Run the ${wf.name} workflow`;
                    setInput("");
                    setSubmitting(true);
                    try {
                      const docRef = await addDoc(collection(db, "conversations"), {
                        userId: user.uid,
                        title: `⚡ ${wf.name}`,
                        messages: [{ role: "user", content: workflowMessage, timestamp: new Date().toISOString() }],
                        status: "running",
                        createdAt: Timestamp.now(),
                      });
                      setActiveConvId(docRef.id);
                      authFetch("/api/workflows/run", {
                        method: "POST",
                        body: JSON.stringify({ conversationId: docRef.id, workflowId: wf.id }),
                      }).catch((err) => console.error("Workflow API error:", err));
                    } catch (err) {
                      console.error("Failed to start workflow:", err);
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  disabled={submitting}
                  className="flex-1 py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 bg-white text-black hover:bg-neutral-200 disabled:opacity-50"
                >
                  <Zap size={14} /> Run Now
                </button>
                <Link
                  href="/workflows"
                  onClick={() => setPreviewWorkflow(null)}
                  className="px-5 py-3.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-neutral-300 hover:bg-white/10"
                >
                  View All →
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hire Agent Modal */}
      <AnimatePresence>
        {showHireModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            onClick={() => setShowHireModal(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md bg-[#111111] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/50"
            >
              {/* Close */}
              <button
                onClick={() => setShowHireModal(false)}
                className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors p-1"
              >
                <X size={18} />
              </button>

              {/* Header */}
              <div className="text-center space-y-4 mb-8">
                <div className="mx-auto w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
                  <Users size={28} className="text-blue-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Hire another agent</h2>
                  <p className="text-neutral-500 text-sm mt-2 max-w-xs mx-auto">
                    Expand your workforce with a specialized AI employee that works 24/7 alongside {employeeName}.
                  </p>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-3 mb-8">
                {[
                  "Dedicated AI that learns your workflows",
                  "Runs tasks in parallel with your existing agent",
                  "Custom name, avatar, and personality",
                  "Separate memory and conversation history",
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <Check size={12} className="text-blue-400" />
                    </div>
                    <span className="text-sm text-neutral-300">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Pricing */}
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 mb-6">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-xs text-neutral-500 font-mono uppercase tracking-widest mb-1">Per Agent</p>
                    <div className="flex items-baseline gap-1">
                      {isFoundingAvailable ? (
                        <>
                          <span className="text-3xl font-bold">${FOUNDING_PRICE}</span>
                          <span className="text-neutral-500 text-sm">/month</span>
                          <span className="text-neutral-600 text-sm line-through ml-2">${REGULAR_PRICE}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-3xl font-bold">${REGULAR_PRICE}</span>
                          <span className="text-neutral-500 text-sm">/month</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {isFoundingAvailable ? (
                      <>
                        <p className="text-xs text-emerald-400 font-medium">Founding price</p>
                        <p className="text-xs text-neutral-600">Locked forever</p>
                        <p className="text-[10px] text-amber-400/80 font-mono mt-1">{slotsRemaining} of {FOUNDING_LIMIT} left</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-neutral-400 font-medium">Standard price</p>
                        <p className="text-xs text-neutral-600">Founding slots filled</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* CTA */}
              <Button
                className="w-full h-14 bg-white text-black hover:bg-neutral-200 text-base font-bold rounded-2xl transition-all"
                onClick={async () => {
                  try {
                    const res = await authFetch("/api/checkout", {
                      method: "POST",
                      body: JSON.stringify({
                        email: user.email,
                      }),
                    });
                    const data = await res.json();
                    if (data.url) {
                      window.location.href = data.url;
                    } else {
                      console.error("Checkout error:", data.error);
                    }
                  } catch (err) {
                    console.error("Failed to start checkout:", err);
                  }
                }}
              >
                Add to Workforce
              </Button>
              <p className="text-center text-[10px] text-neutral-600 mt-3 font-mono uppercase tracking-wider">
                Cancel anytime • No long-term commitment
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Agent Setup Modal - auto-triggered after purchase */}
      <AnimatePresence>
        {setupAgent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md bg-[#111111] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/50"
            >
              <div className="text-center space-y-4 mb-8">
                <div className="mx-auto w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-3xl">
                  {AVATAR_EMOJIS[setupAvatar] || "🤖"}
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Set up your new agent</h2>
                  <p className="text-neutral-500 text-sm mt-2">Give your new hire a name and identity.</p>
                </div>
              </div>

              <div className="space-y-6 mb-8">
                <div>
                  <label className="text-xs text-neutral-500 font-mono uppercase tracking-widest block mb-2">Agent Name</label>
                  <input
                    type="text"
                    value={setupName}
                    onChange={(e) => setSetupName(e.target.value)}
                    placeholder="e.g. Atlas, Echo, Sage..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 font-mono uppercase tracking-widest block mb-2">Choose Avatar</label>
                  <div className="grid grid-cols-5 gap-2">
                    {Object.entries(AVATAR_EMOJIS).map(([key, emoji]) => (
                      <button
                        key={key}
                        onClick={() => setSetupAvatar(key)}
                        className={cn(
                          "w-full aspect-square rounded-xl text-2xl flex items-center justify-center transition-all border",
                          setupAvatar === key
                            ? "bg-blue-500/20 border-blue-500 scale-110 shadow-lg shadow-blue-500/20"
                            : "bg-white/5 border-white/10 hover:bg-white/10"
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                disabled={!setupName.trim()}
                className="w-full h-14 bg-white text-black hover:bg-neutral-200 text-base font-bold rounded-2xl transition-all disabled:opacity-30"
                onClick={async () => {
                  if (!setupAgent || !setupName.trim() || !user) return;
                  try {
                    await updateDoc(
                      doc(db, "users", user.uid, "agents", setupAgent.id),
                      {
                        name: setupName.trim(),
                        avatar: setupAvatar,
                        status: "active",
                      }
                    );
                    setSetupAgent(null);
                  } catch (err) {
                    console.error("Failed to set up agent:", err);
                  }
                }}
              >
                Activate Agent
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
