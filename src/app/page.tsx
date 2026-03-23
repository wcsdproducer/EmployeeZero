"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { RobotVisual } from "@/components/RobotVisual";
import { ArrowRight, Zap } from "lucide-react";

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
      {/* Minimalist Background */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-white/[0.02] blur-[120px] rounded-full -z-10" />

      {/* Nav */}
      <nav className="p-8 flex justify-between items-center z-50">
        <div className="text-sm font-medium tracking-tighter uppercase flex items-center gap-2">
            <Zap size={14} className="fill-white" />
            Employee Zero
        </div>
        <div className="flex gap-8 text-[11px] text-neutral-500 font-medium uppercase tracking-widest">
            <Link href="/login" className="hover:text-white transition-colors">Log In</Link>
            <Link href="#" className="hover:text-white transition-colors">Docs</Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10">
        <div className="space-y-16 max-w-4xl">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                className="flex justify-center"
            >
                <RobotVisual />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4"
            >
                <h1 className="text-6xl md:text-9xl font-bold tracking-tight leading-[0.85] bg-clip-text text-transparent bg-gradient-to-b from-white to-white/30">
                    Your first <br /> AI employee.
                </h1>
                <p className="text-lg md:text-xl text-neutral-500 max-w-sm mx-auto leading-relaxed font-medium">
                    Available 24/7. Focus on strategy, <br className="hidden md:block" /> while we handle the rest.
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 1 }}
                className="flex flex-col items-center gap-8"
            >
                <Button
                    onClick={handleHire}
                    disabled={loading}
                    className="h-14 px-12 text-sm font-bold bg-white text-black hover:bg-neutral-200 transition-all rounded-full shadow-[0_0_50px_rgba(255,255,255,0.05)] group uppercase tracking-widest"
                >
                    {loading ? "INITIALIZING..." : "Hire for $29/mo"}
                    <ArrowRight size={16} className="ml-3 group-hover:translate-x-1 transition-transform" />
                </Button>
                
                <div className="text-[10px] text-neutral-600 font-mono uppercase tracking-[0.3em]">
                    Powered by GravityClaw Gemini 1.5 Pro
                </div>
            </motion.div>
        </div>
      </main>

      <footer className="p-12 text-[9px] font-mono text-neutral-700 flex justify-between items-center uppercase tracking-[0.3em]">
        <div>© 2026 Employee Zero Core</div>
        <div className="flex gap-12">
          <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
          <Link href="#" className="hover:text-white transition-colors">X / LN</Link>
        </div>
      </footer>
    </div>
  );
}
