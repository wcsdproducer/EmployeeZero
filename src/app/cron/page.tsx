"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { authFetch } from "@/lib/authFetch";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Clock,
  Play,
  Pause,
  Trash2,
  Plus,
  Sparkles,
  Mail,
  Calendar,
  FileSpreadsheet,
  BarChart3,
  Target,
  Star,
  Users,
  Globe,
  Search,
  TrendingUp,
  Briefcase,
  Send,
  Zap,
  Check,
  X,
  Loader2,
  ChevronDown,
  Timer,
  RefreshCw,
} from "lucide-react";

/* ─── Types ─── */

interface CronJob {
  id: string;
  workflowId: string;
  name: string;
  schedule: string; // human-readable
  cronExpression: string; // e.g. "0 8 * * *"
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  lastStatus?: "success" | "failed" | "running";
  createdAt: string;
}

/* ─── Schedule Options ─── */

const SCHEDULE_OPTIONS = [
  { label: "Every 15 minutes", cron: "*/15 * * * *", human: "Every 15 min" },
  { label: "Every 30 minutes", cron: "*/30 * * * *", human: "Every 30 min" },
  { label: "Every hour", cron: "0 * * * *", human: "Hourly" },
  { label: "Every 2 hours", cron: "0 */2 * * *", human: "Every 2 hours" },
  { label: "Daily at 8:00 AM", cron: "0 8 * * *", human: "Daily 8 AM" },
  { label: "Daily at 9:00 AM", cron: "0 9 * * *", human: "Daily 9 AM" },
  { label: "Daily at 6:00 PM", cron: "0 18 * * *", human: "Daily 6 PM" },
  { label: "Every Monday at 9 AM", cron: "0 9 * * 1", human: "Mon 9 AM" },
  { label: "Every Sunday at 8 PM", cron: "0 20 * * 0", human: "Sun 8 PM" },
  { label: "Weekdays at 8 AM", cron: "0 8 * * 1-5", human: "Weekdays 8 AM" },
];

/* ─── Available Workflows ─── */

interface WorkflowOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  iconBg: string;
  defaultSchedule: string;
  defaultCron: string;
}

