"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { RobotVisual } from "@/components/RobotVisual";
import { ArrowRight, ChevronRight, Zap } from "lucide-react";

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
    } catch (err) {
      console.error(err);
      window.location.href = "/onboarding";
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white selection:bg-white selection:text-black overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-white/[0.03] blur-[120px] rounded-full -z-10" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-white/[0.02] blur-[100px] rounded-full -z-10" />

      {/* Nav */}
      <nav className="p-8 flex justify-between items-center z-50">
        <div className="text-sm font-medium tracking-tighter uppercase flex items-center gap-2">
            <Zap size={14} className="fill-white" />
            Employee Zero
        </div>
        <div className="flex gap-8 text-[13px] text-neutral-500 font-medium">
            <Link href="/login" className="hover:text-white transition-colors">Log In</Link>
            <Link href="#" className="hover:text-white transition-colors">Documentation</Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10">
        <div className="space-y-12 max-w-4xl">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="flex justify-center"
            >
                <RobotVisual />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
            >
                <h1 className="text-5xl md:text-8xl font-bold tracking-tight leading-[0.9] bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/40">
                    Hire your first AI <br /> employee in 60 seconds.
                </h1>
                <p className="text-lg md:text-xl text-neutral-500 max-w-lg mx-auto leading-relaxed font-medium">
                    The autonomous AI workforce for founders <br className="hidden md:block" /> who want to focus on strategy, not tasks.
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 1 }}
                className="flex flex-col items-center gap-6"
            >
                <Button
                    onClick={handleHire}
                    disabled={loading}
                    className="h-16 px-10 text-base font-semibold bg-white text-black hover:bg-neutral-200 transition-all rounded-full shadow-[0_0_40px_rgba(255,255,255,0.1)] group"
                >
                    {loading ? "Initializing..." : "Hire for $29/mo"}
                    <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                
                <div className="flex items-center gap-2 text-xs text-neutral-600 font-mono uppercase tracking-[0.2em]">
                    <ChevronRight size={12} /> Powered by GravityClaw Gemini 1.5 Pro
                </div>
            </motion.div>
        </div>
      </main>

      <footer className="p-12 text-[10px] font-mono text-neutral-600 flex justify-between items-center uppercase tracking-[0.2em] border-t border-white/[0.05]">
        <div>© 2026 Employee Zero Core</div>
        <div className="flex gap-8">
          <Link href="#" className="hover:text-white transition-colors">Terms</Link>
          <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
          <Link href="#" className="hover:text-white transition-colors">X / LinkedIn</Link>
        </div>
      </footer>
    </div>
  );
}
