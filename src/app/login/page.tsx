"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Mail, Zap, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.push("/chat");
    }
  }, [user, authLoading, router]);

  if (authLoading || user) return null;

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!tosAccepted) {
          setError("You must accept the Terms of Service to create an account.");
          setLoading(false);
          return;
        }
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      router.push("/chat");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
        setError("Invalid email or password.");
      } else if (code === "auth/email-already-in-use") {
        setError("Account already exists. Try signing in.");
      } else if (code === "auth/weak-password") {
        setError("Password must be at least 6 characters.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (mode === "signup" && !tosAccepted) {
      setError("You must accept the Terms of Service to create an account.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result) {
        router.push("/chat");
      }
      // If null, redirect is happening — page will reload
    } catch {
      setError("Google sign-in failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
      {/* Background glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-white/[0.02] blur-[120px] rounded-full -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm space-y-8"
      >
        {/* Logo + heading */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl shadow-white/10">
            <Zap size={32} strokeWidth={2.5} className="text-black fill-black" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {mode === "login" ? "Welcome back." : "Create your account."}
            </h1>
            <p className="text-neutral-500 text-sm mt-1">
              {mode === "login"
                ? "Sign in to access your workspace."
                : "Start with your first AI employee."}
            </p>
          </div>
        </div>

        {/* Google button */}
        <Button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full h-14 bg-white text-black hover:bg-neutral-200 rounded-2xl text-sm font-bold shadow-xl transition-all group"
        >
          <svg className="mr-3 w-5 h-5" viewBox="0 0 48 48">
            <path d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" fill="#FFC107"/>
            <path d="M5.3 14.7l7.1 5.2C14.5 16 18.9 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 15.4 2 8.1 7.3 5.3 14.7z" fill="#FF3D00"/>
            <path d="M24 46c5.4 0 10.3-1.8 14.1-5l-6.5-5.5C29.6 37.1 27 38 24 38c-6 0-10.6-3-12.7-8.3l-7 5.4C7.5 42 15.2 46 24 46z" fill="#4CAF50"/>
            <path d="M46 24c0-1.3-.2-2.7-.5-4H24v8.5h11.8c-.9 2.3-2.4 4.2-4.4 5.5l6.5 5.5C42.5 35.5 46 30 46 24z" fill="#1976D2"/>
          </svg>
          Continue with Google
          <ArrowRight size={16} className="ml-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </Button>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[10px] text-neutral-600 font-mono uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmail} className="space-y-3">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              placeholder="Email address"
              required
              className="w-full h-13 px-4 py-3.5 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              placeholder="Password"
              required
              minLength={6}
              className="w-full h-13 px-4 py-3.5 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
            />
          </div>

          {mode === "signup" && (
            <label className="flex items-start gap-3 px-1 cursor-pointer group">
              <input
                type="checkbox"
                checked={tosAccepted}
                onChange={(e) => { setTosAccepted(e.target.checked); setError(null); }}
                className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/5 accent-white cursor-pointer"
              />
              <span className="text-xs text-neutral-500 leading-relaxed group-hover:text-neutral-400 transition-colors">
                I agree to the{" "}
                <Link href="/terms" target="_blank" className="text-white hover:underline underline-offset-2">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" target="_blank" className="text-white hover:underline underline-offset-2">
                  Privacy Policy
                </Link>
              </span>
            </label>
          )}

          {error && (
            <p className="text-xs text-red-400 font-medium px-1">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading || !email || !password || (mode === "signup" && !tosAccepted)}
            className="w-full h-14 bg-white/[0.08] border border-white/10 hover:bg-white/[0.15] text-white rounded-2xl text-sm font-bold transition-all disabled:opacity-30"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin mr-2" />
            ) : (
              <Mail size={16} className="mr-2" />
            )}
            {mode === "login" ? "Sign In with Email" : "Create Account"}
          </Button>
        </form>

        {/* Toggle mode */}
        <p className="text-center text-xs text-neutral-600">
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                onClick={() => { setMode("signup"); setError(null); }}
                className="text-white font-semibold hover:underline underline-offset-2"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => { setMode("login"); setError(null); }}
                className="text-white font-semibold hover:underline underline-offset-2"
              >
                Sign in
              </button>
            </>
          )}
        </p>

        <div className="text-center space-y-2">
          <p className="text-[10px] font-mono text-neutral-700 uppercase tracking-[0.2em]">
            Secure Auth Gateway • 256-bit AES
          </p>
          <p className="text-[10px] text-neutral-600">
            <Link href="/terms" className="hover:text-neutral-400 transition-colors">Terms of Service</Link>
            <span className="mx-2">•</span>
            <Link href="/privacy" className="hover:text-neutral-400 transition-colors">Privacy Policy</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
