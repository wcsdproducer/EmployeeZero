"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { signInWithGoogle, signInWithEmail, signUpWithEmail, auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Mail, ArrowRight, Zap, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const AVATARS = [
  { id: "bolt", emoji: "⚡", label: "Bolt", bg: "from-yellow-500/20 to-orange-500/20" },
  { id: "ghost", emoji: "👻", label: "Ghost", bg: "from-purple-500/20 to-indigo-500/20" },
  { id: "rocket", emoji: "🚀", label: "Rocket", bg: "from-blue-500/20 to-cyan-500/20" },
  { id: "brain", emoji: "🧠", label: "Brain", bg: "from-pink-500/20 to-rose-500/20" },
  { id: "robot", emoji: "🤖", label: "Robot", bg: "from-green-500/20 to-emerald-500/20" },
  { id: "fire", emoji: "🔥", label: "Fire", bg: "from-red-500/20 to-orange-500/20" },
  { id: "crystal", emoji: "💎", label: "Crystal", bg: "from-cyan-500/20 to-blue-500/20" },
  { id: "star", emoji: "⭐", label: "Star", bg: "from-amber-500/20 to-yellow-500/20" },
  { id: "alien", emoji: "👾", label: "Alien", bg: "from-violet-500/20 to-purple-500/20" },
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [email, setEmailInput] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [error, setError] = useState<string | null>(null);

  // Step 2 state
  const [userName, setUserName] = useState("");
  const [employeeName, setEmployeeName] = useState("");

  // Step 3 state
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

  const router = useRouter();

  const handleNext = () => setStep(prev => prev + 1);

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await signInWithGoogle();
      if (user) {
        // Pre-fill the user name from Google profile
        if (user.displayName) setUserName(user.displayName);
        setLoading(false);
        handleNext();
      }
    } catch (err) {
      console.error(err);
      setError("Google sign-in failed. Please try again.");
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (authMode === "signup") {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      setLoading(false);
      handleNext();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
        setError("Invalid email or password.");
      } else if (code === "auth/email-already-in-use") {
        setError("Account already exists. Try signing in instead.");
        setAuthMode("login");
      } else if (code === "auth/weak-password") {
        setError("Password must be at least 6 characters.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        await setDoc(doc(db, "users", user.uid), {
          name: userName,
          email: user.email || email,
          employeeName,
          avatar: selectedAvatar || "robot",
          onboardedAt: new Date().toISOString(),
          plan: "free",
        }, { merge: true });
      }
      router.push("/chat");
    } catch (err) {
      console.error("Failed to save profile:", err);
      router.push("/chat");
    }
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
          {/* ─── STEP 1: Auth ─── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="text-center space-y-6">
                <div className="mx-auto w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-2xl shadow-white/10 animate-float">
                    <Zap size={40} strokeWidth={2.5} className="text-black fill-black" />
                </div>
                <div className="space-y-3">
                    <h1 className="text-4xl font-bold tracking-tight">Activate your workspace.</h1>
                    <p className="text-neutral-500 text-lg font-medium max-w-sm mx-auto">
                        Sign in to give Employee Zero access to your tools.
                    </p>
                </div>
                
                {/* Google button */}
                <div className="pt-4">
                    <Button
                        onClick={handleGoogleAuth}
                        disabled={loading}
                        className="w-full h-16 bg-white text-black hover:bg-neutral-200 text-lg font-bold rounded-2xl group transition-all"
                    >
                        <svg className="mr-3 w-5 h-5" viewBox="0 0 48 48">
                          <path d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" fill="#FFC107"/>
                          <path d="M5.3 14.7l7.1 5.2C14.5 16 18.9 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 15.4 2 8.1 7.3 5.3 14.7z" fill="#FF3D00"/>
                          <path d="M24 46c5.4 0 10.3-1.8 14.1-5l-6.5-5.5C29.6 37.1 27 38 24 38c-6 0-10.6-3-12.7-8.3l-7 5.4C7.5 42 15.2 46 24 46z" fill="#4CAF50"/>
                          <path d="M46 24c0-1.3-.2-2.7-.5-4H24v8.5h11.8c-.9 2.3-2.4 4.2-4.4 5.5l6.5 5.5C42.5 35.5 46 30 46 24z" fill="#1976D2"/>
                        </svg>
                        {loading ? "Connecting..." : "Continue with Google"}
                        <ArrowRight size={20} className="ml-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </Button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-4 pt-1">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-[10px] text-neutral-600 font-mono uppercase tracking-widest">or</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* Email form */}
                <form onSubmit={handleEmailAuth} className="space-y-3 text-left">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmailInput(e.target.value); setError(null); }}
                    placeholder="Email address"
                    required
                    className="w-full h-14 px-4 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    placeholder="Password"
                    required
                    minLength={6}
                    className="w-full h-14 px-4 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                  />
                  {error && (
                    <p className="text-xs text-red-400 font-medium px-1">{error}</p>
                  )}
                  <Button
                    type="submit"
                    disabled={loading || !email || !password}
                    className="w-full h-14 bg-white/[0.08] border border-white/10 hover:bg-white/[0.15] text-white rounded-2xl text-base font-bold transition-all disabled:opacity-30"
                  >
                    {loading ? (
                      <Loader2 size={18} className="animate-spin mr-2" />
                    ) : (
                      <Mail size={18} className="mr-2" />
                    )}
                    {authMode === "signup" ? "Sign Up with Email" : "Sign In with Email"}
                  </Button>
                  <p className="text-center text-xs text-neutral-600 pt-1">
                    {authMode === "signup" ? (
                      <>Already have an account?{" "}
                        <button type="button" onClick={() => { setAuthMode("login"); setError(null); }} className="text-white font-semibold hover:underline underline-offset-2">Sign in</button>
                      </>
                    ) : (
                      <>Don&apos;t have an account?{" "}
                        <button type="button" onClick={() => { setAuthMode("signup"); setError(null); }} className="text-white font-semibold hover:underline underline-offset-2">Sign up</button>
                      </>
                    )}
                  </p>
                </form>

                <p className="mt-4 text-xs font-mono text-neutral-600 uppercase tracking-widest">
                    OAuth 2.0 Secure • No data sold
                </p>
              </div>
            </motion.div>
          )}

          {/* ─── STEP 2: Name Setup ─── */}
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
                    <Sparkles size={36} strokeWidth={2.5} className="text-black" />
                </div>
                <div className="space-y-3">
                    <h1 className="text-4xl font-bold tracking-tight">Name your team.</h1>
                    <p className="text-neutral-500 text-lg font-medium max-w-sm mx-auto">
                        Tell us who you are and give your AI employee an identity.
                    </p>
                </div>
                
                <div className="space-y-4 pt-2">
                  <div className="text-left">
                    <label className="text-xs text-neutral-500 font-mono uppercase tracking-widest mb-2 block px-1">Your Name</label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="e.g. Jack Freeman"
                      autoFocus
                      className="w-full h-14 px-4 bg-white/[0.05] border border-white/10 rounded-xl text-base text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                    />
                  </div>
                  <div className="text-left">
                    <label className="text-xs text-neutral-500 font-mono uppercase tracking-widest mb-2 block px-1">Employee Name</label>
                    <input
                      type="text"
                      value={employeeName}
                      onChange={(e) => setEmployeeName(e.target.value)}
                      placeholder="e.g. Nova, Atlas, Echo..."
                      className="w-full h-14 px-4 bg-white/[0.05] border border-white/10 rounded-xl text-base text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleNext}
                  disabled={!userName.trim() || !employeeName.trim()}
                  className="w-full h-16 bg-white text-black hover:bg-neutral-200 text-lg font-bold rounded-2xl group transition-all mt-4 disabled:opacity-30"
                >
                  Continue
                  <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ─── STEP 3: Avatar Selection ─── */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="text-center space-y-8">
                <div className="space-y-3">
                    <div className="mx-auto w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center shadow-2xl shadow-white/5 relative">
                      <span className="text-4xl">{selectedAvatar ? AVATARS.find(a => a.id === selectedAvatar)?.emoji : "🤖"}</span>
                      <div className="absolute inset-0 bg-white/10 blur-2xl rounded-full -z-10" />
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight">
                      Choose {employeeName}&apos;s look.
                    </h1>
                    <p className="text-neutral-500 text-lg font-medium max-w-sm mx-auto">
                        Pick an avatar that represents your AI employee.
                    </p>
                </div>
                
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {AVATARS.map((avatar) => (
                    <button
                      key={avatar.id}
                      onClick={() => setSelectedAvatar(avatar.id)}
                      className={cn(
                        "relative flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border transition-all duration-300 cursor-pointer group",
                        selectedAvatar === avatar.id
                          ? "border-white bg-white/10 shadow-[0_0_30px_rgba(255,255,255,0.1)] scale-105"
                          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20"
                      )}
                    >
                      <span className="text-3xl group-hover:scale-110 transition-transform">{avatar.emoji}</span>
                      <span className={cn(
                        "text-xs font-medium transition-colors",
                        selectedAvatar === avatar.id ? "text-white" : "text-neutral-500"
                      )}>{avatar.label}</span>
                    </button>
                  ))}
                </div>

                <Button
                  onClick={handleFinish}
                  disabled={!selectedAvatar || loading}
                  className="w-full h-16 bg-white text-black hover:bg-neutral-200 text-lg font-bold rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.15)] transition-all disabled:opacity-30"
                >
                  {loading ? (
                    <Loader2 size={20} className="animate-spin mr-2" />
                  ) : null}
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
