"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { signInWithGoogle } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Check, Mail, Share2, User, Chrome, Twitter, Linkedin, ArrowRight, Zap, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleNext = () => setStep(prev => prev + 1);

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      handleNext();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = (provider: string) => {
    setLoading(true);
    // Simulation: in real world, this would call Twitter/LinkedIn OAuth
    setTimeout(() => {
      setLoading(false);
      router.push("/chat");
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 selection:bg-white selection:text-black">
      
      {/* Background Gradients */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-white/[0.03] blur-[120px] rounded-full -z-10" />

      <div className="w-full max-w-lg">
        
        {/* Progress Bar */}
        <div className="flex justify-center mb-16">
            <div className="flex gap-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className={cn(
                        "h-1 w-16 rounded-full transition-all duration-700",
                        step >= i ? "bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" : "bg-white/10"
                    )} />
                ))}
            </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="text-center space-y-8">
                <div className="mx-auto w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-2xl shadow-white/10 animate-float">
                    <Zap size={40} strokeWidth={2.5} className="text-black fill-black" />
                </div>
                <div className="space-y-3">
                    <h1 className="text-4xl font-bold tracking-tight">Activate your workspace.</h1>
                    <p className="text-neutral-500 text-lg font-medium max-w-sm mx-auto">
                        Connect your Google Workspace to give Employee Zero access to your tools.
                    </p>
                </div>
                
                <div className="pt-6">
                    <Button
                        onClick={handleGoogleAuth}
                        disabled={loading}
                        className="w-full h-16 bg-white text-black hover:bg-neutral-200 text-lg font-bold rounded-2xl group transition-all"
                    >
                        <Chrome size={20} className="mr-3" strokeWidth={3} />
                        {loading ? "Connecting..." : "Connect Google Suite"}
                        <ArrowRight size={20} className="ml-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </Button>
                    <p className="mt-6 text-xs font-mono text-neutral-600 uppercase tracking-widest">
                        OAuth 2.0 Secure • No data sold
                    </p>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="text-center space-y-8">
                <div className="mx-auto w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-2xl shadow-white/10 animate-float">
                    <Share2 size={36} strokeWidth={2.5} className="text-black" />
                </div>
                <div className="space-y-3">
                    <h1 className="text-4xl font-bold tracking-tight">Social Presence.</h1>
                    <p className="text-neutral-500 text-lg font-medium max-w-sm mx-auto">
                        Allow Employee Zero to publish content and engage with your community.
                    </p>
                </div>
                
                <div className="grid grid-cols-1 gap-4 pt-6">
                    <Button
                        onClick={() => handleSocialAuth("twitter")}
                        disabled={loading}
                        variant="outline"
                        className="h-16 border-white/10 bg-white/5 hover:bg-white hover:text-black text-lg font-bold rounded-2xl transition-all"
                    >
                        <Twitter size={20} className="mr-3" />
                        Connect X / Twitter
                    </Button>
                    <Button
                        onClick={() => handleSocialAuth("linkedin")}
                        disabled={loading}
                        variant="outline"
                        className="h-16 border-white/10 bg-white/5 hover:bg-white hover:text-black text-lg font-bold rounded-2xl transition-all"
                    >
                        <Linkedin size={20} className="mr-3" />
                        Connect LinkedIn
                    </Button>
                    <Button
                        onClick={handleNext}
                        variant="ghost"
                        className="h-12 text-neutral-500 hover:text-white mt-4"
                    >
                        Skip for now
                    </Button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
            >
              <div className="text-center space-y-10">
                 <div className="mx-auto w-24 h-24 bg-white/5 border border-white/10 rounded-full flex items-center justify-center shadow-2xl shadow-white/5 relative">
                    <Bot size={48} className="text-white animate-pulse" />
                    <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full -z-10" />
                 </div>
                 <div className="space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight">System Ready.</h1>
                    <p className="text-neutral-400 text-lg font-medium max-w-xs mx-auto">
                        Employee Zero is initialized and awaiting your first mission.
                    </p>
                 </div>
                 <Button
                    onClick={() => router.push("/chat")}
                    className="w-full h-16 bg-white text-black hover:bg-neutral-200 text-lg font-bold rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.15)] transition-all"
                 >
                    Enter Terminal
                 </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="fixed bottom-12 text-[10px] font-mono text-neutral-700 uppercase tracking-[0.3em]">
        Verified Secure Protocol • 256-bit AES
      </footer>
    </div>
  );
}
