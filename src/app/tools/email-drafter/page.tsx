"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Zap, ArrowRight, Mail, Copy, Check, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EmailDrafterPage() {
  const [originalEmail, setOriginalEmail] = useState("");
  const [intent, setIntent] = useState("");
  const [tone, setTone] = useState("professional");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [showCapture, setShowCapture] = useState(false);
  const [captured, setCaptured] = useState(false);

  const tones = [
    { id: "professional", label: "Professional" },
    { id: "friendly", label: "Friendly" },
    { id: "direct", label: "Direct" },
    { id: "formal", label: "Formal" },
    { id: "casual", label: "Casual" },
  ];

  const handleGenerate = async () => {
    if (!originalEmail.trim() || !intent.trim()) return;
    setLoading(true);
    setDraft("");
    try {
      const res = await fetch("/api/tools/email-drafter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalEmail, intent, tone }),
      });
      const data = await res.json();
      setDraft(data.draft || "Error generating draft. Please try again.");
      setShowCapture(true);
    } catch {
      setDraft("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCapture = async () => {
    if (!email.trim()) return;
    try {
      await fetch("/api/tools/email-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "email-drafter" }),
      });
      setCaptured(true);
    } catch {
      // silent fail
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0e1a] text-white selection:bg-emerald-400/30 overflow-hidden font-sans">
      {/* Ambient glow */}
      <div className="fixed top-[-200px] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-emerald-500/[0.04] blur-[150px] rounded-full -z-10 pointer-events-none" />

      {/* Nav */}
      <nav className="p-6 md:px-12 flex justify-between items-center z-50 border-b border-white/[0.05]">
        <Link href="/" className="text-sm font-bold tracking-tight flex items-center gap-2">
          <Zap size={16} className="text-emerald-400" />
          Employee Zero
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs text-neutral-400 hover:text-white transition-colors font-medium">
            ← Back
          </Link>
          <Button className="h-8 px-4 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black rounded-full" asChild>
            <Link href="/login">Get Started</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 md:px-12 pt-12 pb-8 max-w-3xl mx-auto w-full text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-xs text-neutral-400 font-medium mb-6">
            <Mail size={12} className="text-emerald-400" />
            Free Tool
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-4">
            AI Email Drafter
          </h1>
          <p className="text-base text-neutral-400 max-w-lg mx-auto leading-relaxed">
            Paste any email you received. Tell us what you want to say. Get a professional reply in seconds — <span className="text-white font-medium">free, no signup required.</span>
          </p>
        </motion.div>
      </section>

      {/* Tool */}
      <section className="px-6 md:px-12 pb-20 max-w-3xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-6"
        >
          {/* Original Email Input */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">
              Paste the email you received
            </label>
            <textarea
              id="original-email"
              value={originalEmail}
              onChange={(e) => setOriginalEmail(e.target.value)}
              placeholder="Hi, I wanted to follow up on our conversation last week about the partnership opportunity..."
              className="w-full h-40 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/50 resize-none transition-colors"
            />
          </div>

          {/* Intent */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">
              What do you want to say back?
            </label>
            <textarea
              id="reply-intent"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="Politely decline the partnership but leave the door open for future opportunities..."
              className="w-full h-24 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/50 resize-none transition-colors"
            />
          </div>

          {/* Tone Selector */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">Tone</label>
            <div className="flex flex-wrap gap-2">
              {tones.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTone(t.id)}
                  className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                    tone === t.id
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                      : "bg-white/[0.03] border-white/[0.08] text-neutral-400 hover:text-white hover:border-white/[0.15]"
                  } border`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={loading || !originalEmail.trim() || !intent.trim()}
            className="w-full h-12 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl transition-all shadow-[0_0_30px_rgba(16,185,129,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Drafting your reply...
              </>
            ) : (
              <>
                <Sparkles size={16} className="mr-2" />
                Generate Reply
              </>
            )}
          </Button>

          {/* Draft Output */}
          {draft && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative"
            >
              <div className="bg-white/[0.03] border border-emerald-500/20 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-emerald-400">Your Draft Reply</span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">{draft}</p>
              </div>
            </motion.div>
          )}

          {/* Email Capture */}
          {showCapture && !captured && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-emerald-500/[0.08] to-transparent border border-emerald-500/20 rounded-xl p-5"
            >
              <h3 className="text-sm font-semibold text-white mb-1">Like this? There{`'`}s way more.</h3>
              <p className="text-xs text-neutral-400 mb-4">
                Employee Zero doesn{`'`}t just draft emails — it <span className="text-white">sends them, manages your inbox, handles scheduling, writes reports, and more.</span> Drop your email to see what it can do.
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="flex-1 h-10 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/50"
                />
                <Button
                  onClick={handleCapture}
                  className="h-10 px-5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg"
                >
                  Show me <ArrowRight size={12} className="ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {captured && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 text-center"
            >
              <Check size={24} className="text-emerald-400 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-white mb-1">You{`'`}re in!</h3>
              <p className="text-xs text-neutral-400 mb-3">Check your inbox — or skip the wait and start now.</p>
              <Button className="h-9 px-5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black rounded-full" asChild>
                <Link href="/login">Hire Employee Zero — $29/mo <ArrowRight size={12} className="ml-1" /></Link>
              </Button>
            </motion.div>
          )}
        </motion.div>

        {/* Social proof / upsell */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-16 text-center"
        >
          <p className="text-xs text-neutral-500 mb-4">This free tool drafted one email. Employee Zero handles your entire inbox.</p>
          <div className="flex flex-col items-center gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              {[
                { stat: "24/7", label: "Always on" },
                { stat: "$29", label: "/month" },
                { stat: "100+", label: "Integrations" },
                { stat: "0", label: "Setup time" },
              ].map((s, i) => (
                <div key={i} className="px-4 py-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                  <div className="text-lg font-bold text-emerald-400">{s.stat}</div>
                  <div className="text-[10px] text-neutral-500">{s.label}</div>
                </div>
              ))}
            </div>
            <Button className="h-10 px-6 text-xs font-semibold bg-white hover:bg-neutral-100 text-black rounded-full" asChild>
              <Link href="/">Learn more about Employee Zero <ArrowRight size={12} className="ml-1" /></Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/[0.05] px-6 py-6 text-center">
        <p className="text-xs text-neutral-600">
          © 2026 Employee Zero. Free tool — no account required.
        </p>
      </footer>
    </div>
  );
}
