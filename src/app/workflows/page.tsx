"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { authFetch } from "@/lib/authFetch";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot, collection } from "firebase/firestore";
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
  Pencil,
  Trash2,
  Wrench,
  Layers,
  GitBranch,
  Plus,
  ChevronDown,
  ChevronUp,
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
  const [cronJobIds, setCronJobIds] = useState<string[]>([]);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [customWorkflows, setCustomWorkflows] = useState<any[]>([]);
  const [customLoading, setCustomLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  const [purchasedAgents, setPurchasedAgents] = useState<any[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newGoal, setNewGoal] = useState("");
  const [newSchedule, setNewSchedule] = useState("");
  const [selectedConnections, setSelectedConnections] = useState<string[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState("company");
  const [creatingWorkflow, setCreatingWorkflow] = useState(false);

  // Edit modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editGoal, setEditGoal] = useState("");
  const [editSchedule, setEditSchedule] = useState("");
  const [editConnections, setEditConnections] = useState<string[]>([]);
  const [editAgentId, setEditAgentId] = useState("company");
  const [savingEdit, setSavingEdit] = useState(false);

  // ─── 3-Tab state ───
  const [activeTab, setActiveTab] = useState<"tools" | "skills" | "workflows">("workflows");

  // ─── Tools state ───
  const [customTools, setCustomTools] = useState<any[]>([]);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [deletingToolId, setDeletingToolId] = useState<string | null>(null);
  // Create Tool
  const [isCreateToolOpen, setIsCreateToolOpen] = useState(false);
  const [newToolName, setNewToolName] = useState("");
  const [newToolDesc, setNewToolDesc] = useState("");
  const [newToolInstruction, setNewToolInstruction] = useState("");
  const [newToolConnections, setNewToolConnections] = useState<string[]>([]);
  const [newToolAgentId, setNewToolAgentId] = useState("company");
  const [creatingTool, setCreatingTool] = useState(false);
  // Edit Tool
  const [isEditToolOpen, setIsEditToolOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<any>(null);
  const [editToolName, setEditToolName] = useState("");
  const [editToolDesc, setEditToolDesc] = useState("");
  const [editToolInstruction, setEditToolInstruction] = useState("");
  const [editToolConnections, setEditToolConnections] = useState<string[]>([]);
  const [editToolAgentId, setEditToolAgentId] = useState("company");
  const [savingToolEdit, setSavingToolEdit] = useState(false);

  // ─── Skills state ───
  const [customSkills, setCustomSkills] = useState<any[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [deletingSkillId, setDeletingSkillId] = useState<string | null>(null);
  // Create Skill
  const [isCreateSkillOpen, setIsCreateSkillOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillDesc, setNewSkillDesc] = useState("");
  const [newSkillToolIds, setNewSkillToolIds] = useState<string[]>([]);
  const [newSkillAgentId, setNewSkillAgentId] = useState("company");
  const [creatingSkill, setCreatingSkill] = useState(false);
  // Edit Skill
  const [isEditSkillOpen, setIsEditSkillOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<any>(null);
  const [editSkillName, setEditSkillName] = useState("");
  const [editSkillDesc, setEditSkillDesc] = useState("");
  const [editSkillToolIds, setEditSkillToolIds] = useState<string[]>([]);
  const [editSkillAgentId, setEditSkillAgentId] = useState("company");
  const [savingSkillEdit, setSavingSkillEdit] = useState(false);

  // Workflow skill selector (for create/edit workflow modals)
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [editWorkflowSkillIds, setEditWorkflowSkillIds] = useState<string[]>([]);

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
        }));
        setPurchasedAgents(agentList);
      },
      (err) => {
        console.warn("Agents listener error:", err.message);
      }
    );
    return () => unsubscribe();
  }, [user?.uid]);

  const toggleConnection = (conn: string) => {
    setSelectedConnections(prev =>
      prev.includes(conn) ? prev.filter(c => c !== conn) : [...prev, conn]
    );
  };

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newGoal) {
      setToast({ message: "Name and Goal are required.", type: "error" });
      return;
    }
    setCreatingWorkflow(true);
    try {
      const res = await authFetch("/api/workflows", {
        method: "POST",
        body: JSON.stringify({
          name: newName,
          description: newDesc,
          goal: newGoal,
          requiredConnections: selectedConnections,
          schedule: newSchedule || null,
          agentId: selectedAgentId,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCustomWorkflows(prev => [data.workflow, ...prev]);
      setToast({ message: `Workflow "${newName}" created!`, type: "success" });
      setNewName(""); setNewDesc(""); setNewGoal(""); setNewSchedule("");
      setSelectedConnections([]); setSelectedAgentId("company");
      setIsCreateOpen(false);
    } catch (err) {
      setToast({ message: "Failed to create workflow.", type: "error" });
    } finally {
      setCreatingWorkflow(false);
    }
  };

  const openEditModal = (cw: any) => {
    setEditingWorkflow(cw);
    setEditName(cw.name || "");
    setEditDesc(cw.description || "");
    setEditGoal(cw.goal || "");
    setEditSchedule(cw.schedule || "");
    setEditConnections(cw.requiredConnections || []);
    setEditAgentId(cw.agentId || "company");
    setIsEditOpen(true);
  };

  const handleEditWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorkflow || !editName || !editGoal) {
      setToast({ message: "Name and Goal are required.", type: "error" });
      return;
    }
    setSavingEdit(true);
    try {
      const res = await authFetch("/api/workflows", {
        method: "PATCH",
        body: JSON.stringify({
          workflowId: editingWorkflow.id,
          name: editName,
          description: editDesc,
          goal: editGoal,
          requiredConnections: editConnections,
          schedule: editSchedule || null,
          agentId: editAgentId,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setCustomWorkflows(prev =>
        prev.map(w =>
          w.id === editingWorkflow.id
            ? { ...w, name: editName, description: editDesc, goal: editGoal, schedule: editSchedule || null, requiredConnections: editConnections, agentId: editAgentId }
            : w
        )
      );
      setToast({ message: `Workflow "${editName}" updated!`, type: "success" });
      setIsEditOpen(false);
      setEditingWorkflow(null);
    } catch {
      setToast({ message: "Failed to update workflow.", type: "error" });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteWorkflow = async (cw: any) => {
    if (!confirm(`Delete "${cw.name}"? This cannot be undone.`)) return;
    setDeletingId(cw.id);
    try {
      const res = await authFetch("/api/workflows", {
        method: "DELETE",
        body: JSON.stringify({ workflowId: cw.id }),
      });
      if (!res.ok) throw new Error(await res.text());
      setCustomWorkflows(prev => prev.filter(w => w.id !== cw.id));
      setToast({ message: `"${cw.name}" deleted.`, type: "success" });
    } catch {
      setToast({ message: "Failed to delete workflow.", type: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  const toggleEditConnection = (conn: string) => {
    setEditConnections(prev =>
      prev.includes(conn) ? prev.filter(c => c !== conn) : [...prev, conn]
    );
  };


  // Load installed workflows
  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, "users", user.uid, "settings", "workflows")).then((snap) => {
      if (snap.exists()) {
        setInstalledIds(snap.data().installed || []);
      }
    }).catch(() => {});
  }, [user?.uid]);

  // Sync with cron jobs so active state matches both views
  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid, "settings", "cron"),
      (snap) => {
        if (snap.exists()) {
          const jobs = snap.data().jobs || [];
          const activeIds = jobs.filter((j: any) => j.enabled).map((j: any) => j.workflowId);
          setCronJobIds(activeIds);
        }
      },
      () => {}
    );
    return () => unsubscribe();
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

  // Load custom tools
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    setToolsLoading(true);
    authFetch("/api/tools")
      .then((r) => r.json())
      .then((d) => setCustomTools(d.tools || []))
      .catch(() => {})
      .finally(() => setToolsLoading(false));
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    setSkillsLoading(true);
    authFetch("/api/skills")
      .then((r) => r.json())
      .then((d) => setCustomSkills(d.skills || []))
      .catch(() => {})
      .finally(() => setSkillsLoading(false));
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

  /* ─── Tool CRUD handlers ─── */
  const handleCreateTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newToolName || !newToolInstruction) { setToast({ message: "Name and Instruction are required.", type: "error" }); return; }
    setCreatingTool(true);
    try {
      const res = await authFetch("/api/tools", { method: "POST", body: JSON.stringify({ name: newToolName, description: newToolDesc, instruction: newToolInstruction, requiredConnections: newToolConnections, agentId: newToolAgentId }) });
      if (!res.ok) throw new Error(await res.text());
      const { tool } = await res.json();
      setCustomTools(prev => [tool, ...prev]);
      setToast({ message: `Tool "${newToolName}" created!`, type: "success" });
      setNewToolName(""); setNewToolDesc(""); setNewToolInstruction(""); setNewToolConnections([]); setNewToolAgentId("company");
      setIsCreateToolOpen(false);
    } catch { setToast({ message: "Failed to create tool.", type: "error" }); }
    finally { setCreatingTool(false); }
  };

  const openEditTool = (t: any) => {
    setEditingTool(t); setEditToolName(t.name || ""); setEditToolDesc(t.description || "");
    setEditToolInstruction(t.instruction || ""); setEditToolConnections(t.requiredConnections || []);
    setEditToolAgentId(t.agentId || "company"); setIsEditToolOpen(true);
  };

  const handleEditTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTool) return;
    setSavingToolEdit(true);
    try {
      const res = await authFetch("/api/tools", { method: "PATCH", body: JSON.stringify({ toolId: editingTool.id, name: editToolName, description: editToolDesc, instruction: editToolInstruction, requiredConnections: editToolConnections, agentId: editToolAgentId }) });
      if (!res.ok) throw new Error(await res.text());
      setCustomTools(prev => prev.map(t => t.id === editingTool.id ? { ...t, name: editToolName, description: editToolDesc, instruction: editToolInstruction, requiredConnections: editToolConnections, agentId: editToolAgentId } : t));
      setToast({ message: `Tool "${editToolName}" updated!`, type: "success" }); setIsEditToolOpen(false);
    } catch { setToast({ message: "Failed to update tool.", type: "error" }); }
    finally { setSavingToolEdit(false); }
  };

  const handleDeleteTool = async (t: any) => {
    if (!confirm(`Delete tool "${t.name}"? This cannot be undone.`)) return;
    setDeletingToolId(t.id);
    try {
      const res = await authFetch("/api/tools", { method: "DELETE", body: JSON.stringify({ toolId: t.id }) });
      if (!res.ok) throw new Error(await res.text());
      setCustomTools(prev => prev.filter(x => x.id !== t.id));
      setToast({ message: `Tool "${t.name}" deleted.`, type: "success" });
    } catch { setToast({ message: "Failed to delete tool.", type: "error" }); }
    finally { setDeletingToolId(null); }
  };

  /* ─── Skill CRUD handlers ─── */
  const handleCreateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName) { setToast({ message: "Name is required.", type: "error" }); return; }
    setCreatingSkill(true);
    try {
      const res = await authFetch("/api/skills", { method: "POST", body: JSON.stringify({ name: newSkillName, description: newSkillDesc, toolIds: newSkillToolIds, agentId: newSkillAgentId }) });
      if (!res.ok) throw new Error(await res.text());
      const { skill } = await res.json();
      setCustomSkills(prev => [skill, ...prev]);
      setToast({ message: `Skill "${newSkillName}" created!`, type: "success" });
      setNewSkillName(""); setNewSkillDesc(""); setNewSkillToolIds([]); setNewSkillAgentId("company");
      setIsCreateSkillOpen(false);
    } catch { setToast({ message: "Failed to create skill.", type: "error" }); }
    finally { setCreatingSkill(false); }
  };

  const openEditSkill = (s: any) => {
    setEditingSkill(s); setEditSkillName(s.name || ""); setEditSkillDesc(s.description || "");
    setEditSkillToolIds(s.toolIds || []); setEditSkillAgentId(s.agentId || "company"); setIsEditSkillOpen(true);
  };

  const handleEditSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSkill) return;
    setSavingSkillEdit(true);
    try {
      const res = await authFetch("/api/skills", { method: "PATCH", body: JSON.stringify({ skillId: editingSkill.id, name: editSkillName, description: editSkillDesc, toolIds: editSkillToolIds, agentId: editSkillAgentId }) });
      if (!res.ok) throw new Error(await res.text());
      setCustomSkills(prev => prev.map(s => s.id === editingSkill.id ? { ...s, name: editSkillName, description: editSkillDesc, toolIds: editSkillToolIds, agentId: editSkillAgentId } : s));
      setToast({ message: `Skill "${editSkillName}" updated!`, type: "success" }); setIsEditSkillOpen(false);
    } catch { setToast({ message: "Failed to update skill.", type: "error" }); }
    finally { setSavingSkillEdit(false); }
  };

  const handleDeleteSkill = async (s: any) => {
    if (!confirm(`Delete skill "${s.name}"? This cannot be undone.`)) return;
    setDeletingSkillId(s.id);
    try {
      const res = await authFetch("/api/skills", { method: "DELETE", body: JSON.stringify({ skillId: s.id }) });
      if (!res.ok) throw new Error(await res.text());
      setCustomSkills(prev => prev.filter(x => x.id !== s.id));
      setToast({ message: `Skill "${s.name}" deleted.`, type: "success" });
    } catch { setToast({ message: "Failed to delete skill.", type: "error" }); }
    finally { setDeletingSkillId(null); }
  };

  const toggleToolSelection = (id: string, setter: React.Dispatch<React.SetStateAction<string[]>>) =>
    setter(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleSkillSelection = (id: string, setter: React.Dispatch<React.SetStateAction<string[]>>) =>
    setter(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);


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
  // Merge installed + cron-scheduled IDs to get all active workflows
  const allActiveIds = Array.from(new Set([...installedIds, ...cronJobIds]));
  const installedCount = allActiveIds.length;

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
        {/* ─── My Automations — 3-Tab Panel ─── */}
        <div className="mb-10">
          {/* Tab header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <Sparkles size={18} className="text-purple-400" />
              My Automations
            </h2>
            {activeTab === "tools" && (
              <button onClick={() => setIsCreateToolOpen(true)} className="text-xs font-semibold px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-md flex items-center gap-1.5">
                <Plus size={12} /> New Tool
              </button>
            )}
            {activeTab === "skills" && (
              <button onClick={() => setIsCreateSkillOpen(true)} className="text-xs font-semibold px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-md flex items-center gap-1.5">
                <Plus size={12} /> New Skill
              </button>
            )}
            {activeTab === "workflows" && (
              <button onClick={() => setIsCreateOpen(true)} className="text-xs font-semibold px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white transition-all shadow-md flex items-center gap-1.5">
                <Plus size={12} /> New Workflow
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mb-5 p-1 rounded-2xl bg-white/[0.03] border border-white/5 w-fit">
            {([
              { key: "tools", label: "🔧 Tools", count: customTools.length },
              { key: "skills", label: "⚡ Skills", count: customSkills.length },
              { key: "workflows", label: "🔄 Workflows", count: customWorkflows.length },
            ] as { key: "tools" | "skills" | "workflows"; label: string; count: number }[]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
                  activeTab === tab.key
                    ? "bg-white/10 text-white shadow"
                    : "text-neutral-500 hover:text-neutral-300"
                )}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", activeTab === tab.key ? "bg-white/20" : "bg-white/5")}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* ── Tools Tab ── */}
          {activeTab === "tools" && (
            toolsLoading ? (
              <div className="flex items-center gap-2 text-neutral-500 text-sm py-4"><Loader2 size={14} className="animate-spin" /> Loading...</div>
            ) : customTools.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                <Wrench size={28} className="mx-auto mb-3 text-amber-400/40" />
                <p className="text-sm font-medium text-neutral-400">No tools yet</p>
                <p className="text-xs text-neutral-600 mt-1">Create a Tool — an atomic instruction step your agents can execute. Skills and Workflows are built from Tools.</p>
                <button onClick={() => setIsCreateToolOpen(true)} className="mt-4 text-xs font-semibold px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all">+ Create First Tool</button>
              </div>
            ) : (
              <div className="grid gap-3">
                {customTools.map((t) => (
                  <div key={t.id} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 flex items-start gap-4 group">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex-shrink-0 mt-0.5">
                      <Wrench size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{t.name}</p>
                      {t.description && <p className="text-xs text-neutral-500 mt-0.5">{t.description}</p>}
                      <p className="text-xs text-neutral-600 mt-1.5 line-clamp-2 italic">&ldquo;{t.instruction}&rdquo;</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {(t.requiredConnections || []).map((c: string) => (
                          <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-neutral-500">{CONNECTION_ICONS[c] || "🔗"} {c}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditTool(t)} title="Edit tool" className="p-1.5 rounded-lg text-neutral-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all"><Pencil size={13} /></button>
                      <button onClick={() => handleDeleteTool(t)} disabled={deletingToolId === t.id} title="Delete tool" className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40">
                        {deletingToolId === t.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── Skills Tab ── */}
          {activeTab === "skills" && (
            skillsLoading ? (
              <div className="flex items-center gap-2 text-neutral-500 text-sm py-4"><Loader2 size={14} className="animate-spin" /> Loading...</div>
            ) : customSkills.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                <Layers size={28} className="mx-auto mb-3 text-emerald-400/40" />
                <p className="text-sm font-medium text-neutral-400">No skills yet</p>
                <p className="text-xs text-neutral-600 mt-1">Create a Skill — an ordered set of Tools that gives an agent a reusable capability.</p>
                <button onClick={() => setIsCreateSkillOpen(true)} className="mt-4 text-xs font-semibold px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all">+ Create First Skill</button>
              </div>
            ) : (
              <div className="grid gap-3">
                {customSkills.map((s) => {
                  const skillTools = (s.toolIds || []).map((id: string) => customTools.find((t: any) => t.id === id)).filter(Boolean);
                  return (
                    <div key={s.id} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 flex items-start gap-4 group">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex-shrink-0 mt-0.5">
                        <Layers size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{s.name}</p>
                        {s.description && <p className="text-xs text-neutral-500 mt-0.5">{s.description}</p>}
                        {skillTools.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {skillTools.map((t: any, i: number) => (
                              <span key={t.id} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center gap-1">
                                <span className="font-bold text-amber-600/70">{i + 1}.</span> {t.name}
                              </span>
                            ))}
                          </div>
                        )}
                        {skillTools.length === 0 && s.toolIds?.length > 0 && (
                          <p className="text-[10px] text-neutral-600 mt-1.5">{s.toolIds.length} tool(s) assigned</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditSkill(s)} title="Edit skill" className="p-1.5 rounded-lg text-neutral-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all"><Pencil size={13} /></button>
                        <button onClick={() => handleDeleteSkill(s)} disabled={deletingSkillId === s.id} title="Delete skill" className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40">
                          {deletingSkillId === s.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* ── Workflows Tab ── */}
          {activeTab === "workflows" && (
            customLoading ? (
              <div className="flex items-center gap-2 text-neutral-500 text-sm py-4"><Loader2 size={14} className="animate-spin" /> Loading...</div>
            ) : customWorkflows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                <GitBranch size={28} className="mx-auto mb-3 text-purple-400/40" />
                <p className="text-sm font-medium text-neutral-400">No workflows yet</p>
                <p className="text-xs text-neutral-600 mt-1">Create a Workflow — combine Skills into an automation that runs once or on a schedule.</p>
                <button onClick={() => setIsCreateOpen(true)} className="mt-4 text-xs font-semibold px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-all">+ Create First Workflow</button>
              </div>
            ) : (
              <div className="grid gap-3">
                {customWorkflows.map((cw) => {
                  const assignedAgent = cw.agentId === "company" || !cw.agentId
                    ? null : purchasedAgents.find((a: any) => a.id === cw.agentId);
                  const wfSkills = (cw.skillIds || []).map((id: string) => customSkills.find((s: any) => s.id === id)).filter(Boolean);
                  return (
                    <div key={cw.id} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 flex items-center gap-4">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 text-purple-400 flex-shrink-0">
                        <GitBranch size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{cw.name}</p>
                        {cw.description && <p className="text-xs text-neutral-500 truncate">{cw.description}</p>}
                        {wfSkills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {wfSkills.map((s: any, i: number) => (
                              <span key={s.id} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1">
                                <span className="font-bold text-emerald-600/70">{i + 1}.</span> {s.name}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {assignedAgent ? (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">👤 {assignedAgent.soul?.agentName || assignedAgent.name || assignedAgent.id}</span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-500/10 border border-neutral-500/20 text-neutral-400">🏢 Company-Wide</span>
                          )}
                          {cw.schedule && <span className="text-[10px] text-neutral-600 flex items-center gap-1"><Clock size={9} /> {cw.schedule}</span>}
                          {cw.lastRunAt && <span className="text-[10px] text-neutral-600">Last run: {new Date(cw.lastRunAt).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => router.push(`/chat?runCustomWorkflow=${cw.id}&workflowName=${encodeURIComponent(cw.name)}`)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 text-purple-400 transition-all">Run</button>
                        <button onClick={() => openEditModal(cw)} title="Edit workflow" className="p-1.5 rounded-lg text-neutral-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all"><Pencil size={13} /></button>
                        <button onClick={() => handleDeleteWorkflow(cw)} disabled={deletingId === cw.id} title="Delete workflow" className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40">
                          {deletingId === cw.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

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
            const isInstalled = allActiveIds.includes(wf.id);
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
                        {isInstalled ? (
                          <div className="space-y-2">
                            {/* Active status banner */}
                            <div className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-sm font-semibold text-emerald-400">Active</span>
                                <span className="text-[10px] text-emerald-400/60 font-mono uppercase tracking-wider">· Scheduled</span>
                              </div>
                              <Link
                                href="/cron"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[11px] text-emerald-400/70 hover:text-emerald-300 font-medium transition-colors"
                              >
                                Manage →
                              </Link>
                            </div>
                            <div className="flex gap-2">
                              <Link
                                href={`/chat?workflow=${wf.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-neutral-300 hover:bg-white/10"
                              >
                                <Zap size={14} /> Run Now
                              </Link>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  uninstallWorkflow(wf.id);
                                }}
                                disabled={isInstalling}
                                className={cn(
                                  "px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-neutral-500 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400",
                                  isInstalling && "opacity-50 cursor-not-allowed"
                                )}
                              >
                                {isInstalling ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Link
                              href={`/chat?workflow=${wf.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 bg-white text-black hover:bg-neutral-200"
                            >
                              <Zap size={14} /> Run Now
                            </Link>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                installWorkflow(wf.id);
                              }}
                              disabled={isInstalling}
                              className={cn(
                                "flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-neutral-300 hover:bg-white/10",
                                isInstalling && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              {isInstalling ? (
                                <><Loader2 size={14} className="animate-spin" /> Processing...</>
                              ) : (
                                <><CheckCircle2 size={14} /> Activate</>
                              )}
                            </button>
                          </div>
                        )}
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

      {/* Create Custom Workflow Modal */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            {/* Dialog Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#121212]/90 backdrop-blur-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh] z-10 text-white"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                    <Zap size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">New Custom Workflow</h3>
                    <p className="text-xs text-neutral-500">Define a custom task for your agents</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-neutral-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateWorkflow} className="space-y-4">
                {/* Workflow Name */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                    Workflow Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Daily Leads Scraping & Enrichment"
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none transition-colors text-white"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Brief summary of what this workflow accomplishes"
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none transition-colors text-white"
                  />
                </div>

                {/* Scope Selection */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                    Assigned Agent (Scope)
                  </label>
                  <select
                    value={selectedAgentId}
                    onChange={(e) => setSelectedAgentId(e.target.value)}
                    className="w-full rounded-xl bg-[#1a1a1a] border border-white/10 px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none transition-colors text-white"
                  >
                    <option value="company">🏢 Company-Wide (Shared across all agents)</option>
                    {purchasedAgents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        👤 {agent.soul?.agentName || agent.name || agent.id} ({agent.soul?.jobTitle || "Hired Agent"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Goal (Prompt) */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                    What should the agent do? (Goal Prompt)
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    placeholder="Describe the step-by-step instructions. e.g. 'Read the latest spreadsheet of leads, enrich them with web search research, and write drafts to the new leads in Gmail.'"
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none transition-colors resize-none text-white"
                  />
                </div>

                {/* Cron Schedule */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    Cron Schedule (Optional)
                  </label>
                  <input
                    type="text"
                    value={newSchedule}
                    onChange={(e) => setNewSchedule(e.target.value)}
                    placeholder="e.g. '*/30 * * * *' (Every 30m) or leave empty for manual execution"
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none transition-colors text-white"
                  />
                </div>

                {/* Connections Required */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                    Required Connections
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(CONNECTION_ICONS).map((conn) => {
                      const isSelected = selectedConnections.includes(conn);
                      return (
                        <button
                          key={conn}
                          type="button"
                          onClick={() => toggleConnection(conn)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1",
                            isSelected
                              ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                              : "bg-white/5 border-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          <span>{CONNECTION_ICONS[conn] || "🔗"}</span>
                          {conn}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit button */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold border border-white/10 hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingWorkflow}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold bg-purple-500 hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
                  >
                    {creatingWorkflow ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      "Create Workflow"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Custom Workflow Modal */}
      <AnimatePresence>
        {isEditOpen && editingWorkflow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#121212]/90 backdrop-blur-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh] z-10 text-white"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                    <Pencil size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">Edit Workflow</h3>
                    <p className="text-xs text-neutral-500">Update name, goal, or schedule</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-neutral-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleEditWorkflow} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Workflow Name</label>
                  <input
                    type="text" required value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. Daily Leads Scraping"
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition-colors text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Description</label>
                  <input
                    type="text" value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Brief summary"
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition-colors text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Assigned Agent (Scope)</label>
                  <select
                    value={editAgentId}
                    onChange={(e) => setEditAgentId(e.target.value)}
                    className="w-full rounded-xl bg-[#1a1a1a] border border-white/10 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition-colors text-white"
                  >
                    <option value="company">🏢 Company-Wide (Shared across all agents)</option>
                    {purchasedAgents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        👤 {agent.soul?.agentName || agent.name || agent.id} ({agent.soul?.jobTitle || "Hired Agent"})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Goal Prompt</label>
                  <textarea
                    required rows={4} value={editGoal}
                    onChange={(e) => setEditGoal(e.target.value)}
                    placeholder="Describe what the agent should do..."
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition-colors resize-none text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Cron Schedule (Optional)</label>
                  <input
                    type="text" value={editSchedule}
                    onChange={(e) => setEditSchedule(e.target.value)}
                    placeholder="e.g. '0 8 * * *' (Daily 8am) or leave empty"
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition-colors text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Required Connections</label>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(CONNECTION_ICONS).map((conn) => {
                      const isSel = editConnections.includes(conn);
                      return (
                        <button
                          key={conn} type="button"
                          onClick={() => toggleEditConnection(conn)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1",
                            isSel
                              ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                              : "bg-white/5 border-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          <span>{CONNECTION_ICONS[conn] || "🔗"}</span>{conn}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold border border-white/10 hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit" disabled={savingEdit}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold bg-blue-500 hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                  >
                    {savingEdit ? <Loader2 size={16} className="animate-spin" /> : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Create Tool Modal ─── */}
      <AnimatePresence>
        {isCreateToolOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCreateToolOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#121212]/90 backdrop-blur-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh] z-10 text-white">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400"><Wrench size={18} /></div>
                  <div><h3 className="text-base font-bold">Create Tool</h3><p className="text-xs text-neutral-500">An atomic instruction step</p></div>
                </div>
                <button onClick={() => setIsCreateToolOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-neutral-400 hover:text-white"><X size={16} /></button>
              </div>
              <form onSubmit={handleCreateTool} className="space-y-4">
                <div><label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Tool Name *</label>
                  <input required value={newToolName} onChange={e => setNewToolName(e.target.value)} placeholder="e.g. Search Gmail for Leads" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none text-white" /></div>
                <div><label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Description</label>
                  <input value={newToolDesc} onChange={e => setNewToolDesc(e.target.value)} placeholder="One-line summary" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none text-white" /></div>
                <div><label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Instruction Prompt *</label>
                  <textarea required rows={5} value={newToolInstruction} onChange={e => setNewToolInstruction(e.target.value)} placeholder="Detailed step-by-step instructions the agent will follow when this tool runs..." className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none resize-none text-white" /></div>
                <div><label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Agent Scope</label>
                  <select value={newToolAgentId} onChange={e => setNewToolAgentId(e.target.value)} className="w-full rounded-xl bg-[#1a1a1a] border border-white/10 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none text-white">
                    <option value="company">🏢 Company-Wide</option>
                    {purchasedAgents.map((a: any) => <option key={a.id} value={a.id}>👤 {a.soul?.agentName || a.name || a.id}</option>)}
                  </select></div>
                <div><label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Required Connections</label>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(CONNECTION_ICONS).map(conn => {
                      const sel = newToolConnections.includes(conn);
                      return <button key={conn} type="button" onClick={() => setNewToolConnections(prev => sel ? prev.filter(c => c !== conn) : [...prev, conn])} className={cn("px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1", sel ? "bg-amber-500/20 border-amber-500/40 text-amber-300" : "bg-white/5 border-white/5 text-neutral-400 hover:bg-white/10")}><span>{CONNECTION_ICONS[conn] || "🔗"}</span>{conn}</button>;
                    })}
                  </div></div>
                <div className="flex items-center gap-3 pt-2">
                  <button type="button" onClick={() => setIsCreateToolOpen(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold border border-white/10 hover:bg-white/5 transition-colors">Cancel</button>
                  <button type="submit" disabled={creatingTool} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 transition-colors flex items-center justify-center gap-2">
                    {creatingTool ? <Loader2 size={16} className="animate-spin" /> : "Create Tool"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Edit Tool Modal ─── */}
      <AnimatePresence>
        {isEditToolOpen && editingTool && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditToolOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#121212]/90 backdrop-blur-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh] z-10 text-white">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400"><Pencil size={18} /></div>
                  <div><h3 className="text-base font-bold">Edit Tool</h3><p className="text-xs text-neutral-500">{editingTool.name}</p></div>
                </div>
                <button onClick={() => setIsEditToolOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-neutral-400 hover:text-white"><X size={16} /></button>
              </div>
              <form onSubmit={handleEditTool} className="space-y-4">
                <div><label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Tool Name</label>
                  <input required value={editToolName} onChange={e => setEditToolName(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none text-white" /></div>
                <div><label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Description</label>
                  <input value={editToolDesc} onChange={e => setEditToolDesc(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none text-white" /></div>
                <div><label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Instruction Prompt</label>
                  <textarea rows={5} value={editToolInstruction} onChange={e => setEditToolInstruction(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none resize-none text-white" /></div>
                <div className="flex items-center gap-3 pt-2">
                  <button type="button" onClick={() => setIsEditToolOpen(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold border border-white/10 hover:bg-white/5 transition-colors">Cancel</button>
                  <button type="submit" disabled={savingToolEdit} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 transition-colors flex items-center justify-center gap-2">
                    {savingToolEdit ? <Loader2 size={16} className="animate-spin" /> : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Create Skill Modal ─── */}
      <AnimatePresence>
        {isCreateSkillOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCreateSkillOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#121212]/90 backdrop-blur-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh] z-10 text-white">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"><Layers size={18} /></div>
                  <div><h3 className="text-base font-bold">Create Skill</h3><p className="text-xs text-neutral-500">An ordered set of Tools</p></div>
                </div>
                <button onClick={() => setIsCreateSkillOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-neutral-400 hover:text-white"><X size={16} /></button>
              </div>
              <form onSubmit={handleCreateSkill} className="space-y-4">
                <div><label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Skill Name *</label>
                  <input required value={newSkillName} onChange={e => setNewSkillName(e.target.value)} placeholder="e.g. Lead Research" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none text-white" /></div>
                <div><label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Description</label>
                  <input value={newSkillDesc} onChange={e => setNewSkillDesc(e.target.value)} placeholder="What this skill does" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none text-white" /></div>
                <div><label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Agent Scope</label>
                  <select value={newSkillAgentId} onChange={e => setNewSkillAgentId(e.target.value)} className="w-full rounded-xl bg-[#1a1a1a] border border-white/10 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none text-white">
                    <option value="company">🏢 Company-Wide</option>
                    {purchasedAgents.map((a: any) => <option key={a.id} value={a.id}>👤 {a.soul?.agentName || a.name || a.id}</option>)}
                  </select></div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Select Tools (in order)</label>
                  {customTools.length === 0 ? (
                    <p className="text-xs text-neutral-600 py-2">No tools yet. <button type="button" onClick={() => { setIsCreateSkillOpen(false); setIsCreateToolOpen(true); setActiveTab("tools"); }} className="text-amber-400 underline">Create a Tool first</button>.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {customTools.map((t: any) => {
                        const idx = newSkillToolIds.indexOf(t.id);
                        const sel = idx !== -1;
                        return (
                          <button key={t.id} type="button" onClick={() => toggleToolSelection(t.id, setNewSkillToolIds)} className={cn("w-full text-left px-3 py-2 rounded-xl border text-sm transition-all flex items-center gap-3", sel ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-white/3 border-white/5 text-neutral-400 hover:bg-white/5")}>
                            <span className={cn("w-5 h-5 rounded-md border flex items-center justify-center text-[10px] font-bold flex-shrink-0", sel ? "bg-emerald-500 border-emerald-500 text-white" : "border-white/10")}>{sel ? idx + 1 : ""}</span>
                            <span>{t.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button type="button" onClick={() => setIsCreateSkillOpen(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold border border-white/10 hover:bg-white/5 transition-colors">Cancel</button>
                  <button type="submit" disabled={creatingSkill} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2">
                    {creatingSkill ? <Loader2 size={16} className="animate-spin" /> : "Create Skill"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Edit Skill Modal ─── */}
      <AnimatePresence>
        {isEditSkillOpen && editingSkill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditSkillOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#121212]/90 backdrop-blur-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh] z-10 text-white">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"><Pencil size={18} /></div>
                  <div><h3 className="text-base font-bold">Edit Skill</h3><p className="text-xs text-neutral-500">{editingSkill.name}</p></div>
                </div>
                <button onClick={() => setIsEditSkillOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-neutral-400 hover:text-white"><X size={16} /></button>
              </div>
              <form onSubmit={handleEditSkill} className="space-y-4">
                <div><label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Skill Name</label>
                  <input required value={editSkillName} onChange={e => setEditSkillName(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none text-white" /></div>
                <div><label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Description</label>
                  <input value={editSkillDesc} onChange={e => setEditSkillDesc(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none text-white" /></div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Tools (in order)</label>
                  {customTools.length === 0 ? <p className="text-xs text-neutral-600">No tools available.</p> : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {customTools.map((t: any) => {
                        const idx = editSkillToolIds.indexOf(t.id);
                        const sel = idx !== -1;
                        return (
                          <button key={t.id} type="button" onClick={() => toggleToolSelection(t.id, setEditSkillToolIds)} className={cn("w-full text-left px-3 py-2 rounded-xl border text-sm transition-all flex items-center gap-3", sel ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-white/3 border-white/5 text-neutral-400 hover:bg-white/5")}>
                            <span className={cn("w-5 h-5 rounded-md border flex items-center justify-center text-[10px] font-bold flex-shrink-0", sel ? "bg-emerald-500 border-emerald-500 text-white" : "border-white/10")}>{sel ? idx + 1 : ""}</span>
                            <span>{t.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button type="button" onClick={() => setIsEditSkillOpen(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold border border-white/10 hover:bg-white/5 transition-colors">Cancel</button>
                  <button type="submit" disabled={savingSkillEdit} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2">
                    {savingSkillEdit ? <Loader2 size={16} className="animate-spin" /> : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
