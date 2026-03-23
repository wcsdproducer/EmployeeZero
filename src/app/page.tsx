"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function LandingPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleHire = async () => {
    setLoading(true);
    try {
      // Simulate/trigger Stripe Checkout
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid || "guest",
          email: user?.email || "guest@example.com",
          plan: "founding-100", // Using the existing plan from the API
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        // Fallback if Stripe not configured or error
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
    <div className="flex flex-col min-h-screen bg-white text-black selection:bg-black selection:text-white">
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-6 max-w-2xl"
        >
          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter leading-none">
            Employee Zero
          </h1>
          <p className="text-xl md:text-2xl font-light text-neutral-500 max-w-lg mx-auto leading-relaxed">
            The autonomous AI workforce for startups that want to ship faster.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
        >
          <Button
            onClick={handleHire}
            disabled={loading}
            className="h-16 px-12 text-lg font-medium bg-black text-white hover:bg-neutral-800 transition-all rounded-full shadow-2xl hover:scale-105 active:scale-95"
          >
            {loading ? "Preparing..." : "Hire Employee Zero ($29/mo)"}
          </Button>
        </motion.div>
      </main>

      <footer className="p-8 text-xs font-mono text-neutral-400 flex justify-between items-center uppercase tracking-widest">
        <div>GravityClaw Digital Products</div>
        <div className="flex gap-6">
          <Link href="/login" className="hover:text-black">Sign In</Link>
          <Link href="#" className="hover:text-black">Privacy</Link>
        </div>
      </footer>
    </div>
  );
}
