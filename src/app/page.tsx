"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  GmailIcon, CalendarIcon, DocsIcon, SheetsIcon, DriveIcon, MeetIcon,
  InstagramIcon, XIcon as XBrandIcon, LinkedInIcon, FacebookIcon, TikTokIcon, YouTubeIcon,
  SlackIcon, NotionIcon, ZapierIcon, StripeIcon, HubSpotIcon,
} from "@/components/BrandIcons";
import {
  ArrowRight,
  Zap,
  UserPlus,
  Settings2,
  Rocket,
  MessageSquare,
  FileText,
  BarChart3,
  CalendarCheck,
  Sparkles,
  Brain,
  Shield,
  ChevronDown,
  Check,
  Users,
  Bot,
} from "lucide-react";

/* ─── Fade-in wrapper ─── */
function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── FAQ Item ─── */
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen(!open)}
      className="w-full text-left border border-white/[0.08] rounded-xl p-5 hover:border-white/[0.15] transition-colors"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">{q}</span>
        <ChevronDown
          size={16}
          className={`text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </div>
      {open && (
        <p className="mt-3 text-sm text-neutral-400 leading-relaxed">{a}</p>
      )}
    </button>
  );
}

/* ─── Main Page ─── */
export default function LandingPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleHire = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid || "guest",
          email: user?.email || "guest@example.com",
          plan: "founding-100",
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        window.location.href = "/onboarding";
      }
    } catch {
      window.location.href = "/onboarding";
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0e1a] text-white selection:bg-emerald-400/30 selection:text-white overflow-hidden font-sans">
      {/* ── Ambient glow ── */}
      <div className="fixed top-[-200px] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-emerald-500/[0.04] blur-[150px] rounded-full -z-10 pointer-events-none" />

      {/* ═══════════════════ NAV ═══════════════════ */}
      <nav className="p-6 md:px-12 flex justify-between items-center z-50 border-b border-white/[0.05]">
        <Link
          href="/"
          className="text-sm font-bold tracking-tight flex items-center gap-2"
        >
          <Zap size={16} className="text-emerald-400" />
          Employee Zero
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-xs text-neutral-400 hover:text-white transition-colors font-medium"
          >
            Sign In
          </Link>
          <Button
            onClick={handleHire}
            className="h-8 px-4 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black rounded-full transition-all"
          >
            Get Started
          </Button>
        </div>
      </nav>

      {/* ═══════════════════ HERO ═══════════════════ */}
      <section className="flex-shrink-0 flex flex-col items-center text-center px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <FadeIn>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-xs text-neutral-400 font-medium mb-8">
            <Bot size={12} className="text-emerald-400" />
            The AI that actually works
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] max-w-3xl">
            Hire your first
            <br />
            <span className="text-gradient-hero">AI Employee.</span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="mt-6 text-base md:text-lg text-neutral-400 max-w-md leading-relaxed">
            Not suggestions. Not chat.{" "}
            <span className="text-white font-medium">Real work.</span> You ask it
            once, it gets done — emails, research, reports, scheduling.
          </p>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button
              variant="outline"
              className="h-11 px-6 text-sm font-semibold rounded-full border-white/[0.15] bg-transparent hover:bg-white/[0.05] text-white"
              asChild
            >
              <Link href="#how-it-works">See it first</Link>
            </Button>
            <Button
              onClick={handleHire}
              disabled={loading}
              className="h-11 px-6 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-black rounded-full transition-all shadow-[0_0_30px_rgba(16,185,129,0.2)]"
            >
              {loading ? "Starting..." : "Launch for $29/mo"}
              <ArrowRight size={14} className="ml-2" />
            </Button>
          </div>
        </FadeIn>

        <FadeIn delay={0.4}>
          <div className="mt-10 flex items-center gap-3">
            <div className="flex -space-x-2">
              {[
                "bg-emerald-500",
                "bg-sky-500",
                "bg-violet-500",
                "bg-amber-500",
                "bg-rose-500",
              ].map((bg, i) => (
                <div
                  key={i}
                  className={`w-7 h-7 rounded-full ${bg} border-2 border-[#0a0e1a] flex items-center justify-center text-[9px] font-bold text-white`}
                >
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <span className="text-xs text-neutral-500">
              42 businesses already running
            </span>
          </div>
        </FadeIn>
      </section>

      {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
      <section
        id="how-it-works"
        className="px-6 md:px-12 py-20 md:py-28 max-w-4xl mx-auto w-full"
      >
        <FadeIn>
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
            How it works.
          </h2>
          <p className="text-sm text-neutral-500 text-center mb-16">
            Three steps. Sixty seconds. Done.
          </p>
        </FadeIn>

        <div className="space-y-10">
          {[
            {
              icon: UserPlus,
              title: "Sign up and give it a name.",
              desc: "Create your account, name your AI employee. It's yours — no sharing, no queues.",
            },
            {
              icon: Settings2,
              title: "Set up your private Employee.",
              desc: "Connect your tools — email, calendar, socials. Give it context about your business. Done.",
            },
            {
              icon: Rocket,
              title: "Start sending it missions.",
              desc: "Tell it what to do in plain English. It executes, reports back, learns from feedback.",
            },
          ].map((step, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div className="flex gap-5 items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <step.icon size={18} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">
                    {step.title}
                  </h3>
                  <p className="text-sm text-neutral-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ═══════════════════ AI DEMO ═══════════════════ */}
      <section className="px-6 md:px-12 py-20 md:py-28 max-w-4xl mx-auto w-full">
        <FadeIn>
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">
            This is your AI working.
          </h2>
          <p className="text-sm text-neutral-500 text-center mb-12">
            Not a mockup. Actually running.
          </p>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="glass-card p-5 md:p-6 max-w-2xl mx-auto">
            {/* Chat header */}
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/[0.06]">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Zap size={14} className="text-emerald-400" />
              </div>
              <div>
                <div className="text-xs font-semibold">Zero</div>
                <div className="text-[10px] text-emerald-400">● Online</div>
              </div>
            </div>

            {/* Chat messages */}
            <div className="space-y-4">
              {/* User message */}
              <div className="flex justify-end">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl rounded-br-md px-4 py-2.5 max-w-[80%]">
                  <p className="text-xs text-white leading-relaxed">
                    Research top 5 competitors in the AI assistant space and
                    draft an outreach email to their customers.
                  </p>
                </div>
              </div>

              {/* AI response */}
              <div className="flex justify-start">
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%]">
                  <p className="text-xs text-neutral-300 leading-relaxed mb-3">
                    I've identified the top 5 competitors by market share and
                    user reviews. Drafting a personalized outreach sequence
                    now...
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[10px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      ✓ 5 competitors analyzed
                    </span>
                    <span className="text-[10px] px-2 py-1 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      ✓ Email drafted
                    </span>
                    <span className="text-[10px] px-2 py-1 rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/20">
                      ✓ 3 follow-ups queued
                    </span>
                  </div>
                </div>
              </div>

              {/* Another user message */}
              <div className="flex justify-end">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl rounded-br-md px-4 py-2.5 max-w-[80%]">
                  <p className="text-xs text-white leading-relaxed">
                    Great — now schedule the first 10 sends for Monday 8 AM.
                  </p>
                </div>
              </div>

              {/* AI confirmation */}
              <div className="flex justify-start">
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%]">
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    Done. 10 personalized emails scheduled for Mon 8:00 AM EST.
                    I&apos;ll notify you when they go out and track opens +
                    replies automatically.
                  </p>
                </div>
              </div>
            </div>

            {/* Input bar */}
            <div className="mt-5 pt-4 border-t border-white/[0.06]">
              <div className="flex items-center gap-3 bg-white/[0.03] rounded-xl px-4 py-3 border border-white/[0.06]">
                <MessageSquare size={14} className="text-neutral-600" />
                <span className="text-xs text-neutral-600">
                  Give Zero a mission...
                </span>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ═══════════════════ CAPABILITIES ═══════════════════ */}
      <section className="px-6 md:px-12 py-20 md:py-28 max-w-5xl mx-auto w-full">
        <FadeIn>
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">
            Not just chat. Real work.
          </h2>
          <p className="text-sm text-neutral-500 text-center mb-14">
            Every mission gets done. End to end.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: FileText,
              title: "Research & Reports",
              desc: "Deep analysis on any topic with cited sources delivered to your inbox.",
              color: "text-rose-400",
              bg: "bg-rose-500/10",
              border: "border-rose-500/20",
            },
            {
              icon: BarChart3,
              title: "Market Intelligence",
              desc: "Track competitors, pricing changes, and market shifts automatically.",
              color: "text-sky-400",
              bg: "bg-sky-500/10",
              border: "border-sky-500/20",
            },
            {
              icon: CalendarCheck,
              title: "Scheduling & Ops",
              desc: "Manage your calendar, set reminders, and coordinate with your team.",
              color: "text-amber-400",
              bg: "bg-amber-500/10",
              border: "border-amber-500/20",
            },
            {
              icon: Sparkles,
              title: "Content & Writing",
              desc: "Blog posts, emails, social media copy — all in your brand voice.",
              color: "text-violet-400",
              bg: "bg-violet-500/10",
              border: "border-violet-500/20",
            },
          ].map((cap, i) => (
            <FadeIn key={i} delay={i * 0.08}>
              <div className="glass-card p-5 h-full hover:border-white/[0.15] transition-colors group">
                <div
                  className={`w-9 h-9 rounded-lg ${cap.bg} border ${cap.border} flex items-center justify-center mb-4`}
                >
                  <cap.icon size={16} className={cap.color} />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">
                  {cap.title}
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {cap.desc}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Value props row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          {[
            {
              icon: Shield,
              title: "It's yours.",
              desc: "Private, dedicated AI that only works for you. Your data never trains other models.",
            },
            {
              icon: Brain,
              title: "It remembers.",
              desc: "Learns your preferences, your tools, your brand voice. Gets smarter every day.",
            },
            {
              icon: Rocket,
              title: "It does work.",
              desc: "Not suggestions. Not drafts. Actual tasks completed and delivered back to you.",
            },
          ].map((v, i) => (
            <FadeIn key={i} delay={i * 0.08}>
              <div className="glass-card p-5 text-center hover:border-white/[0.15] transition-colors">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <v.icon size={18} className="text-emerald-400" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">
                  {v.title}
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {v.desc}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ═══════════════════ INTEGRATIONS ═══════════════════ */}
      <section className="px-6 md:px-12 py-20 md:py-28 max-w-5xl mx-auto w-full">
        <FadeIn>
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">
            Connect Your World.
          </h2>
          <p className="text-sm text-neutral-500 text-center mb-16">
            GSuite, social media, and more — all wired up from day one.
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="relative max-w-3xl mx-auto">
            {/* Center hub */}
            <div className="flex justify-center mb-14">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-2xl scale-150" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-[0_0_60px_rgba(16,185,129,0.3)]">
                  <Zap size={32} className="text-white" />
                </div>
                <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold text-white">
                  Employee Zero
                </div>
              </div>
            </div>

            {/* Google Workspace */}
            <div className="mb-8">
              <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest text-center mb-4">
                Google Workspace
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  { name: "Gmail", Icon: GmailIcon },
                  { name: "Calendar", Icon: CalendarIcon },
                  { name: "Docs", Icon: DocsIcon },
                  { name: "Sheets", Icon: SheetsIcon },
                  { name: "Drive", Icon: DriveIcon },
                  { name: "Meet", Icon: MeetIcon },
                ].map((app, i) => (
                  <motion.div
                    key={app.name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 + i * 0.06, duration: 0.5 }}
                    className="group"
                  >
                    <div className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.06] transition-all cursor-default">
                      <app.Icon size={36} />
                      <span className="text-[11px] font-medium text-neutral-400 group-hover:text-white transition-colors">
                        {app.name}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 max-w-md mx-auto mb-8">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/[0.08]" />
              <span className="text-[10px] text-neutral-600 font-medium">+</span>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/[0.08]" />
            </div>

            {/* Social Media */}
            <div className="mb-8">
              <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest text-center mb-4">
                Social Media
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  { name: "Instagram", Icon: InstagramIcon },
                  { name: "X / Twitter", Icon: XBrandIcon },
                  { name: "LinkedIn", Icon: LinkedInIcon },
                  { name: "Facebook", Icon: FacebookIcon },
                  { name: "TikTok", Icon: TikTokIcon },
                  { name: "YouTube", Icon: YouTubeIcon },
                ].map((app, i) => (
                  <motion.div
                    key={app.name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.06, duration: 0.5 }}
                    className="group"
                  >
                    <div className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.06] transition-all cursor-default">
                      <app.Icon size={36} />
                      <span className="text-[11px] font-medium text-neutral-400 group-hover:text-white transition-colors">
                        {app.name}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 max-w-md mx-auto mb-8">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/[0.08]" />
              <span className="text-[10px] text-neutral-600 font-medium">+</span>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/[0.08]" />
            </div>

            {/* More Tools */}
            <div>
              <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest text-center mb-4">
                And More
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  { name: "Slack", Icon: SlackIcon },
                  { name: "Notion", Icon: NotionIcon },
                  { name: "Zapier", Icon: ZapierIcon },
                  { name: "Stripe", Icon: StripeIcon },
                  { name: "HubSpot", Icon: HubSpotIcon },
                ].map((app, i) => (
                  <motion.div
                    key={app.name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + i * 0.06, duration: 0.5 }}
                    className="group"
                  >
                    <div className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.06] transition-all cursor-default">
                      <app.Icon size={36} />
                      <span className="text-[11px] font-medium text-neutral-400 group-hover:text-white transition-colors">
                        {app.name}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <FadeIn delay={0.6}>
              <p className="text-center mt-10 text-sm text-neutral-400">
                All integrations prewired — bring your own keys, connect in minutes.
              </p>
            </FadeIn>
          </div>
        </FadeIn>
      </section>

      <section className="px-6 md:px-12 py-20 md:py-28 max-w-4xl mx-auto w-full">
        <FadeIn>
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">
            Simple pricing.
          </h2>
          <p className="text-sm text-neutral-500 text-center mb-5">
            Per agent. Everything included.
          </p>
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-sm font-medium">
              <Users size={16} />
              Start with 1 agent — add more anytime as your needs grow.
            </div>
          </div>
        </FadeIn>

        {/* Founding 100 urgency banner */}
        <FadeIn delay={0.05}>
          <div className="max-w-2xl mx-auto mb-14">
            <div className="relative px-8 py-5 rounded-2xl bg-gradient-to-r from-emerald-500/[0.12] via-emerald-400/[0.08] to-emerald-500/[0.12] border border-emerald-500/25 shadow-[0_0_40px_rgba(16,185,129,0.12)] text-center">
              <div className="absolute inset-0 rounded-2xl bg-emerald-500/[0.03] animate-pulse-glow pointer-events-none" />
              <div className="relative z-10">
                <div className="text-lg md:text-xl font-bold text-white mb-1">
                  🔥 Founding 100 Pricing
                </div>
                <p className="text-sm text-emerald-300/90">
                  The first 100 sign-ups lock in the <span className="text-white font-semibold">lowest price forever</span>. It goes up after that — no exceptions.
                </p>
              </div>
            </div>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl mx-auto">
          {/* Monthly Plan */}
          <FadeIn delay={0.1}>
            <div className="glass-card p-7 relative overflow-hidden h-full flex flex-col">
              <div className="absolute top-4 right-4">
                <span className="text-[10px] px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                  FOUNDING
                </span>
              </div>
              <div className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-3">
                Monthly
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-bold text-white">$29</span>
                <span className="text-sm text-neutral-500">/mo</span>
              </div>
              <div className="flex items-center gap-2 mb-5">
                <span className="text-sm text-neutral-600 line-through">$39/mo</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold">
                  SAVE 26%
                </span>
              </div>
              <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
                Lock in <span className="text-white font-medium">$29/mo forever</span>. Price goes to $39/mo after the first 100 spots fill.
              </p>

              <div className="space-y-3 mb-8 flex-1">
                {[
                  "Your own private AI employee",
                  "Unlimited missions per month",
                  "Email, calendar, and tool integrations",
                  "Memory that improves over time",
                  "Priority support via Telegram",
                  "Access to private founder community",
                ].map((feat, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Check size={14} className="text-emerald-400 flex-shrink-0" />
                    <span className="text-xs text-neutral-300">{feat}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleHire}
                disabled={loading}
                className="w-full h-11 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-black rounded-full transition-all shadow-[0_0_30px_rgba(16,185,129,0.25)]"
              >
                {loading ? "Starting..." : "Hire for $29/mo →"}
              </Button>
            </div>
          </FadeIn>

          {/* Annual Plan */}
          <FadeIn delay={0.2}>
            <div className="glass-card p-7 relative overflow-hidden h-full flex flex-col border-emerald-500/30 glow">
              <div className="absolute top-4 right-4">
                <span className="text-[10px] px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold">
                  BEST VALUE
                </span>
              </div>
              <div className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-3">
                Annual
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-bold text-white">$199</span>
                <span className="text-sm text-neutral-500">/yr</span>
              </div>
              <div className="flex items-center gap-2 mb-5">
                <span className="text-sm text-neutral-600 line-through">$468/yr</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-semibold">
                  SAVE 57%
                </span>
              </div>
              <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
                That&apos;s <span className="text-white font-medium">$16.58/mo</span> — less than a lunch. Founding 100 only.
              </p>

              <div className="space-y-3 mb-8 flex-1">
                {[
                  "Everything in Monthly",
                  "Locked-in annual rate forever",
                  "Priority mission queue",
                  "Early access to new capabilities",
                  "Dedicated onboarding call",
                  "Founding member badge & perks",
                ].map((feat, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Check size={14} className="text-emerald-400 flex-shrink-0" />
                    <span className="text-xs text-neutral-300">{feat}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleHire}
                disabled={loading}
                className="w-full h-11 text-sm font-semibold bg-white hover:bg-neutral-100 text-black rounded-full transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)]"
              >
                {loading ? "Starting..." : "Go Annual — $199/yr →"}
              </Button>
            </div>
          </FadeIn>
        </div>

        {/* Spots remaining */}
        <FadeIn delay={0.3}>
          <div className="max-w-2xl mx-auto mt-8 text-center">
            <div className="inline-flex items-center gap-2 text-xs text-neutral-500">
              <div className="flex gap-[2px]">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-4 rounded-sm ${i < 12 ? "bg-emerald-500/60" : "bg-white/[0.06]"}`}
                  />
                ))}
              </div>
              <span>
                <span className="text-emerald-400 font-semibold">58 of 100</span> founding spots remaining
              </span>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ═══════════════════ COMMUNITY ═══════════════════ */}
      <section className="px-6 md:px-12 py-16 md:py-20 max-w-2xl mx-auto w-full">
        <FadeIn>
          <div className="glass-card p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.03] to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-5">
                <Users size={22} className="text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Private community included.
              </h3>
              <p className="text-sm text-neutral-400 max-w-sm mx-auto leading-relaxed mb-6">
                Connect with other founders using Employee Zero. Share prompts,
                workflows, and strategies that actually work.
              </p>
              <Button
                variant="outline"
                className="h-9 px-5 text-xs font-semibold rounded-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                asChild
              >
                <Link href="/login">Join the network</Link>
              </Button>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ═══════════════════ FAQ ═══════════════════ */}
      <section className="px-6 md:px-12 py-20 md:py-28 max-w-xl mx-auto w-full">
        <FadeIn>
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            Questions.
          </h2>
        </FadeIn>

        <div className="space-y-3">
          {[
            {
              q: "How is this different from ChatGPT?",
              a: "ChatGPT gives you text. Employee Zero does the actual work — sends emails, builds reports, manages your schedule. It's an employee, not a chatbot.",
            },
            {
              q: "Can I cancel at $29? That price is ridiculous.",
              a: "Cancel anytime. No contracts. And yes, $29/mo for a 24/7 AI employee is ridiculous — that's why we're locking it in for the first 100 founders before it goes up.",
            },
            {
              q: "Do I need to set anything up?",
              a: "Three steps: sign up, connect your tools, start giving it missions. Most founders are running their first mission within 5 minutes.",
            },
            {
              q: "Is my data private?",
              a: "Completely. Your AI is private to you. Your data never trains other models. We use enterprise-grade encryption and your information never leaves your workspace.",
            },
            {
              q: "What happens after I sign up?",
              a: "You get immediate access to your AI employee. Name it, connect your tools, and start delegating. We also drop you into our private founder community.",
            },
            {
              q: "Can I cancel?",
              a: "Yes, instantly. No hoops, no retention calls, no guilt trips. Cancel from your dashboard in one click.",
            },
          ].map((faq, i) => (
            <FadeIn key={i} delay={i * 0.05}>
              <FAQItem q={faq.q} a={faq.a} />
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer className="border-t border-white/[0.05] px-6 md:px-12 py-10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Zap size={14} className="text-emerald-400" />
            Employee Zero
          </div>
          <div className="flex items-center gap-8 text-[11px] text-neutral-500 font-medium">
            <Link
              href="#"
              className="hover:text-white transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="#"
              className="hover:text-white transition-colors"
            >
              Terms
            </Link>
            <Link
              href="#"
              className="hover:text-white transition-colors"
            >
              X
            </Link>
          </div>
          <div className="text-[10px] text-neutral-600 font-mono">
            © 2026 Employee Zero Core
          </div>
        </div>
      </footer>
    </div>
  );
}
