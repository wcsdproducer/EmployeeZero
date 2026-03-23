"use client";

import { useAuth } from "@/hooks/useAuth";
import { signInWithGoogle } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) return null;

  if (user) {
    router.push("/chat");
    return null;
  }

  return (
    <div className="min-h-screen bg-white text-black flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm text-center space-y-8"
      >
        <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tighter">Zero Terminal</h1>
            <p className="text-neutral-400 font-light">Authenticate to access your workspace.</p>
        </div>

        <div className="space-y-4">
            <Button
                onClick={() => signInWithGoogle()}
                className="w-full h-14 bg-black text-white hover:bg-neutral-800 rounded-2xl shadow-xl transition-all hover:scale-105"
            >
                Sign In with Google
            </Button>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-300 font-mono">
                SECURE AUTH GATEWAY
            </p>
        </div>
      </motion.div>
    </div>
  );
}
