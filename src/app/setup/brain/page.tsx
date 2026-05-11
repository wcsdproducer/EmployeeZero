"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { CURATED_MODELS, CuratedModel } from "@/lib/llmProvider";
import { Check, ExternalLink, Loader2, ChevronRight, Brain, Zap, ArrowRight } from "lucide-react";

// ─── Provider groups for the model picker ─────────────────────────────────────

const PROVIDER_ICONS: Record<string, { emoji: string; color: string }> = {
  Anthropic: { emoji: "🟠", color: "from-orange-500/20 to-amber-500/10 border-orange-500/20" },
  OpenAI:    { emoji: "🟢", color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/20" },
  Google:    { emoji: "🔵", color: "from-blue-500/20 to-sky-500/10 border-blue-500/20" },
  Meta:      { emoji: "⚡", color: "from-purple-500/20 to-violet-500/10 border-purple-500/20" },
};

const COST_LABEL = (tier: 1 | 2 | 3) =>
  tier === 1 ? "Budget-friendly" : tier === 2 ? "Mid-range" : "Premium";

const STEPS = [
  "Why connect?",
  "Create account",
  "Get your code",
  "Choose your AI",
  "Activate",
];

export default function BrainSetupPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState(0);
  const [selectedModel, setSelectedModel] = useState<CuratedModel | null>(
    CURATED_MODELS.find((m) => m.recommended) || null
  );
  const [connectionCode, setConnectionCode] = useState("");
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const providers = [...new Set(CURATED_MODELS.map((m) => m.provider))];

  async function handleActivate() {
    if (!user || !selectedModel || !connectionCode.trim()) return;
    setTesting(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/brain", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "save",
          apiKey: connectionCode.trim(),
          model: selectedModel.id,
          modelLabel: selectedModel.label,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Connection failed. Try copying your code again.");
      } else {
        setSuccess(true);
        setTimeout(() => router.push("/chat"), 2000);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i < step ? "bg-emerald-400" : i === step ? "bg-white scale-125" : "bg-white/10"
                }`}
              />
              {i < STEPS.length - 1 && (
                <div className={`w-6 h-px transition-all duration-300 ${i < step ? "bg-emerald-400/50" : "bg-white/10"}`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ─── Step 0: Why connect? ─────────────────────────────────────── */}
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="text-center space-y-8"
            >
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/10 border border-blue-500/20 rounded-3xl flex items-center justify-center">
                <Brain size={36} className="text-blue-400" />
              </div>
              <div className="space-y-4">
                <h1 className="text-3xl font-bold tracking-tight">Let's connect your AI</h1>
                <p className="text-neutral-400 leading-relaxed max-w-sm mx-auto">
                  Employee Zero runs on <strong className="text-white">your AI account</strong> — not ours.
                  Your costs go directly to your AI provider, never through us.
                </p>
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-left space-y-3 mt-4">
                  {[
                    { icon: "💡", text: "Most users spend $5–15/month — less than a streaming subscription" },
                    { icon: "🔒", text: "Your data stays yours — we never see your AI usage" },
                    { icon: "🔄", text: "One account gives you access to Claude, GPT-4o, Gemini & more" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-neutral-300">
                      <span>{item.icon}</span>
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setStep(1)}
                className="w-full h-14 bg-white text-black font-bold text-base rounded-2xl hover:bg-neutral-100 transition-all flex items-center justify-center gap-2"
              >
                Let's Go <ArrowRight size={18} />
              </button>
            </motion.div>
          )}

          {/* ─── Step 1: Create account ───────────────────────────────────── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="text-center space-y-8"
            >
              <div className="space-y-3">
                <h1 className="text-3xl font-bold tracking-tight">Create your free AI account</h1>
                <p className="text-neutral-400 text-sm max-w-sm mx-auto">
                  OpenRouter is a free gateway that connects you to every major AI — Claude, ChatGPT, Gemini, and more — with one account.
                </p>
              </div>
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  {["🟠 Claude", "🟢 ChatGPT", "🔵 Gemini"].map((ai) => (
                    <div key={ai} className="bg-white/5 rounded-xl p-3 text-sm font-medium">
                      {ai}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-neutral-500">+ 200 more models available</p>
              </div>
              <div className="space-y-3">
                <a
                  href="https://openrouter.ai/sign-up"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-14 bg-white text-black font-bold text-base rounded-2xl hover:bg-neutral-100 transition-all flex items-center justify-center gap-2"
                >
                  Create OpenRouter Account <ExternalLink size={16} />
                </a>
                <button
                  onClick={() => setStep(2)}
                  className="w-full h-12 bg-white/5 border border-white/10 text-neutral-300 font-medium text-sm rounded-2xl hover:bg-white/10 transition-all"
                >
                  I already have an account →
                </button>
              </div>
              <button onClick={() => setStep(2)} className="text-neutral-500 text-sm hover:text-neutral-300 transition-colors">
                Skip for now
              </button>
            </motion.div>
          )}

          {/* ─── Step 2: Get connection code ──────────────────────────────── */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="text-center space-y-8"
            >
              <div className="space-y-3">
                <h1 className="text-3xl font-bold tracking-tight">Get your connection code</h1>
                <p className="text-neutral-400 text-sm max-w-sm mx-auto">
                  Your connection code lets Employee Zero talk to your AI on your behalf.
                </p>
              </div>
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4 text-left">
                <ol className="space-y-3">
                  {[
                    "Click the button below to open OpenRouter",
                    "Click "Create Key" in the top right",
                    "Give it any name (e.g. "Employee Zero")",
                    "Copy the code — you'll paste it in the next step",
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-neutral-300">
                      <span className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="space-y-3">
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-14 bg-white text-black font-bold text-base rounded-2xl hover:bg-neutral-100 transition-all flex items-center justify-center gap-2"
                >
                  Get My Connection Code <ExternalLink size={16} />
                </a>
                <button
                  onClick={() => setStep(3)}
                  className="w-full h-12 bg-white/5 border border-white/10 text-neutral-300 font-medium text-sm rounded-2xl hover:bg-white/10 transition-all"
                >
                  I have my code →
                </button>
              </div>
            </motion.div>
          )}

          {/* ─── Step 3: Choose your AI ───────────────────────────────────── */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Choose your AI</h1>
                <p className="text-neutral-400 text-sm">You can change this anytime in settings.</p>
              </div>
              <div className="space-y-2">
                {providers.map((provider) => {
                  const providerModels = CURATED_MODELS.filter((m) => m.provider === provider);
                  const pIcon = PROVIDER_ICONS[provider] || { emoji: "⚡", color: "from-white/10 to-white/5 border-white/10" };
                  return (
                    <div key={provider}>
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5 px-1">
                        {pIcon.emoji} {provider}
                      </p>
                      <div className="space-y-1.5">
                        {providerModels.map((model) => (
                          <button
                            key={model.id}
                            onClick={() => setSelectedModel(model)}
                            className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                              selectedModel?.id === model.id
                                ? `bg-gradient-to-r ${pIcon.color} border-opacity-100`
                                : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10"
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-white">{model.label}</p>
                                {model.recommended && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
                                    RECOMMENDED
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-neutral-400 mt-0.5">{model.description}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-[10px] text-neutral-500">{COST_LABEL(model.costTier)}</span>
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                                selectedModel?.id === model.id ? "border-white bg-white" : "border-white/20"
                              }`}>
                                {selectedModel?.id === model.id && <Check size={10} className="text-black" />}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => setStep(4)}
                disabled={!selectedModel}
                className="w-full h-14 bg-white text-black font-bold text-base rounded-2xl hover:bg-neutral-100 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
              >
                Continue with {selectedModel?.label || "..."} <ChevronRight size={18} />
              </button>
            </motion.div>
          )}

          {/* ─── Step 4: Paste connection code ───────────────────────────── */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="space-y-8"
            >
              {success ? (
                <div className="text-center space-y-6 py-8">
                  <div className="mx-auto w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl flex items-center justify-center">
                    <Check size={36} className="text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedModel?.label} is ready.</h2>
                    <p className="text-neutral-400 text-sm mt-2">
                      Your AI costs go directly to your OpenRouter account.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm">
                    <Loader2 size={14} className="animate-spin" />
                    Starting your workspace...
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Paste your connection code</h1>
                    <p className="text-neutral-400 text-sm">
                      You'll activate {selectedModel?.label || "your AI"}.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-2">
                        Connection Code
                      </label>
                      <input
                        type="password"
                        value={connectionCode}
                        onChange={(e) => { setConnectionCode(e.target.value); setError(""); }}
                        placeholder="Paste your code here..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 transition-all font-mono text-sm"
                      />
                      {error && (
                        <p className="mt-2 text-sm text-red-400 flex items-center gap-2">
                          <span>⚠️</span> {error}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <Zap size={12} />
                      <span>Your code is encrypted and only used to route your requests</span>
                    </div>
                  </div>
                  <button
                    onClick={handleActivate}
                    disabled={!connectionCode.trim() || testing}
                    className="w-full h-14 bg-white text-black font-bold text-base rounded-2xl hover:bg-neutral-100 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                  >
                    {testing ? (
                      <><Loader2 size={18} className="animate-spin" /> Connecting...</>
                    ) : (
                      <>Activate My AI <ArrowRight size={18} /></>
                    )}
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="w-full text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
                  >
                    ← Change AI model
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
