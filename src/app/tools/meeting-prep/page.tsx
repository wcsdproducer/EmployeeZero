"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Zap, ArrowRight, FileText, Copy, Check, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MeetingPrepPage() {
  const [meetingType, setMeetingType] = useState("client-call");
  const [attendees, setAttendees] = useState("");
  const [context, setContext] = useState("");
  const [goals, setGoals] = useState("");
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [showCapture, setShowCapture] = useState(false);
  const [captured, setCaptured] = useState(false);

  const meetingTypes = [
    { id: "client-call", label: "Client Call" },
    { id: "sales-pitch", label: "Sales Pitch" },
    { id: "team-standup", label: "Team Standup" },
    { id: "investor-meeting", label: "Investor Meeting" },
    { id: "interview", label: "Interview" },
    { id: "partnership", label: "Partnership" },
  ];

  const handleGenerate = async () => {
    if (!context.trim()) return;
    setLoading(true);
    setBrief("");
    try {
      const res = await fetch("/api/tools/meeting-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingType, attendees, context, goals }),
      });
      const data = await res.json();
      setBrief(data.brief || "Error generating brief. Please try again.");
      setShowCapture(true);
    } catch {
      setBrief("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(brief);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCapture = async () => {
    if (!email.trim()) return;
    try {
      await fetch("/api/tools/email-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "meeting-prep" }),
      });
      setCaptured(true);
    } catch {}
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0e1a] text-white selection:bg-violet-400/30 overflow-hidden font-sans">
      <div className="fixed top-[-200px] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-violet-500/[0.04] blur-[150px] rounded-full -z-10 pointer-events-none" />

      <nav className="p-6 md:px-12 flex justify-between items-center z-50 border-b border-white/[0.05]">
        <Link href="/" className="text-sm font-bold tracking-tight flex items-center gap-2">
          <Zap size={16} className="text-emerald-400" />
          Employee Zero
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/tools" className="text-xs text-neutral-400 hover:text-white transition-colors font-medium">
            ← All Tools
          </Link>
          <Button className="h-8 px-4 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black rounded-full" asChild>
            <Link href="/login">Get Started</Link>
          </Button>
        </div>
      </nav>

      <section className="px-6 md:px-12 pt-12 pb-8 max-w-3xl mx-auto w-full text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-xs text-neutral-400 font-medium mb-6">
            <FileText size={12} className="text-violet-400" />
            Free Tool
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-4">
            Meeting Prep Brief
          </h1>
          <p className="text-base text-neutral-400 max-w-lg mx-auto leading-relaxed">
            Tell us about your meeting. Get a structured briefing doc with talking points, questions to ask, and key prep notes — <span className="text-white font-medium">free, no signup.</span>
          </p>
        </motion.div>
      </section>

      <section className="px-6 md:px-12 pb-20 max-w-3xl mx-auto w-full">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">Meeting type</label>
            <div className="flex flex-wrap gap-2">
              {meetingTypes.map((t) => (
                <button key={t.id} onClick={() => setMeetingType(t.id)}
                  className={`px-4 py-2 rounded-full text-xs font-medium transition-all border ${
                    meetingType === t.id
                      ? "bg-violet-500/20 border-violet-500/40 text-violet-400"
                      : "bg-white/[0.03] border-white/[0.08] text-neutral-400 hover:text-white hover:border-white/[0.15]"
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">Who are you meeting with?</label>
            <input id="attendees" value={attendees} onChange={(e) => setAttendees(e.target.value)}
              placeholder="e.g. Sarah Chen, VP of Marketing at Acme Corp"
              className="w-full h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-violet-500/50 transition-colors" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">Context / background</label>
            <textarea id="meeting-context" value={context} onChange={(e) => setContext(e.target.value)}
              placeholder="e.g. Follow-up from last month's demo. They're evaluating our tool vs. two competitors. Budget approved for Q2."
              className="w-full h-32 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-violet-500/50 resize-none transition-colors" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">Your goals for this meeting <span className="text-neutral-600">(optional)</span></label>
            <input id="meeting-goals" value={goals} onChange={(e) => setGoals(e.target.value)}
              placeholder="e.g. Close the deal, get a verbal commitment, schedule a pilot"
              className="w-full h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-violet-500/50 transition-colors" />
          </div>

          <Button onClick={handleGenerate} disabled={loading || !context.trim()}
            className="w-full h-12 text-sm font-semibold bg-violet-500 hover:bg-violet-400 text-white rounded-xl transition-all shadow-[0_0_30px_rgba(139,92,246,0.2)] disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? (
              <><Loader2 size={16} className="mr-2 animate-spin" />Preparing your brief...</>
            ) : (
              <><Sparkles size={16} className="mr-2" />Generate Brief</>
            )}
          </Button>

          {brief && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative">
              <div className="bg-white/[0.03] border border-violet-500/20 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-violet-400">Meeting Brief</span>
                  <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors">
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">{brief}</div>
              </div>
            </motion.div>
          )}

          {showCapture && !captured && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-violet-500/[0.08] to-transparent border border-violet-500/20 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-1">Imagine this before every meeting. Automatically.</h3>
              <p className="text-xs text-neutral-400 mb-4">
                Employee Zero <span className="text-white">reads your calendar, researches attendees, and delivers a prep brief</span> before every meeting — no manual input needed.
              </p>
              <div className="flex gap-2">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com"
                  className="flex-1 h-10 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-violet-500/50" />
                <Button onClick={handleCapture} className="h-10 px-5 text-xs font-semibold bg-violet-500 hover:bg-violet-400 text-white rounded-lg">
                  Show me <ArrowRight size={12} className="ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {captured && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-5 text-center">
              <Check size={24} className="text-violet-400 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-white mb-1">You&apos;re in!</h3>
              <p className="text-xs text-neutral-400 mb-3">Check your inbox — or start using Employee Zero now.</p>
              <Button className="h-9 px-5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black rounded-full" asChild>
                <Link href="/login">Hire Employee Zero — $29/mo <ArrowRight size={12} className="ml-1" /></Link>
              </Button>
            </motion.div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-16 text-center">
          <p className="text-xs text-neutral-500 mb-4">You prepped for one meeting. Employee Zero preps for all of them.</p>
          <Button className="h-10 px-6 text-xs font-semibold bg-white hover:bg-neutral-100 text-black rounded-full" asChild>
            <Link href="/">Learn more about Employee Zero <ArrowRight size={12} className="ml-1" /></Link>
          </Button>
        </motion.div>
      </section>

      <footer className="mt-auto border-t border-white/[0.05] px-6 py-6 text-center">
        <p className="text-xs text-neutral-600">© 2026 Employee Zero. Free tool — no account required.</p>
      </footer>
    </div>
  );
}
