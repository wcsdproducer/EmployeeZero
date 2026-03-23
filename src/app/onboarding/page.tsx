"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { signInWithGoogle } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Check, Mail, Share2, User } from "lucide-react";

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [aiName, setAiName] = useState("");
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

  const handleSocialAuth = () => {
    setLoading(true);
    // Simulation: in real world, this would call Twitter/LinkedIn OAuth
    setTimeout(() => {
      setLoading(false);
      router.push("/chat");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-12">
            <div className="flex gap-2">
                {[1, 2, 3].map((i) => (
                    <div key={i} className={`h-1.5 w-12 rounded-full transition-all duration-500 ${step >= i ? "bg-black" : "bg-neutral-200"}`} />
                ))}
            </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="border-none shadow-2xl">
                <CardHeader className="text-center">
                  <div className="mx-auto w-12 h-12 bg-black rounded-full flex items-center justify-center mb-4 text-white">
                    <User size={20} />
                  </div>
                  <CardTitle className="text-2xl font-bold">Name Your AI</CardTitle>
                  <CardDescription>What should your AI employee call itself?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="e.g., Jarvis, Zero, Sentinel"
                    value={aiName}
                    onChange={(e) => setAiName(e.target.value)}
                    className="h-12 text-center text-lg focus-visible:ring-black"
                    autoFocus
                  />
                  <Button
                    onClick={handleNext}
                    disabled={!aiName.trim()}
                    className="w-full h-12 bg-black text-white hover:bg-neutral-800 rounded-xl"
                  >
                    Continue
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="border-none shadow-2xl">
                <CardHeader className="text-center">
                  <div className="mx-auto w-12 h-12 bg-black rounded-full flex items-center justify-center mb-4 text-white">
                    <Mail size={20} />
                  </div>
                  <CardTitle className="text-2xl font-bold">Connect Identity</CardTitle>
                  <CardDescription>We'll use Google to secure your workspace.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={handleGoogleAuth}
                    disabled={loading}
                    variant="outline"
                    className="w-full h-12 flex items-center justify-center gap-3 rounded-xl border-neutral-200"
                  >
                    {loading ? "Authorizing..." : (
                        <>
                          <svg className="h-4 w-4" viewBox="0 0 24 24">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                          Connect with Google
                        </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="border-none shadow-2xl">
                <CardHeader className="text-center">
                  <div className="mx-auto w-12 h-12 bg-black rounded-full flex items-center justify-center mb-4 text-white">
                    <Share2 size={20} />
                  </div>
                  <CardTitle className="text-2xl font-bold">Connect Socials</CardTitle>
                  <CardDescription>Authorize {aiName} to post to X and LinkedIn.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={handleSocialAuth}
                    disabled={loading}
                    className="w-full h-12 bg-black text-white hover:bg-neutral-800 rounded-xl"
                  >
                    {loading ? "Connecting..." : "Connect Social Profiles"}
                  </Button>
                  <button
                    onClick={() => router.push("/chat")}
                    className="w-full text-xs text-neutral-400 hover:text-black transition-colors"
                  >
                    Skip for now
                  </button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