const WORKFLOW_OPTIONS: WorkflowOption[] = [
  // ─── DAILY ESSENTIALS ───
  { id: "morning-briefing", name: "Morning Briefing", icon: <Sparkles size={16} />, iconBg: "from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400", defaultSchedule: "Daily 8 AM", defaultCron: "0 8 * * *" },
  { id: "daily-standup", name: "Daily Standup", icon: <Calendar size={16} />, iconBg: "from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400", defaultSchedule: "Daily 8 AM", defaultCron: "0 8 * * *" },
  { id: "inbox-commander", name: "Inbox Commander", icon: <Mail size={16} />, iconBg: "from-red-500/20 to-pink-500/20 border-red-500/30 text-red-400", defaultSchedule: "Every 30 min", defaultCron: "*/30 * * * *" },
  { id: "eod-wrapup", name: "End-of-Day Wrap-Up", icon: <Clock size={16} />, iconBg: "from-purple-500/20 to-violet-500/20 border-purple-500/30 text-purple-400", defaultSchedule: "Daily 6 PM", defaultCron: "0 18 * * *" },
  { id: "full-business-autopilot", name: "Full Business Autopilot", icon: <Zap size={16} />, iconBg: "from-yellow-500/20 to-orange-500/20 border-yellow-500/30 text-yellow-400", defaultSchedule: "Daily 8 AM", defaultCron: "0 8 * * *" },
  // ─── CALENDAR & MEETINGS ───
  { id: "meeting-prep", name: "Meeting Prep", icon: <Users size={16} />, iconBg: "from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400", defaultSchedule: "Hourly", defaultCron: "0 * * * *" },
  { id: "meeting-follow-up", name: "Meeting Follow-Up", icon: <Send size={16} />, iconBg: "from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400", defaultSchedule: "Daily 6 PM", defaultCron: "0 18 * * *" },
  { id: "week-planner", name: "Week Planner", icon: <Calendar size={16} />, iconBg: "from-indigo-500/20 to-blue-500/20 border-indigo-500/30 text-indigo-400", defaultSchedule: "Sun 8 PM", defaultCron: "0 20 * * 0" },
  { id: "appointment-scheduler", name: "Appointment Scheduler", icon: <Calendar size={16} />, iconBg: "from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400", defaultSchedule: "Every 15 min", defaultCron: "*/15 * * * *" },
  // ─── SOCIAL MEDIA ───
  { id: "social-engagement-sweep", name: "Social Engagement Sweep", icon: <TrendingUp size={16} />, iconBg: "from-pink-500/20 to-rose-500/20 border-pink-500/30 text-pink-400", defaultSchedule: "Every 2 hours", defaultCron: "0 */2 * * *" },
  { id: "social-post-all-platforms", name: "Cross-Platform Post", icon: <Globe size={16} />, iconBg: "from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-400", defaultSchedule: "Weekdays 8 AM", defaultCron: "0 8 * * 1-5" },
  { id: "social-analytics-report", name: "Social Analytics Report", icon: <BarChart3 size={16} />, iconBg: "from-violet-500/20 to-purple-500/20 border-violet-500/30 text-violet-400", defaultSchedule: "Mon 9 AM", defaultCron: "0 9 * * 1" },
  { id: "social-autopilot", name: "Social Autopilot", icon: <TrendingUp size={16} />, iconBg: "from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-400", defaultSchedule: "Weekdays 8 AM", defaultCron: "0 8 * * 1-5" },
  { id: "twitter-growth-engine", name: "Twitter Growth Engine", icon: <TrendingUp size={16} />, iconBg: "from-neutral-500/20 to-neutral-600/20 border-neutral-500/30 text-neutral-300", defaultSchedule: "Every 2 hours", defaultCron: "0 */2 * * *" },
  { id: "instagram-content-machine", name: "Instagram Content Machine", icon: <TrendingUp size={16} />, iconBg: "from-pink-500/20 to-fuchsia-500/20 border-pink-500/30 text-pink-400", defaultSchedule: "Daily 9 AM", defaultCron: "0 9 * * *" },
  { id: "linkedin-thought-leader", name: "LinkedIn Thought Leader", icon: <Briefcase size={16} />, iconBg: "from-blue-600/20 to-blue-500/20 border-blue-600/30 text-blue-400", defaultSchedule: "Weekdays 8 AM", defaultCron: "0 8 * * 1-5" },
  { id: "youtube-channel-manager", name: "YouTube Channel Manager", icon: <TrendingUp size={16} />, iconBg: "from-red-500/20 to-red-600/20 border-red-500/30 text-red-400", defaultSchedule: "Daily 9 AM", defaultCron: "0 9 * * *" },
  // ─── CONTENT & BRAND ───
  { id: "content-calendar", name: "Content Calendar", icon: <Globe size={16} />, iconBg: "from-pink-500/20 to-rose-500/20 border-pink-500/30 text-pink-400", defaultSchedule: "Sun 8 PM", defaultCron: "0 20 * * 0" },
  { id: "visual-content-batch", name: "Visual Content Batch", icon: <Sparkles size={16} />, iconBg: "from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400", defaultSchedule: "Mon 9 AM", defaultCron: "0 9 * * 1" },
  { id: "brand-mention-monitor", name: "Brand Mention Monitor", icon: <Search size={16} />, iconBg: "from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400", defaultSchedule: "Every 2 hours", defaultCron: "0 */2 * * *" },
  // ─── CRM & CONTACTS ───
  { id: "lead-tracker", name: "Lead Tracker", icon: <Target size={16} />, iconBg: "from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400", defaultSchedule: "Every 2 hours", defaultCron: "0 */2 * * *" },
  { id: "crm-sync", name: "CRM Sync", icon: <Users size={16} />, iconBg: "from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400", defaultSchedule: "Daily 6 PM", defaultCron: "0 18 * * *" },
  { id: "customer-birthday-checker", name: "Birthday & Anniversary", icon: <Star size={16} />, iconBg: "from-yellow-500/20 to-amber-500/20 border-yellow-500/30 text-yellow-400", defaultSchedule: "Daily 8 AM", defaultCron: "0 8 * * *" },
  { id: "review-responder", name: "Review Responder", icon: <Star size={16} />, iconBg: "from-yellow-500/20 to-amber-500/20 border-yellow-500/30 text-yellow-400", defaultSchedule: "Every 2 hours", defaultCron: "0 */2 * * *" },
  { id: "client-onboarding", name: "Client Onboarding", icon: <Users size={16} />, iconBg: "from-emerald-500/20 to-green-500/20 border-emerald-500/30 text-emerald-400", defaultSchedule: "Daily 9 AM", defaultCron: "0 9 * * *" },
  // ─── FINANCE ───
  { id: "expense-logger", name: "Expense Logger", icon: <FileSpreadsheet size={16} />, iconBg: "from-green-500/20 to-lime-500/20 border-green-500/30 text-green-400", defaultSchedule: "Daily 6 PM", defaultCron: "0 18 * * *" },
  { id: "revenue-tracker", name: "Revenue Tracker", icon: <BarChart3 size={16} />, iconBg: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400", defaultSchedule: "Mon 9 AM", defaultCron: "0 9 * * 1" },
  { id: "invoice-tracker", name: "Invoice Tracker", icon: <FileSpreadsheet size={16} />, iconBg: "from-green-500/20 to-lime-500/20 border-green-500/30 text-green-400", defaultSchedule: "Daily 6 PM", defaultCron: "0 18 * * *" },
  // ─── REPORTS ───
  { id: "weekly-report", name: "Weekly Report", icon: <BarChart3 size={16} />, iconBg: "from-indigo-500/20 to-purple-500/20 border-indigo-500/30 text-indigo-400", defaultSchedule: "Mon 9 AM", defaultCron: "0 9 * * 1" },
  { id: "end-of-week-everything", name: "End-of-Week Everything", icon: <BarChart3 size={16} />, iconBg: "from-violet-500/20 to-indigo-500/20 border-violet-500/30 text-violet-400", defaultSchedule: "Mon 9 AM", defaultCron: "0 9 * * 1" },
  { id: "business-pulse", name: "Business Pulse", icon: <Briefcase size={16} />, iconBg: "from-violet-500/20 to-purple-500/20 border-violet-500/30 text-violet-400", defaultSchedule: "Mon 9 AM", defaultCron: "0 9 * * 1" },
  // ─── RESEARCH ───
  { id: "competitor-intel", name: "Competitor Intel", icon: <Search size={16} />, iconBg: "from-orange-500/20 to-red-500/20 border-orange-500/30 text-orange-400", defaultSchedule: "Daily 9 AM", defaultCron: "0 9 * * *" },
  { id: "market-research", name: "Market Research", icon: <Globe size={16} />, iconBg: "from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400", defaultSchedule: "Mon 9 AM", defaultCron: "0 9 * * 1" },
  { id: "seo-audit", name: "SEO Audit", icon: <Search size={16} />, iconBg: "from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400", defaultSchedule: "Mon 9 AM", defaultCron: "0 9 * * 1" },
  // ─── HR & TEAM ───
  { id: "hiring-pipeline", name: "Hiring Pipeline", icon: <Users size={16} />, iconBg: "from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400", defaultSchedule: "Daily 9 AM", defaultCron: "0 9 * * *" },
  { id: "team-newsletter", name: "Team Newsletter", icon: <Send size={16} />, iconBg: "from-pink-500/20 to-rose-500/20 border-pink-500/30 text-pink-400", defaultSchedule: "Mon 9 AM", defaultCron: "0 9 * * 1" },
  // ─── DOCUMENTS & KB ───
  { id: "drive-cleanup", name: "Drive Cleanup", icon: <FileSpreadsheet size={16} />, iconBg: "from-yellow-500/20 to-amber-500/20 border-yellow-500/30 text-yellow-400", defaultSchedule: "Mon 9 AM", defaultCron: "0 9 * * 1" },
  { id: "weekly-file-report", name: "Weekly File Report", icon: <FileSpreadsheet size={16} />, iconBg: "from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400", defaultSchedule: "Mon 9 AM", defaultCron: "0 9 * * 1" },
  { id: "notes-digest", name: "Notes Digest", icon: <Sparkles size={16} />, iconBg: "from-purple-500/20 to-indigo-500/20 border-purple-500/30 text-purple-400", defaultSchedule: "Daily 6 PM", defaultCron: "0 18 * * *" },
];

/* ─── Helpers ─── */

function formatLastRun(iso?: string): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getStatusColor(status?: string) {
  switch (status) {
    case "success": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    case "failed": return "text-red-400 bg-red-500/10 border-red-500/20";
    case "running": return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    default: return "text-neutral-500 bg-white/5 border-white/10";
  }
}

/* ─── Component ─── */

export default function CronPage() {
  const { user, loading: authLoading } = useAuth();
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [customWorkflows, setCustomWorkflows] = useState<WorkflowOption[]>([]);

  // Load cron jobs with real-time listener
  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid, "settings", "cron"),
      (snap) => {
        if (snap.exists()) {
          setJobs(snap.data().jobs || []);
        }
      },
      (err) => console.warn("Cron listener error:", err.message)
    );
    return () => unsubscribe();
  }, [user?.uid]);

  // Load custom workflows
  useEffect(() => {
    if (!user?.uid) return;
    authFetch("/api/workflows")
      .then((res) => res.json())
      .then((data) => {
        const customs = (data.workflows || []).map((w: any) => ({
          id: w.id,
          name: w.name,
          icon: <Sparkles size={16} />,
          iconBg: "from-purple-500/20 to-indigo-500/20 border-purple-500/30 text-purple-400",
          defaultSchedule: "Daily 8 AM",
          defaultCron: "0 8 * * *",
        }));
        setCustomWorkflows(customs);
      })
      .catch(() => {});
  }, [user?.uid]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const addJob = async () => {
    if (!user?.uid || !selectedWorkflow || !selectedSchedule) return;
    setSaving(true);
    try {
      const wf = WORKFLOW_OPTIONS.find((w) => w.id === selectedWorkflow)!;
      const sched = SCHEDULE_OPTIONS.find((s) => s.cron === selectedSchedule)!;

      const newJob: CronJob = {
        id: `${wf.id}-${Date.now()}`,
        workflowId: wf.id,
        name: wf.name,
        schedule: sched.human,
        cronExpression: sched.cron,
        enabled: true,
        createdAt: new Date().toISOString(),
      };

      const ref = doc(db, "users", user.uid, "settings", "cron");
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await updateDoc(ref, { jobs: [...(snap.data().jobs || []), newJob] });
      } else {
        await setDoc(ref, { jobs: [newJob] });
      }

      setShowAdd(false);
      setSelectedWorkflow(null);
      setSelectedSchedule(null);
      setToast({ message: `${wf.name} scheduled!`, type: "success" });
    } catch (err) {
      console.error("Failed to add cron job:", err);
      setToast({ message: "Failed to create schedule.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const toggleJob = async (jobId: string) => {
    if (!user?.uid) return;
    setTogglingId(jobId);
    try {
      const updated = jobs.map((j) =>
        j.id === jobId ? { ...j, enabled: !j.enabled } : j
      );
      await updateDoc(doc(db, "users", user.uid, "settings", "cron"), { jobs: updated });
      const job = updated.find((j) => j.id === jobId);
      setToast({ message: `${job?.name} ${job?.enabled ? "enabled" : "paused"}.`, type: "success" });
    } catch (err) {
      console.error("Failed to toggle job:", err);
      setToast({ message: "Failed to update.", type: "error" });
    } finally {
      setTogglingId(null);
    }
  };

  const deleteJob = async (jobId: string) => {
    if (!user?.uid) return;
    setDeletingId(jobId);
    try {
      const updated = jobs.filter((j) => j.id !== jobId);
      await updateDoc(doc(db, "users", user.uid, "settings", "cron"), { jobs: updated });
      setToast({ message: "Schedule removed.", type: "success" });
    } catch (err) {
      console.error("Failed to delete job:", err);
      setToast({ message: "Failed to delete.", type: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  const activeCount = jobs.filter((j) => j.enabled).length;

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
        <Link href="/login" className="text-blue-400 hover:underline">Sign in</Link> to manage schedules.
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
                <Timer size={18} className="text-cyan-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Scheduled Jobs</h1>
                <p className="text-xs text-neutral-500">Automate workflows on a schedule</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeCount > 0 && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {activeCount} active
              </div>
            )}
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-sm font-bold hover:bg-neutral-200 transition-all"
            >
              <Plus size={14} />
              New Schedule
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Empty State */}
        {jobs.length === 0 && !showAdd && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="mx-auto w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
              <Timer size={32} className="text-neutral-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">No scheduled jobs yet</h2>
            <p className="text-neutral-500 text-sm max-w-sm mx-auto mb-6">
              Schedule your workflows to run automatically — morning briefings, inbox triage, weekly reports, and more.
            </p>
            <button
              onClick={() => setShowAdd(true)}
              className="px-6 py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-neutral-200 transition-all inline-flex items-center gap-2"
            >
              <Plus size={14} />
              Create Your First Schedule
            </button>
          </motion.div>
        )}

        {/* Job List */}
        {jobs.length > 0 && (
          <div className="space-y-3">
            {jobs.map((job, i) => {
              const wf = WORKFLOW_OPTIONS.find((w) => w.id === job.workflowId);
              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className={cn(
                    "rounded-2xl border p-5 transition-all",
                    job.enabled
                      ? "border-white/10 bg-white/[0.02]"
                      : "border-white/5 bg-white/[0.01] opacity-60"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <div className={cn(
                        "w-11 h-11 rounded-xl bg-gradient-to-br border flex items-center justify-center flex-shrink-0",
                        wf?.iconBg || "from-neutral-500/20 to-neutral-600/20 border-neutral-500/30 text-neutral-400"
                      )}>
                        {wf?.icon || <Zap size={16} />}
                      </div>

                      {/* Info */}
                      <div>
                        <h3 className="font-bold text-[15px] tracking-tight">{job.name}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-neutral-500 flex items-center gap-1">
                            <RefreshCw size={10} />
                            {job.schedule}
                          </span>
                          <span className="text-[10px] text-neutral-600 font-mono">{job.cronExpression}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Last run status */}
                      {job.lastRun && (
                        <div className="text-right mr-2">
                          <div className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border inline-flex items-center gap-1",
                            getStatusColor(job.lastStatus)
                          )}>
                            {job.lastStatus === "running" && <Loader2 size={8} className="animate-spin" />}
                            {job.lastStatus || "pending"}
                          </div>
                          <p className="text-[10px] text-neutral-600 mt-0.5">
                            {formatLastRun(job.lastRun)}
                          </p>
                        </div>
                      )}

                      {/* Toggle */}
                      <button
                        onClick={() => toggleJob(job.id)}
                        disabled={togglingId === job.id}
                        className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center transition-all border",
                          job.enabled
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                            : "bg-white/5 border-white/10 text-neutral-500 hover:bg-white/10"
                        )}
                        title={job.enabled ? "Pause" : "Resume"}
                      >
                        {togglingId === job.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : job.enabled ? (
                          <Pause size={14} />
                        ) : (
                          <Play size={14} />
                        )}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => deleteJob(job.id)}
                        disabled={deletingId === job.id}
                        className="w-9 h-9 rounded-lg flex items-center justify-center transition-all border bg-white/5 border-white/10 text-neutral-500 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400"
                        title="Delete"
                      >
                        {deletingId === job.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Schedule Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            onClick={() => setShowAdd(false)}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg bg-[#111111] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/50 max-h-[85vh] overflow-y-auto"
            >
              <button
                onClick={() => setShowAdd(false)}
                className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors p-1"
              >
                <X size={18} />
              </button>

              <div className="text-center space-y-3 mb-8">
                <div className="mx-auto w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
                  <Timer size={24} className="text-cyan-400" />
                </div>
                <h2 className="text-xl font-bold tracking-tight">New Scheduled Job</h2>
                <p className="text-neutral-500 text-sm">Pick a workflow and set the frequency.</p>
              </div>

              {/* Step 1: Select Workflow */}
              <div className="mb-6">
                <p className="text-[10px] text-neutral-600 font-mono uppercase tracking-widest mb-3">1. Select Workflow</p>
                <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto pr-1">
                  {[...WORKFLOW_OPTIONS, ...customWorkflows].map((wf) => (
                    <button
                      key={wf.id}
                      onClick={() => {
                        setSelectedWorkflow(wf.id);
                        if (!selectedSchedule) setSelectedSchedule(wf.defaultCron);
                      }}
                      className={cn(
                        "text-left p-3 rounded-xl border transition-all",
                        selectedWorkflow === wf.id
                          ? "border-white/20 bg-white/10"
                          : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn("w-7 h-7 rounded-lg bg-gradient-to-br border flex items-center justify-center", wf.iconBg)}>
                          {wf.icon}
                        </div>
                        <span className="text-xs font-medium text-neutral-300">{wf.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Select Schedule */}
              <div className="mb-8">
                <p className="text-[10px] text-neutral-600 font-mono uppercase tracking-widest mb-3">2. Set Frequency</p>
                <div className="grid grid-cols-2 gap-2">
                  {SCHEDULE_OPTIONS.map((opt) => (
                    <button
                      key={opt.cron}
                      onClick={() => setSelectedSchedule(opt.cron)}
                      className={cn(
                        "text-left px-3 py-2.5 rounded-xl border transition-all text-sm",
                        selectedSchedule === opt.cron
                          ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                          : "border-white/5 bg-white/[0.02] text-neutral-400 hover:bg-white/[0.05]"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-xs">{opt.label}</span>
                        {selectedSchedule === opt.cron && <Check size={12} />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Create Button */}
              <button
                onClick={addJob}
                disabled={!selectedWorkflow || !selectedSchedule || saving}
                className={cn(
                  "w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
                  selectedWorkflow && selectedSchedule && !saving
                    ? "bg-white text-black hover:bg-neutral-200"
                    : "bg-white/5 text-neutral-600 cursor-not-allowed"
                )}
              >
                {saving ? (
                  <><Loader2 size={14} className="animate-spin" /> Creating...</>
                ) : (
                  <><Timer size={14} /> Create Schedule</>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
