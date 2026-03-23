"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Send, Plus, History, Brain, Loader2, User, Bot, CheckCircle2, Circle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Mission {
  id: string;
  task: string;
  status: string;
  result?: string;
  createdAt: string;
  steps?: string[];
}

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  const [input, setInput] = useState("");
  const [missions, setMissions] = useState<Mission[]>([]);
  const [activeMissionId, setActiveMissionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Poll for mission updates
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/mission?userId=${user.uid}`);
        if (res.ok) {
          const data = await res.json();
          // The bridge returns an array of missions
          setMissions(data);
        }
      } catch (err) {
        console.error("Polling error", err);
      }
    }, 3000);
    return () => clearInterval(interval);
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
      const res = await fetch("/api/mission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, task }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveMissionId(data.missionId);
      }
    } catch (err) {
      console.error("Failed to submit mission", err);
    } finally {
      setSubmitting(false);
    }
  };

  const activeMission = missions.find(m => m.id === activeMissionId || ["running", "processing", "queued"].includes(m.status));

  // Simulated steps for "thinking" state based on status
  const getThinkingSteps = (mission: Mission) => {
    if (mission.status === "completed") return ["Mission Complete"];
    if (mission.status === "failed") return ["Mission Failed"];
    
    // Default autonomous loop steps
    return [
      { label: "Scouting Trends", done: true },
      { label: "Analyzing Content Strategy", done: mission.status !== "queued" },
      { label: "Generating Visual Storyboard", done: ["processing", "completed"].includes(mission.status) },
      { label: "Producing Media Assets", done: mission.status === "completed" },
    ];
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center font-mono uppercase tracking-widest animate-pulse">Initializing Employee Zero...</div>;
  if (!user) return <div className="h-screen flex items-center justify-center">Please sign in to access the terminal.</div>;

  return (
    <div className="flex h-screen bg-white text-black font-sans selection:bg-black selection:text-white overflow-hidden">
      {/* Sidebar - History */}
      <aside className="w-64 border-r border-neutral-100 flex flex-col bg-neutral-50/50">
        <div className="p-4 border-b border-neutral-100">
          <Button variant="outline" className="w-full justify-start gap-2 border-neutral-200 hover:bg-white rounded-xl shadow-sm" onClick={() => setActiveMissionId(null)}>
            <Plus size={16} />
            New Mission
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="px-3 py-2 text-xs font-semibold text-neutral-400 uppercase tracking-widest">History</div>
          {missions.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveMissionId(m.id)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 group",
                activeMissionId === m.id ? "bg-white shadow-sm border border-neutral-100" : "hover:bg-neutral-100 text-neutral-600"
              )}
            >
              <History size={14} className="opacity-40" />
              <span className="truncate flex-1">{m.task}</span>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-neutral-100 text-xs text-neutral-400 flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
           System Online
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative max-w-4xl mx-auto w-full">
        {/* Header */}
        <header className="h-14 border-b border-neutral-100 flex items-center justify-between px-6 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="font-bold tracking-tight text-lg">Zero <span className="text-neutral-300">Terminal</span></div>
          <div className="flex items-center gap-4">
             <div className="text-xs font-mono text-neutral-400">{user.email}</div>
             <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white text-[10px] uppercase font-bold">
               {user.email?.[0] || "U"}
             </div>
          </div>
        </header>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8" ref={scrollRef}>
          {missions.length === 0 && !activeMissionId && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
                <div className="w-16 h-16 bg-black rounded-3xl flex items-center justify-center text-white mb-4 shadow-xl rotate-3">
                    <Bot size={32} />
                </div>
                <h2 className="text-3xl font-bold tracking-tight">How can I scale your vision today?</h2>
                <p className="text-neutral-500">Assign a mission. I'll handle the research, strategy, and execution autonomously.</p>
                <div className="grid grid-cols-1 gap-2 w-full mt-8">
                    {["Create a 7-day social strategy for a coffee brand", "Analyze competitors in the AI agent space", "Build a high-converting landing page copy"].map((suggestion) => (
                        <button 
                            key={suggestion}
                            onClick={() => setInput(suggestion)}
                            className="text-left p-4 rounded-xl border border-neutral-100 hover:border-black hover:bg-neutral-50 transition-all text-sm text-neutral-600"
                        >
                            "{suggestion}"
                        </button>
                    ))}
                </div>
            </div>
          )}

          {/* Render Active or Selected Mission */}
          {activeMissionId && missions.find(m => m.id === activeMissionId) && (
            <div className="space-y-8 pb-20">
               {/* User Request */}
               <div className="flex gap-4 justify-end">
                  <div className="max-w-[80%] bg-neutral-900 text-white p-4 rounded-2xl rounded-tr-sm shadow-sm">
                    {missions.find(m => m.id === activeMissionId)?.task}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-neutral-200 flex-shrink-0 flex items-center justify-center">
                    <User size={16} className="text-neutral-600" />
                  </div>
               </div>

               {/* AI Response/Thinking */}
               <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-black flex-shrink-0 flex items-center justify-center">
                    <Bot size={16} className="text-white" />
                  </div>
                  <div className="flex-1 space-y-4">
                    {missions.find(m => m.id === activeMissionId)?.status !== "completed" ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-neutral-400 italic">
                          <Loader2 size={14} className="animate-spin" />
                          Employee Zero is thinking...
                        </div>
                        <div className="space-y-2 border-l-2 border-neutral-100 pl-4 py-1">
                          {getThinkingSteps(missions.find(m => m.id === activeMissionId)!).map((step: any, i: number) => (
                            <div key={i} className={cn("flex items-center gap-2 text-sm", step.done ? "text-neutral-900" : "text-neutral-300")}>
                               {step.done ? <CheckCircle2 size={14} className="text-black" /> : <Circle size={14} />}
                               {step.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-neutral-50 border border-neutral-100 p-6 rounded-2xl space-y-4 shadow-sm">
                        <div className="flex items-center gap-2 text-black font-bold text-lg mb-2">
                           <CheckCircle2 size={20} />
                           Mission Complete
                        </div>
                        <div className="prose prose-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
                          {missions.find(m => m.id === activeMissionId)?.result || "Execution payload delivered. Check your dashboard for details."}
                        </div>
                        <Button variant="outline" className="rounded-xl border-neutral-200">
                           View Deliverables
                        </Button>
                      </div>
                    )}
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-6 bg-gradient-to-t from-white via-white to-transparent sticky bottom-0">
          <form 
            onSubmit={handleSubmit}
            className="max-w-3xl mx-auto relative group"
          >
            <div className="relative">
                <Input 
                    placeholder="Describe your next mission..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={submitting}
                    className="h-14 pl-6 pr-14 rounded-2xl border-neutral-200 shadow-lg focus-visible:ring-black focus-visible:border-black transition-all text-base bg-white"
                />
                <button
                    type="submit"
                    disabled={!input.trim() || submitting}
                    className="absolute right-3 top-2 w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center disabled:bg-neutral-200 transition-all hover:scale-105 active:scale-95"
                >
                    {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
            </div>
            <p className="text-[10px] text-center mt-3 text-neutral-400 uppercase tracking-widest font-mono">
                Press Enter to Deploy Mission
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
