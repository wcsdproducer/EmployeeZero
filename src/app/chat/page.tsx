"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { Send, Plus, History, Brain, Loader2, User, Bot, CheckCircle2, Circle, PanelLeftOpen, Search, Settings, MoreHorizontal, ArrowUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, addDoc, Timestamp } from "firebase/firestore";

interface Mission {
  id: string;
  task: string;
  status: string;
  result?: string;
  createdAt: any;
  steps?: string[];
  userId: string;
}

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  const [input, setInput] = useState("");
  const [missions, setMissions] = useState<Mission[]>([]);
  const [activeMissionId, setActiveMissionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
        workspace: "gravityclaw",
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
      
      {/* Sidebar - ChatGPT Style */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex-shrink-0 bg-[#000000] flex flex-col border-r border-white/5"
          >
            <div className="p-3">
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
                <PanelLeftOpen size={16} className="text-neutral-500 group-hover:text-white" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
              <div className="text-[11px] font-bold text-neutral-500 px-3 py-2 uppercase tracking-widest">Recent Missions</div>
              {missions.map((mission) => (
                <button
                  key={mission.id}
                  onClick={() => setActiveMissionId(mission.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 group flex items-center justify-between",
                    activeMissionId === mission.id ? "bg-white/10 text-white" : "text-neutral-400 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <span className="truncate flex-1">{mission.task}</span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal size={14} className="text-neutral-500" />
                  </div>
                </button>
              ))}
            </div>

            <div className="p-3 mt-auto border-t border-white/5">
              <Button variant="ghost" className="w-full justify-start gap-3 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg px-3 py-6">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-neutral-700 to-neutral-500 flex items-center justify-center text-[10px] font-bold">
                  {user.email?.[0].toUpperCase() || "U"}
                </div>
                <div className="flex flex-col items-start overflow-hidden">
                  <span className="text-sm font-medium truncate w-full">{user.email}</span>
                  <span className="text-[10px] text-neutral-600 font-mono">Founding Member</span>
                </div>
              </Button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative bg-[#0d0d0d]">
        
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-white/5 bg-[#0d0d0d]/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            {!isSidebarOpen && (
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} className="text-neutral-400 hover:text-white">
                <PanelLeftOpen size={18} />
              </Button>
            )}
            <div className="text-sm font-semibold text-neutral-400 flex items-center gap-2">
              <span className="text-white">Employee Zero</span>
              <span className="px-1.5 py-0.5 rounded-md border border-white/10 bg-white/5 text-[10px] uppercase tracking-tighter">v0.1</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white">
                <Settings size={18} />
             </Button>
          </div>
        </header>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto py-10 flex flex-col items-center custom-scrollbar"
        >
          <div className="w-full max-w-3xl px-4 space-y-12">
            {!activeMissionId && !submitting && missions.length === 0 && (
              <div className="h-[60vh] flex flex-col items-center justify-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl shadow-white/10 animate-float">
                    <Bot size={32} strokeWidth={2.5} className="text-black" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-center">What shall we build today?</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-xl">
                    {["Research competitors for my AI SaaS", "Design a content strategy for X", "Automate my lead follow-ups", "Summarize recent PDF reports"].map((tip) => (
                        <button key={tip} onClick={() => setInput(tip)} className="p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 text-sm text-neutral-400 hover:text-white transition-all text-left">
                            {tip}
                        </button>
                    ))}
                </div>
              </div>
            )}

            {/* Displaying Active Mission Chat Style */}
            {activeMission && (
              <div className="space-y-10">
                 {/* User Message */}
                 <div className="flex gap-4 items-start group">
                    <div className="w-9 h-9 rounded-lg bg-neutral-800 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {user.email?.[0].toUpperCase() || "U"}
                    </div>
                    <div className="flex-1 pt-1.5 space-y-2">
                        <div className="font-bold text-sm">You</div>
                        <div className="text-neutral-300 leading-relaxed whitespace-pre-wrap">{activeMission.task}</div>
                    </div>
                 </div>

                 {/* Bot Response / Thinking */}
                 <div className="flex gap-4 items-start group">
                    <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-black flex-shrink-0">
                        <Bot size={18} />
                    </div>
                    <div className="flex-1 pt-1.5 space-y-6">
                        <div className="font-bold text-sm flex items-center gap-2">
                            Employee Zero
                            {["running", "processing", "queued"].includes(activeMission.status) && (
                                <Loader2 size={12} className="animate-spin text-neutral-500" />
                            )}
                        </div>
                        
                        <div className="space-y-4">
                            {activeMission.status === "completed" ? (
                                <div className="prose prose-invert max-w-none text-neutral-300">
                                    {activeMission.result || "Mission accomplished. All systems operational."}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="h-2 w-full max-w-md bg-white/5 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: "60%" }}
                                            transition={{ duration: 10, repeat: Infinity }}
                                            className="h-full bg-white/40"
                                        />
                                    </div>
                                    <div className="text-sm font-mono text-neutral-500 uppercase tracking-widest animate-pulse">
                                        Executing: {activeMission.status}...
                                    </div>
                                </div>
                            )}

                            {/* Autonomous Steps Visualization */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-8">
                                {[
                                    { label: "Trend Scouting", status: activeMission.status !== "queued" },
                                    { label: "Strategy Analysis", status: ["processing", "completed"].includes(activeMission.status) },
                                    { label: "Asset Generation", status: ["processing", "completed"].includes(activeMission.status) },
                                    { label: "Deployment", status: activeMission.status === "completed" },
                                ].map((step, idx) => (
                                    <div key={idx} className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg border text-xs font-medium transition-all",
                                        step.status ? "border-white/20 bg-white/5 text-white" : "border-white/5 text-neutral-600"
                                    )}>
                                        {step.status ? <CheckCircle2 size={14} className="text-green-500" /> : <Circle size={14} />}
                                        {step.label}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                 </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 pb-8 flex flex-col items-center">
          <form 
            onSubmit={handleSubmit}
            className="w-full max-w-3xl relative"
          >
            <div className="relative flex items-end w-full rounded-2xl border border-white/10 bg-[#171717] shadow-2xl focus-within:border-white/20 transition-all p-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message Employee Zero..."
                rows={1}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                    }
                }}
                className="w-full bg-transparent border-none focus:ring-0 text-sm text-white placeholder-neutral-500 py-3 px-4 resize-none overflow-hidden min-h-[52px] max-h-[200px]"
                style={{ height: 'auto' }}
                onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = `${target.scrollHeight}px`;
                }}
              />
              <div className="pb-2 pr-2">
                <Button 
                    type="submit" 
                    size="icon" 
                    disabled={!input.trim() || submitting}
                    className={cn(
                        "w-8 h-8 rounded-lg transition-all",
                        input.trim() ? "bg-white text-black" : "bg-neutral-800 text-neutral-500"
                    )}
                >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={18} strokeWidth={2.5} />}
                </Button>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-center text-neutral-600 font-medium">
                Employee Zero can make mistakes. Consider checking important information.
            </div>
          </form>
        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #262626;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #333;
        }
      `}</style>
    </div>
  );
}
