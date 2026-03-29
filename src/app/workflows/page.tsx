"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { authFetch } from "@/lib/authFetch";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Zap,
  Mail,
  Calendar,
  FileSpreadsheet,
  TrendingUp,
  MessageSquare,
  Users,
  BarChart3,
  Shield,
  Clock,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Star,
  Globe,
  Target,
  Briefcase,
  Send,
  Search,
  Loader2,
  X,
  Check,
  ListTodo,
  FileText,
  Store,
  ClipboardList,
  Presentation,
} from "lucide-react";

/* ─── Workflow Data ─── */

interface Workflow {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  skills: string[];
  connections: string[];
  frequency: string;
  category: "productivity" | "sales" | "marketing" | "operations";
  tier: 1 | 2 | 3;
}

const WORKFLOWS: Workflow[] = [
  // Tier 1 — Core Productivity
  {
    id: "morning-briefing",
    name: "Morning Briefing",
    tagline: "Start every day knowing exactly what matters",
    description: "Scans your email, calendar, and files every morning. Delivers a prioritized summary with today's meetings, urgent emails, and suggested priorities — straight to your chat.",
    icon: <Sparkles size={20} />,
    iconBg: "from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400",
    skills: ["Email Scanning", "Calendar Analysis", "Priority Scoring"],
    connections: ["Gmail", "Google Calendar"],
    frequency: "Daily at your wake-up time",
    category: "productivity",
    tier: 1,
  },
  {
    id: "inbox-commander",
    name: "Inbox Commander",
    tagline: "Your inbox, triaged and handled",
    description: "Categorizes every email as urgent, action-needed, FYI, or noise. Drafts replies for urgent items, auto-archives junk, and delivers a clean digest every 30 minutes.",
    icon: <Mail size={20} />,
    iconBg: "from-red-500/20 to-pink-500/20 border-red-500/30 text-red-400",
    skills: ["Email Triage", "Auto-Reply Drafting", "Smart Archiving", "Spam Detection"],
    connections: ["Gmail"],
    frequency: "Every 30 minutes",
    category: "productivity",
    tier: 1,
  },
  {
    id: "meeting-prep",
    name: "Meeting Prep",
    tagline: "Walk into every meeting already informed",
    description: "15 minutes before each meeting, researches attendees by checking past email threads and CRM notes. Generates a briefing with context, talking points, and open items.",
    icon: <Users size={20} />,
    iconBg: "from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400",
    skills: ["Attendee Research", "Email History Search", "Talking Point Generation"],
    connections: ["Gmail", "Google Calendar"],
    frequency: "Before every meeting",
    category: "productivity",
    tier: 1,
  },
  {
    id: "eod-wrapup",
    name: "End-of-Day Wrap-Up",
    tagline: "Close every day with clarity",
    description: "Reviews everything from today — emails sent, meetings attended, tasks completed. Generates a summary and sets tomorrow's top 3 priorities automatically.",
    icon: <Clock size={20} />,
    iconBg: "from-purple-500/20 to-violet-500/20 border-purple-500/30 text-purple-400",
    skills: ["Daily Activity Review", "Priority Setting", "Summary Generation"],
    connections: ["Gmail", "Google Calendar"],
    frequency: "Daily at your chosen time",
    category: "productivity",
    tier: 1,
  },

  // Tier 2 — Sales & Revenue
  {
    id: "lead-tracker",
    name: "Lead Tracker & Follow-Up",
    tagline: "Never lose a lead again",
    description: "Detects new leads from form submissions and inquiry emails. Logs them to a Google Sheet CRM, enriches with research, and sends a multi-day personalized follow-up sequence.",
    icon: <Target size={20} />,
    iconBg: "from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400",
    skills: ["Lead Detection", "Contact Enrichment", "Follow-Up Sequences", "CRM Logging"],
    connections: ["Gmail", "Google Sheets"],
    frequency: "Continuous monitoring",
    category: "sales",
    tier: 2,
  },
  {
    id: "appointment-scheduler",
    name: "Appointment Scheduler",
    tagline: "Clients book via email — no Calendly needed",
    description: "When someone emails to schedule a meeting, your agent checks your calendar, proposes available times, handles back-and-forth, and books it. All via email — zero friction.",
    icon: <Calendar size={20} />,
    iconBg: "from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400",
    skills: ["Availability Check", "Time Proposal", "Email Negotiation", "Booking Confirmation"],
    connections: ["Gmail", "Google Calendar"],
    frequency: "Email-triggered",
    category: "sales",
    tier: 2,
  },
  {
    id: "review-responder",
    name: "Customer Review Responder",
    tagline: "Every review gets a thoughtful reply",
    description: "Monitors for review notifications from Google Business, Yelp, and app stores. Drafts professional responses — thanks for positive reviews, empathetic + constructive for negative ones.",
    icon: <Star size={20} />,
    iconBg: "from-yellow-500/20 to-amber-500/20 border-yellow-500/30 text-yellow-400",
    skills: ["Review Detection", "Sentiment Analysis", "Response Drafting", "Brand Voice Match"],
    connections: ["Gmail"],
    frequency: "Every 2 hours",
    category: "sales",
    tier: 2,
  },
  {
    id: "client-onboarding",
    name: "Client Onboarding Sequence",
    tagline: "New client? The first 14 days are handled",
    description: "When you add a new client to your Sheet, triggers a welcome sequence: Day 1 welcome + setup guide, Day 3 tips, Day 7 check-in, Day 14 feedback request. Adapts based on engagement.",
    icon: <Send size={20} />,
    iconBg: "from-teal-500/20 to-cyan-500/20 border-teal-500/30 text-teal-400",
    skills: ["Sequence Automation", "Engagement Tracking", "Personalized Email", "Timing Optimization"],
    connections: ["Gmail", "Google Sheets"],
    frequency: "Triggered by new client entry",
    category: "sales",
    tier: 2,
  },

  // Tier 2 — Operations
  {
    id: "invoice-tracker",
    name: "Invoice & Expense Tracker",
    tagline: "Every dollar tracked, tax season handled",
    description: "Scans email for invoices, receipts, and payment confirmations. Extracts amounts, vendors, due dates. Logs to a categorized Google Sheet. Alerts on upcoming payments.",
    icon: <FileSpreadsheet size={20} />,
    iconBg: "from-green-500/20 to-lime-500/20 border-green-500/30 text-green-400",
    skills: ["Invoice Detection", "Data Extraction", "Categorization", "Due Date Alerts"],
    connections: ["Gmail", "Google Sheets"],
    frequency: "Daily at 6 PM",
    category: "operations",
    tier: 2,
  },
  {
    id: "weekly-report",
    name: "Weekly Report Builder",
    tagline: "One-click executive summary, every Monday",
    description: "Compiles your week's email activity, meetings held, leads generated, and expenses into a polished report. Tracks trends week-over-week and highlights wins.",
    icon: <BarChart3 size={20} />,
    iconBg: "from-indigo-500/20 to-purple-500/20 border-indigo-500/30 text-indigo-400",
    skills: ["Data Aggregation", "Trend Analysis", "Report Generation", "KPI Tracking"],
    connections: ["Gmail", "Google Calendar", "Google Sheets"],
    frequency: "Weekly on Monday",
    category: "operations",
    tier: 2,
  },

  // Tier 3 — Marketing
  {
    id: "content-calendar",
    name: "Content Calendar Manager",
    tagline: "A week of content planned in 10 seconds",
    description: "Given your brand voice and topic pillars, generates a full week of social media post drafts into a Google Sheet. You review and approve — agent handles the rest.",
    icon: <Globe size={20} />,
    iconBg: "from-pink-500/20 to-rose-500/20 border-pink-500/30 text-pink-400",
    skills: ["Trend Research", "Copy Generation", "Platform Adaptation", "Calendar Planning"],
    connections: ["Google Sheets"],
    frequency: "Weekly on Sunday",
    category: "marketing",
    tier: 3,
  },
  {
    id: "competitor-intel",
    name: "Competitor Intelligence",
    tagline: "Know what others are doing before they announce it",
    description: "Monitors competitor websites, social accounts, and press daily. Surfaces pricing changes, new products, key hires, and content strategy shifts in a weekly digest.",
    icon: <Search size={20} />,
    iconBg: "from-orange-500/20 to-red-500/20 border-orange-500/30 text-orange-400",
    skills: ["Web Monitoring", "Change Detection", "Competitive Analysis", "Digest Generation"],
    connections: ["Google Sheets"],
    frequency: "Daily scans, weekly digest",
    category: "marketing",
    tier: 3,
  },
  {
    id: "social-autopilot",
    name: "Social Media Autopilot",
    tagline: "Create once, publish everywhere",
    description: "Takes your approved content, adapts it for each platform (hashtags for IG, thread format for X, professional tone for LinkedIn), publishes on schedule, and reports engagement.",
    icon: <TrendingUp size={20} />,
    iconBg: "from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-400",
    skills: ["Platform Adaptation", "Scheduling", "Engagement Monitoring", "Performance Reports"],
    connections: ["Google Sheets", "X / Twitter", "LinkedIn"],
    frequency: "Per content calendar",
    category: "marketing",
    tier: 3,
  },
  {
    id: "business-pulse",
    name: "Business Pulse Dashboard",
    tagline: "\"How's business?\" — answered instantly",
    description: "On-demand or weekly. Pulls revenue, leads, meetings, email volume, and expenses into a single-page business health report with month-over-month trends and AI insights.",
    icon: <Briefcase size={20} />,
    iconBg: "from-violet-500/20 to-purple-500/20 border-violet-500/30 text-violet-400",
    skills: ["Data Aggregation", "Trend Analysis", "Insight Generation", "Report Formatting"],
    connections: ["Gmail", "Google Calendar", "Google Sheets"],
    frequency: "Weekly or on-demand",
    category: "operations",
    tier: 3,
  },

  // ─── NEW GOOGLE SERVICES WORKFLOWS ───
  {
    id: "task-master",
    name: "Task Master",
    tagline: "Turn emails into tasks, stay organized automatically",
    description: "Scans your inbox for action items and creates Google Tasks automatically. Cross-references with your calendar to align priorities. Clears completed tasks and recommends your top 3 focus areas daily.",
    icon: <ListTodo size={20} />,
    iconBg: "from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-400",
    skills: ["Email Action Detection", "Task Creation", "Calendar Alignment", "Priority Scoring"],
    connections: ["Google Tasks", "Gmail", "Google Calendar"],
    frequency: "Daily at 8 AM",
    category: "productivity",
    tier: 1,
  },
  {
    id: "auto-report-generator",
    name: "Auto Report Generator",
    tagline: "Professional weekly reports, written for you",
    description: "Compiles emails, meetings, analytics, and social media data into a polished Google Doc. Includes executive summary, key communications, action items, and data-driven recommendations.",
    icon: <FileText size={20} />,
    iconBg: "from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400",
    skills: ["Data Aggregation", "Document Creation", "Report Formatting", "Insight Generation"],
    connections: ["Google Docs", "Gmail", "Google Calendar"],
    frequency: "Weekly on Monday",
    category: "operations",
    tier: 2,
  },
  {
    id: "review-guardian",
    name: "Review Guardian",
    tagline: "Every Google review replied to professionally",
    description: "Monitors your Google Business Profile for new reviews. Crafts personalized, brand-appropriate replies — warm thanks for positive, empathetic responses for negative. Sends you a daily review digest.",
    icon: <Store size={20} />,
    iconBg: "from-yellow-500/20 to-orange-500/20 border-yellow-500/30 text-yellow-400",
    skills: ["Review Monitoring", "Sentiment Analysis", "Response Drafting", "Brand Voice"],
    connections: ["Google Business Profile"],
    frequency: "Every 2 hours",
    category: "sales",
    tier: 2,
  },
  {
    id: "website-performance",
    name: "Website Performance",
    tagline: "Know exactly how your website is performing",
    description: "Pulls real-time and historical data from Google Analytics. Analyzes traffic sources, top pages, device split, geographic reach, and bounce rates. Delivers actionable SEO and content recommendations.",
    icon: <BarChart3 size={20} />,
    iconBg: "from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400",
    skills: ["Traffic Analysis", "Trend Detection", "SEO Insights", "Performance Benchmarking"],
    connections: ["Google Analytics"],
    frequency: "Weekly on Monday",
    category: "operations",
    tier: 2,
  },
  {
    id: "survey-creator",
    name: "Survey Creator",
    tagline: "Customer feedback forms built in seconds",
    description: "Creates professional NPS and satisfaction surveys using Google Forms. Adds well-structured questions, generates a share URL, and drafts an email invitation — ready for your approval before sending.",
    icon: <ClipboardList size={20} />,
    iconBg: "from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400",
    skills: ["Survey Design", "Question Optimization", "Email Drafting", "Response Collection"],
    connections: ["Google Forms", "Gmail"],
    frequency: "On-demand",
    category: "sales",
    tier: 2,
  },
  {
    id: "pitch-deck-builder",
    name: "Pitch Deck Builder",
    tagline: "A professional presentation in one command",
    description: "Creates an 8-slide business presentation in Google Slides. Covers problem, solution, features, market opportunity, business model, traction, and contact. You review and customize — the foundation is done.",
    icon: <Presentation size={20} />,
    iconBg: "from-orange-500/20 to-amber-500/20 border-orange-500/30 text-orange-400",
    skills: ["Presentation Design", "Content Generation", "Market Research", "Slide Formatting"],
    connections: ["Google Slides"],
    frequency: "On-demand",
    category: "marketing",
    tier: 3,
  },
  {
    id: "meeting-minutes-doc",
    name: "Meeting Minutes Doc",
    tagline: "Structured meeting docs, created automatically",
    description: "After each meeting, creates a Google Doc with attendee list, agenda, discussion notes template, action items, and next steps. Sends the doc link to all attendees and creates follow-up tasks.",
    icon: <Calendar size={20} />,
    iconBg: "from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400",
    skills: ["Document Templates", "Attendee Extraction", "Task Creation", "Email Distribution"],
    connections: ["Google Docs", "Google Calendar", "Google Tasks"],
    frequency: "Daily at 6 PM",
    category: "productivity",
    tier: 2,
  },
  {
    id: "client-feedback-analyzer",
    name: "Client Feedback Analyzer",
    tagline: "All feedback sources analyzed in one report",
    description: "Aggregates feedback from Google Forms, Business Profile reviews, and email. Performs sentiment analysis, identifies recurring themes, and produces a comprehensive analysis document with actionable recommendations.",
    icon: <Search size={20} />,
    iconBg: "from-emerald-500/20 to-green-500/20 border-emerald-500/30 text-emerald-400",
    skills: ["Sentiment Analysis", "Theme Detection", "Report Creation", "Trend Tracking"],
    connections: ["Google Forms", "Google Business Profile", "Gmail"],
    frequency: "Weekly on Monday",
    category: "operations",
    tier: 3,
  },
];

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  productivity: { label: "Productivity", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  sales: { label: "Sales & CRM", color: "text-green-400 bg-green-500/10 border-green-500/20" },
  marketing: { label: "Marketing", color: "text-pink-400 bg-pink-500/10 border-pink-500/20" },
  operations: { label: "Operations", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
};

const CONNECTION_ICONS: Record<string, string> = {
  "Gmail": "📧",
  "Google Calendar": "📅",
  "Google Sheets": "📊",
  "Google Drive": "📂",
  "Google Tasks": "✅",
  "Google Docs": "📝",
  "Google Forms": "📋",
  "Google Slides": "📑",
  "Google Analytics": "📈",
  "Google Business Profile": "🏪",
  "X / Twitter": "𝕏",
  "LinkedIn": "💼",
};

/* ─── Component ─── */

export default function WorkflowsPage() {
  const { user, loading: authLoading } = useAuth();
  const [installedIds, setInstalledIds] = useState<string[]>([]);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [customWorkflows, setCustomWorkflows] = useState<any[]>([]);
  const [customLoading, setCustomLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  // Load installed workflows
  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, "users", user.uid, "settings", "workflows")).then((snap) => {
      if (snap.exists()) {
        setInstalledIds(snap.data().installed || []);
      }
    }).catch(() => {});
  }, [user?.uid]);

  // Load custom workflows
  useEffect(() => {
    if (!user?.uid) return;
    setCustomLoading(true);
    authFetch("/api/workflows")
      .then((res) => res.json())
      .then((data) => setCustomWorkflows(data.workflows || []))
      .catch(() => {})
      .finally(() => setCustomLoading(false));
  }, [user?.uid]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const installWorkflow = async (workflowId: string) => {
    if (!user?.uid) return;
    setInstallingId(workflowId);
    try {
      const ref = doc(db, "users", user.uid, "settings", "workflows");
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await updateDoc(ref, { installed: arrayUnion(workflowId) });
      } else {
        await setDoc(ref, { installed: [workflowId] });
      }
      setInstalledIds((prev) => [...prev, workflowId]);
      const wf = WORKFLOWS.find((w) => w.id === workflowId);
      setToast({ message: `${wf?.name || "Workflow"} activated!`, type: "success" });
    } catch (err) {
      console.error("Failed to install workflow:", err);
      setToast({ message: "Failed to activate. Try again.", type: "error" });
    } finally {
      setInstallingId(null);
    }
  };

  const uninstallWorkflow = async (workflowId: string) => {
    if (!user?.uid) return;
    setInstallingId(workflowId);
    try {
      await updateDoc(doc(db, "users", user.uid, "settings", "workflows"), {
        installed: arrayRemove(workflowId),
      });
      setInstalledIds((prev) => prev.filter((id) => id !== workflowId));
      const wf = WORKFLOWS.find((w) => w.id === workflowId);
      setToast({ message: `${wf?.name || "Workflow"} deactivated.`, type: "success" });
    } catch (err) {
      console.error("Failed to uninstall workflow:", err);
      setToast({ message: "Failed to deactivate. Try again.", type: "error" });
    } finally {
      setInstallingId(null);
    }
  };

  const filtered = filter === "all" ? WORKFLOWS : WORKFLOWS.filter((w) => w.category === filter);
  const installedCount = installedIds.length;

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
        <Link href="/login" className="text-blue-400 hover:underline">Sign in</Link> to browse workflows.
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

      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#0d0d0d]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/chat"
              className="p-2 -ml-2 rounded-xl hover:bg-white/5 transition-colors text-neutral-500 hover:text-white"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <Zap size={18} className="text-amber-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Workflows</h1>
                <p className="text-xs text-neutral-500">One-click automations for your business</p>
              </div>
            </div>
          </div>
          {installedCount > 0 && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
              <CheckCircle2 size={12} />
              {installedCount} active
            </div>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* ─── My Custom Workflows ─── */}
        {(customWorkflows.length > 0 || customLoading) && (
          <div className="mb-10">
            <h2 className="text-lg font-bold tracking-tight mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-purple-400" />
              My Workflows
            </h2>
            {customLoading ? (
              <div className="flex items-center gap-2 text-neutral-500 text-sm">
                <Loader2 size={14} className="animate-spin" /> Loading...
              </div>
            ) : (
              <div className="grid gap-3">
                {customWorkflows.map((cw) => (
                  <div
                    key={cw.id}
                    className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 flex items-center gap-4"
                  >
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 text-purple-400">
                      <Zap size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{cw.name}</p>
                      <p className="text-xs text-neutral-500 truncate">{cw.description}</p>
                      {cw.lastRunAt && (
                        <p className="text-[10px] text-neutral-600 mt-1">
                          Last run: {new Date(cw.lastRunAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => {
                          // Navigate to chat and trigger workflow execution
                          router.push(`/chat?runCustomWorkflow=${cw.id}&workflowName=${encodeURIComponent(cw.name)}`);
                        }}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 text-purple-400 transition-all"
                      >
                        Run
                      </button>
                      <button
                        onClick={async () => {
                          if (!user?.uid) return;
                          setDeletingId(cw.id);
                          try {
                            await authFetch("/api/workflows", {
                              method: "DELETE",
                              body: JSON.stringify({ workflowId: cw.id }),
                            });
                            setCustomWorkflows((prev) => prev.filter((w) => w.id !== cw.id));
                            setToast({ message: `"${cw.name}" deleted.`, type: "success" });
                          } catch {
                            setToast({ message: "Failed to delete.", type: "error" });
                          } finally {
                            setDeletingId(null);
                          }
                        }}
                        disabled={deletingId === cw.id}
                        className="text-[11px] text-red-400/70 hover:text-red-400 font-medium transition-colors"
                      >
                        {deletingId === cw.id ? "..." : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {[
            { id: "all", label: "All Workflows" },
            { id: "productivity", label: "Productivity" },
            { id: "sales", label: "Sales & CRM" },
            { id: "marketing", label: "Marketing" },
            { id: "operations", label: "Operations" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                filter === f.id
                  ? "bg-white text-black"
                  : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white border border-white/5"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Workflow Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((wf, i) => {
            const isInstalled = installedIds.includes(wf.id);
            const isInstalling = installingId === wf.id;
            const isExpanded = expandedId === wf.id;
            const cat = CATEGORY_LABELS[wf.category];

            return (
              <motion.div
                key={wf.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "relative rounded-2xl border overflow-hidden transition-all group",
                  isInstalled
                    ? "border-emerald-500/20 bg-emerald-500/[0.03]"
                    : "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"
                )}
              >
                {/* Active indicator */}
                {isInstalled && (
                  <div className="absolute top-3 right-3 z-10">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active
                    </div>
                  </div>
                )}

                {/* Main Card Content */}
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : wf.id)}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={cn(
                      "w-12 h-12 rounded-xl bg-gradient-to-br border flex items-center justify-center flex-shrink-0",
                      wf.iconBg
                    )}>
                      {wf.icon}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0 pr-16">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-[15px] tracking-tight">{wf.name}</h3>
                      </div>
                      <p className="text-sm text-neutral-400 leading-relaxed">{wf.tagline}</p>

                      {/* Skills pills */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {wf.skills.slice(0, 3).map((skill) => (
                          <span
                            key={skill}
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-neutral-400"
                          >
                            {skill}
                          </span>
                        ))}
                        {wf.skills.length > 3 && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-neutral-500">
                            +{wf.skills.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      {/* Category badge */}
                      <span className={cn("text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border", cat.color)}>
                        {cat.label}
                      </span>
                      {/* Frequency */}
                      <span className="text-[11px] text-neutral-500 flex items-center gap-1">
                        <Clock size={10} />
                        {wf.frequency}
                      </span>
                    </div>
                    <ChevronRight
                      size={14}
                      className={cn(
                        "text-neutral-600 transition-transform",
                        isExpanded && "rotate-90"
                      )}
                    />
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 space-y-4 border-t border-white/5">
                        {/* Description */}
                        <p className="text-sm text-neutral-300 leading-relaxed pt-4">
                          {wf.description}
                        </p>

                        {/* All Skills */}
                        <div>
                          <p className="text-[10px] text-neutral-600 font-mono uppercase tracking-widest mb-2">Included Skills</p>
                          <div className="flex flex-wrap gap-1.5">
                            {wf.skills.map((skill) => (
                              <span
                                key={skill}
                                className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-neutral-300 flex items-center gap-1.5"
                              >
                                <Sparkles size={9} className="text-amber-400" />
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Required Connections */}
                        <div>
                          <p className="text-[10px] text-neutral-600 font-mono uppercase tracking-widest mb-2">Required Connections</p>
                          <div className="flex flex-wrap gap-2">
                            {wf.connections.map((conn) => (
                              <span
                                key={conn}
                                className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-blue-500/5 border border-blue-500/15 text-blue-300 flex items-center gap-1.5"
                              >
                                <span className="text-xs">{CONNECTION_ICONS[conn] || "🔗"}</span>
                                {conn}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          {/* Run Now */}
                          <Link
                            href={`/chat?workflow=${wf.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 bg-white text-black hover:bg-neutral-200"
                          >
                            <Zap size={14} /> Run Now
                          </Link>
                          {/* Activate / Deactivate */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              isInstalled ? uninstallWorkflow(wf.id) : installWorkflow(wf.id);
                            }}
                            disabled={isInstalling}
                            className={cn(
                              "flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
                              isInstalling && "opacity-50 cursor-not-allowed",
                              isInstalled
                                ? "bg-white/5 border border-white/10 text-neutral-400 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400"
                                : "bg-white/5 border border-white/10 text-neutral-300 hover:bg-white/10"
                            )}
                          >
                            {isInstalling ? (
                              <><Loader2 size={14} className="animate-spin" /> Processing...</>
                            ) : isInstalled ? (
                              <><X size={14} /> Deactivate</>
                            ) : (
                              <><CheckCircle2 size={14} /> Activate</>
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-neutral-500">
            <Shield size={12} />
            All workflows run securely using your connected accounts
          </div>
          <p className="text-xs text-neutral-600 mt-3">
            Need a custom workflow? <Link href="/chat" className="text-blue-400 hover:underline">Tell your agent</Link> and it'll build one for you.
          </p>
        </div>
      </div>
    </div>
  );
}
