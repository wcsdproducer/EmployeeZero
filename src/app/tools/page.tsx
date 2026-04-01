"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Zap, Mail, ArrowRight, Search, FileText, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";

const tools = [
  {
    slug: "email-drafter",
    icon: Mail,
    title: "AI Email Drafter",
    description: "Paste any email, get a professional reply in seconds.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    live: true,
  },
  {
    slug: "competitor-research",
    icon: Search,
    title: "Competitor Research Report",
    description: "Get a full competitive analysis for your industry.",
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
    live: true,
  },
  {
    slug: "meeting-prep",
    icon: FileText,
    title: "Meeting Prep Brief",
    description: "Auto-generate a briefing doc before any meeting.",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    live: true,
  },
  {
    slug: "roi-calculator",
    icon: Calculator,
    title: "AI ROI Calculator",
    description: "See how many hours AI can save your business.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    live: true,
  },
];

export default function ToolsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0a0e1a] text-white font-sans">
      <div className="fixed top-[-200px] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-emerald-500/[0.04] blur-[150px] rounded-full -z-10 pointer-events-none" />

      <nav className="p-6 md:px-12 flex justify-between items-center z-50 border-b border-white/[0.05]">
        <Link href="/" className="text-sm font-bold tracking-tight flex items-center gap-2">
          <Zap size={16} className="text-emerald-400" />
          Employee Zero
        </Link>
        <Button className="h-8 px-4 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black rounded-full" asChild>
          <Link href="/login">Get Started</Link>
        </Button>
      </nav>

      <section className="px-6 md:px-12 pt-16 pb-8 max-w-4xl mx-auto w-full text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Free AI Tools</h1>
          <p className="text-sm text-neutral-400 max-w-md mx-auto">
            Try what Employee Zero can do — no signup required. Each tool is a taste of what your AI employee handles all day, every day.
          </p>
        </motion.div>
      </section>

      <section className="px-6 md:px-12 pb-20 max-w-4xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tools.map((tool, i) => (
            <motion.div
              key={tool.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              {tool.live ? (
                <Link href={`/tools/${tool.slug}`} className="block h-full">
                  <div className="h-full p-6 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-emerald-500/30 transition-all group cursor-pointer">
                    <div className={`w-10 h-10 rounded-lg ${tool.bg} border ${tool.border} flex items-center justify-center mb-4`}>
                      <tool.icon size={18} className={tool.color} />
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-emerald-400 transition-colors">
                      {tool.title}
                    </h3>
                    <p className="text-xs text-neutral-400 mb-3">{tool.description}</p>
                    <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                      Try it free <ArrowRight size={10} />
                    </span>
                  </div>
                </Link>
              ) : (
                <div className="h-full p-6 rounded-xl bg-white/[0.02] border border-white/[0.06] opacity-60">
                  <div className={`w-10 h-10 rounded-lg ${tool.bg} border ${tool.border} flex items-center justify-center mb-4`}>
                    <tool.icon size={18} className={tool.color} />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">{tool.title}</h3>
                  <p className="text-xs text-neutral-400 mb-3">{tool.description}</p>
                  <span className="text-[10px] text-neutral-600 font-medium">Coming soon</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="mt-auto border-t border-white/[0.05] px-6 py-6 text-center">
        <p className="text-xs text-neutral-600">© 2026 Employee Zero</p>
      </footer>
    </div>
  );
}
