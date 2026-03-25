"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { Send, Plus, History, Brain, Loader2, User, Bot, CheckCircle2, Circle, PanelLeftOpen, Search, Settings, MoreHorizontal, ArrowUp, Zap, Eye, Shield, Sparkles, X, Check, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, addDoc, Timestamp, doc, getDoc, updateDoc } from "firebase/firestore";

interface AgentDoc {
  id: string;
  name: string;
  avatar: string;
  status: string; // "active" | "pending_setup"
  plan: string;
}

interface Mission {
  id: string;
  task: string;
  status: string;
  result?: string;
  createdAt: any;
  steps?: string[];
  userId: string;
  workspace: string;
}

const AVATAR_EMOJIS: Record<string, string> = {
  bolt: "⚡", ghost: "👻", rocket: "🚀", brain: "🧠", robot: "🤖",
  fire: "🔥", crystal: "💎", star: "⭐", alien: "👾",
};

function getAgents(employeeName: string, avatarId: string | null) {
  const emoji = AVATAR_EMOJIS[avatarId || "robot"] || "🤖";
  return [
    { id: "primary", name: employeeName, icon: <span className="text-sm">{emoji}</span>, color: "text-blue-400", emoji },
  ];
}

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  const [input, setInput] = useState("");
  const [missions, setMissions] = useState<Mission[]>([]);
  const [activeMissionId, setActiveMissionId] = useState<string | null>(null);
  const [employeeName, setEmployeeName] = useState("Employee Zero");
  const [employeeAvatar, setEmployeeAvatar] = useState<string | null>(null);
  const agents = getAgents(employeeName, employeeAvatar);
  const [selectedAgentId, setSelectedAgentId] = useState("primary");
  const selectedAgent = agents.find(a => a.id === selectedAgentId) || agents[0];
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showHireModal, setShowHireModal] = useState(false);
  const [foundingCount, setFoundingCount] = useState<number | null>(null);
  const [purchasedAgents, setPurchasedAgents] = useState<AgentDoc[]>([]);
  const [setupAgent, setSetupAgent] = useState<AgentDoc | null>(null);
  const [setupName, setSetupName] = useState("");
  const [setupAvatar, setSetupAvatar] = useState("robot");

  const FOUNDING_LIMIT = 100;
  const FOUNDING_PRICE = 29;
  const REGULAR_PRICE = 39;
  const isFoundingAvailable = foundingCount !== null && foundingCount < FOUNDING_LIMIT;
  const slotsRemaining = foundingCount !== null ? Math.max(0, FOUNDING_LIMIT - foundingCount) : null;

  // Build full agents list: primary + purchased
  const allAgents = [
    ...agents,
    ...purchasedAgents
      .filter(a => a.status === "active")
      .map(a => ({
        id: a.id,
        name: a.name,
        icon: <span className="text-sm">{AVATAR_EMOJIS[a.avatar] || "🤖"}</span>,
        color: "text-blue-400" as const,
        emoji: AVATAR_EMOJIS[a.avatar] || "🤖",
      })),
  ];

  // Fetch user profile for employee name
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.employeeName) setEmployeeName(data.employeeName);
        if (data.avatar) setEmployeeAvatar(data.avatar);
      }
    });
  }, [user]);

  // Real-time founding count listener
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, "config", "pricing"), (snap) => {
      if (snap.exists()) {
        setFoundingCount(snap.data().foundingCount ?? 0);
      } else {
        setFoundingCount(0);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Listen for purchased agents in subcollection
  useEffect(() => {
    if (!user) return;
    const agentsRef = collection(db, "users", user.uid, "agents");
    const unsubscribe = onSnapshot(agentsRef, (snapshot) => {
      const agentList = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as AgentDoc[];
      setPurchasedAgents(agentList);

      // Auto-open setup modal for any pending agent
      const pending = agentList.find(a => a.status === "pending_setup");
      if (pending) {
        setSetupAgent(pending);
        setSetupName("");
        setSetupAvatar("robot");
      }
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "missions"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const missionData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Mission[];
      setMissions(missionData);
    });
    
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [missions]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || !user || submitting) return;

    const task = input.trim();
    setInput("");
    setSubmitting(true);

    try {
      const docRef = await addDoc(collection(db, "missions"), {
        userId: user.uid,
        task,
        status: "queued",
        createdAt: Timestamp.now(),
        workspace: selectedAgent.id,
      });
      setActiveMissionId(docRef.id);
    } catch (err) {
      console.error("Failed to submit mission", err);
    } finally {
      setSubmitting(false);
    }
  };

  const activeMission = missions.find(m => m.id === activeMissionId);
  const runningMission = missions.find(m => ["running", "processing", "queued"].includes(m.status));

  if (authLoading) return <div className="h-screen flex items-center justify-center font-mono uppercase tracking-widest animate-pulse bg-[#050505] text-white">Initializing Employee Zero...</div>;
  if (!user) return <div className="h-screen flex items-center justify-center bg-[#050505] text-white">Please sign in to access the terminal.</div>;

  return (
    <div className="flex h-screen bg-[#0d0d0d] text-white selection:bg-white selection:text-black overflow-hidden font-sans">
      
      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex-shrink-0 bg-[#000000] flex flex-col border-r border-white/5"
          >
            <div className="p-3 space-y-4">
              <Button 
                variant="ghost" 
                className="w-full justify-between gap-2 border border-white/10 hover:bg-white/5 rounded-lg px-3 py-6 group"
                onClick={() => setActiveMissionId(null)}
              >
                <div className="flex items-center gap-3 font-medium">
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-black">
                    <Plus size={14} strokeWidth={3} />
                  </div>
                  New Mission
                </div>
              </Button>

              <div className="space-y-1">
                <p className="px-3 text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Active Workforce</p>
                {allAgents.map((agent) => (
                    <button
                        key={agent.id}
                        onClick={() => setSelectedAgentId(agent.id)}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group",
                            selectedAgent.id === agent.id ? "bg-white/10 text-white" : "text-neutral-500 hover:bg-white/5 hover:text-neutral-300"
                        )}
                    >
                        <div className={cn("p-1.5 rounded-md bg-white/5 group-hover:bg-white/10 transition-colors", agent.color)}>
                            {agent.icon}
                        </div>
                        <span className="font-medium">{agent.name}</span>
                        {selectedAgent.id === agent.id && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                        )}
                    </button>
                ))}
                <button
                  onClick={() => setShowHireModal(true)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group text-neutral-600 hover:bg-white/5 hover:text-neutral-400 border border-dashed border-white/10 mt-2"
                >
                  <div className="p-1.5 rounded-md bg-white/5 group-hover:bg-white/10 transition-colors">
                    <Plus size={14} />
                  </div>
                  <span className="font-medium">Hire Agent</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 pt-0">
              <div className="space-y-1 mt-4">
                <p className="px-3 text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Recent Missions</p>
                {missions.slice(0, 15).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setActiveMissionId(m.id)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-lg text-[13px] truncate transition-all",
                      activeMissionId === m.id ? "bg-white/5 text-white" : "text-neutral-500 hover:text-neutral-300"
                    )}
                  >
                    {m.task}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 border-t border-white/5">
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-neutral-700 to-neutral-500 flex items-center justify-center text-[10px] font-bold">
                  {user.email?.[0].toUpperCase()}
                </div>
                <div className="flex-1 truncate">
                  <p className="text-[13px] font-medium truncate">{user.email}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500">
                    <MoreHorizontal size={14} />
                </Button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0d0d0d] relative">
        
        {/* Header */}
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 z-20 bg-[#0d0d0d]/80 backdrop-blur-md">
            <div className="flex items-center gap-3">
                {!isSidebarOpen && (
                    <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} className="text-neutral-500">
                        <PanelLeftOpen size={18} />
                    </Button>
                )}
                <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-md bg-white/5", selectedAgent.color)}>
                        {selectedAgent.icon}
                    </div>
                    <h2 className="text-sm font-semibold tracking-tight">{selectedAgent.name}</h2>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-[12px] text-neutral-500 font-medium">Share</Button>
                <div className="h-4 w-px bg-white/10 mx-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500">
                    <Settings size={16} />
                </Button>
            </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto" ref={scrollRef}>
          <div className="max-w-3xl mx-auto px-6 py-10">
            {activeMissionId ? (
              <div className="space-y-8">
                {/* User Message */}
                <div className="flex gap-4 group">
                    <div className="w-8 h-8 rounded-full bg-neutral-800 flex-shrink-0 flex items-center justify-center text-xs font-bold mt-1">
                        U
                    </div>
                    <div className="space-y-2 flex-1">
                        <p className="text-sm font-semibold text-neutral-400">You</p>
                        <div className="text-[16px] leading-relaxed text-neutral-200">
                            {activeMission?.task}
                        </div>
                    </div>
                </div>

                {/* Agent Response */}
                <div className="flex gap-4 pt-4">
                    <div className={cn("w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-1", selectedAgent.color, "bg-white/5 border border-white/5")}>
                        {selectedAgent.icon}
                    </div>
                    <div className="space-y-4 flex-1">
                        <p className="text-sm font-semibold text-neutral-400">{selectedAgent.name}</p>
                        <div className="text-[16px] leading-relaxed text-neutral-100 min-h-[100px]">
                            {activeMission?.status === "completed" ? (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="whitespace-pre-wrap prose prose-invert max-w-none"
                                >
                                    {activeMission.result}
                                </motion.div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center gap-3 text-neutral-500 italic text-sm">
                                        <Loader2 size={14} className="animate-spin" />
                                        {activeMission?.status === "queued" ? "Waiting for deployment..." : "Executing strategic operations..."}
                                    </div>
                                    <div className="space-y-2">
                                        <div className="h-3 bg-white/5 rounded-full w-3/4 animate-pulse" />
                                        <div className="h-3 bg-white/5 rounded-full w-1/2 animate-pulse" />
                                        <div className="h-3 bg-white/5 rounded-full w-2/3 animate-pulse" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-8 pt-20">
                <div className="relative">
                    <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl relative z-10", selectedAgent.color, "bg-white/5 border border-white/10")}>
                        {selectedAgent.id === "primary" ? <span className="text-4xl">{(selectedAgent as any).emoji || "🤖"}</span> : selectedAgent.icon}
                    </div>
                    <div className="absolute inset-0 bg-white/5 blur-3xl rounded-full -z-10" />
                </div>
                <div className="space-y-3">
                    <h1 className="text-3xl font-bold tracking-tight">How can {selectedAgent.name} help you today?</h1>
                    <p className="text-neutral-500 max-w-sm mx-auto text-sm">Deploy an autonomous mission to scale your tactical operations.</p>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full max-w-2xl pt-4">
                    {[
                        "Audit my competitor's latest viral campaign",
                        "Scout for emerging trends in AI agents",
                        "Optimize my automation pipeline for throughput",
                        "Draft a strategic roadmap for Q3 operations"
                    ].map((suggestion, i) => (
                        <button 
                            key={i}
                            onClick={() => setInput(suggestion)}
                            className="text-left p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all text-[13px] text-neutral-400 hover:text-neutral-200"
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-6 pt-0">
          <div className="max-w-3xl mx-auto relative group">
            <form onSubmit={handleSubmit} className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                    }
                }}
                placeholder={`Message ${selectedAgent.name}...`}
                className="w-full bg-[#171717] border border-white/10 rounded-2xl py-4 pl-4 pr-14 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-transparent transition-all min-h-[60px] max-h-[200px] resize-none text-[15px] placeholder:text-neutral-600 shadow-2xl"
              />
              <div className="absolute right-3 bottom-3">
                <Button 
                    type="submit" 
                    disabled={!input.trim() || submitting}
                    size="icon"
                    className={cn(
                        "h-8 w-8 rounded-xl transition-all",
                        input.trim() ? "bg-white text-black hover:bg-neutral-200" : "bg-white/5 text-neutral-600"
                    )}
                >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={18} strokeWidth={2.5} />}
                </Button>
              </div>
            </form>
            <p className="mt-3 text-[11px] text-neutral-600 text-center flex items-center justify-center gap-1.5 font-medium">
                <Sparkles size={10} /> {selectedAgent.name} can provide tactical intelligence but should be verified.
            </p>
          </div>
        </div>
      </main>

      {/* Hire Agent Modal */}
      <AnimatePresence>
        {showHireModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            onClick={() => setShowHireModal(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md bg-[#111111] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/50"
            >
              {/* Close */}
              <button
                onClick={() => setShowHireModal(false)}
                className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors p-1"
              >
                <X size={18} />
              </button>

              {/* Header */}
              <div className="text-center space-y-4 mb-8">
                <div className="mx-auto w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
                  <Users size={28} className="text-blue-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Hire another agent</h2>
                  <p className="text-neutral-500 text-sm mt-2 max-w-xs mx-auto">
                    Expand your workforce with a specialized AI employee that works 24/7 alongside {employeeName}.
                  </p>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-3 mb-8">
                {[
                  "Dedicated AI that learns your workflows",
                  "Runs tasks in parallel with your existing agent",
                  "Custom name, avatar, and personality",
                  "Separate memory and conversation history",
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <Check size={12} className="text-blue-400" />
                    </div>
                    <span className="text-sm text-neutral-300">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Pricing */}
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 mb-6">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-xs text-neutral-500 font-mono uppercase tracking-widest mb-1">Per Agent</p>
                    <div className="flex items-baseline gap-1">
                      {isFoundingAvailable ? (
                        <>
                          <span className="text-3xl font-bold">${FOUNDING_PRICE}</span>
                          <span className="text-neutral-500 text-sm">/month</span>
                          <span className="text-neutral-600 text-sm line-through ml-2">${REGULAR_PRICE}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-3xl font-bold">${REGULAR_PRICE}</span>
                          <span className="text-neutral-500 text-sm">/month</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {isFoundingAvailable ? (
                      <>
                        <p className="text-xs text-emerald-400 font-medium">Founding price</p>
                        <p className="text-xs text-neutral-600">Locked forever</p>
                        <p className="text-[10px] text-amber-400/80 font-mono mt-1">{slotsRemaining} of {FOUNDING_LIMIT} left</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-neutral-400 font-medium">Standard price</p>
                        <p className="text-xs text-neutral-600">Founding slots filled</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* CTA */}
              <Button
                className="w-full h-14 bg-white text-black hover:bg-neutral-200 text-base font-bold rounded-2xl transition-all"
                onClick={async () => {
                  try {
                    const res = await fetch("/api/checkout", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        userId: user.uid,
                        email: user.email,
                      }),
                    });
                    const data = await res.json();
                    if (data.url) {
                      window.location.href = data.url;
                    } else {
                      console.error("Checkout error:", data.error);
                    }
                  } catch (err) {
                    console.error("Failed to start checkout:", err);
                  }
                }}
              >
                Add to Workforce
              </Button>
              <p className="text-center text-[10px] text-neutral-600 mt-3 font-mono uppercase tracking-wider">
                Cancel anytime • No long-term commitment
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Agent Setup Modal - auto-triggered after purchase */}
      <AnimatePresence>
        {setupAgent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md bg-[#111111] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/50"
            >
              <div className="text-center space-y-4 mb-8">
                <div className="mx-auto w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-3xl">
                  {AVATAR_EMOJIS[setupAvatar] || "🤖"}
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Set up your new agent</h2>
                  <p className="text-neutral-500 text-sm mt-2">Give your new hire a name and identity.</p>
                </div>
              </div>

              <div className="space-y-6 mb-8">
                <div>
                  <label className="text-xs text-neutral-500 font-mono uppercase tracking-widest block mb-2">Agent Name</label>
                  <input
                    type="text"
                    value={setupName}
                    onChange={(e) => setSetupName(e.target.value)}
                    placeholder="e.g. Atlas, Echo, Sage..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 font-mono uppercase tracking-widest block mb-2">Choose Avatar</label>
                  <div className="grid grid-cols-5 gap-2">
                    {Object.entries(AVATAR_EMOJIS).map(([key, emoji]) => (
                      <button
                        key={key}
                        onClick={() => setSetupAvatar(key)}
                        className={cn(
                          "w-full aspect-square rounded-xl text-2xl flex items-center justify-center transition-all border",
                          setupAvatar === key
                            ? "bg-blue-500/20 border-blue-500 scale-110 shadow-lg shadow-blue-500/20"
                            : "bg-white/5 border-white/10 hover:bg-white/10"
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                disabled={!setupName.trim()}
                className="w-full h-14 bg-white text-black hover:bg-neutral-200 text-base font-bold rounded-2xl transition-all disabled:opacity-30"
                onClick={async () => {
                  if (!setupAgent || !setupName.trim() || !user) return;
                  try {
                    await updateDoc(
                      doc(db, "users", user.uid, "agents", setupAgent.id),
                      {
                        name: setupName.trim(),
                        avatar: setupAvatar,
                        status: "active",
                      }
                    );
                    setSetupAgent(null);
                  } catch (err) {
                    console.error("Failed to set up agent:", err);
                  }
                }}
              >
                Activate Agent
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
