"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Send, Plus, History, Brain, Loader2, User, Bot, CheckCircle2, Circle } from "lucide-react";
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

  // Subscribe to mission updates from Firestore
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
      // Add a new mission to Firestore
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
          <div className="px-3 py-2 text-xs font-semibold text-neutral-400 uppercase tracking-widest">Recent Activity</div>
          {missions.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveMissionId(m.id)}
              className={cn(
                "w-full text-left p-3 rounded-xl text-sm transition-all border border-transparent",
                activeMissionId === m.id ? "bg-white border-neutral-100 shadow-sm text-black" : "text-neutral-500 hover:bg-neutral-100"
              )}
            >
              <div className="flex items-center gap-2">
                {m.status === "completed" ? <CheckCircle2 size={12} className="text-green-500" /> : <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />}
                <span className="truncate">{m.task}</span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Main Terminal */}
      <main className="flex-1 flex flex-col bg-white">
        {/* Terminal Feed */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth">
          {!activeMissionId && missions.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 bg-black rounded-3xl flex items-center justify-center text-white mb-4">
                <Brain size={32} />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">I am Employee Zero.</h1>
              <p className="text-neutral-500 text-sm leading-relaxed">
                Connect your brand, scout trends, and generate autonomous social campaigns. Type your request below to begin.
              </p>
            </div>
          )}

          {activeMissionId && (
            <div className="max-w-3xl mx-auto w-full space-y-8">
              {/* Mission Header */}
              <div className="space-y-2 border-b border-neutral-100 pb-8">
                <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 uppercase tracking-widest">
                  <span className="px-2 py-0.5 bg-neutral-100 rounded text-black font-bold">ACTIVE MISSION</span>
                  <span>ID: {activeMissionId.slice(0, 8)}</span>
                </div>
                <h2 className="text-2xl font-medium">{missions.find(m => m.id === activeMissionId)?.task}</h2>
              </div>

              {/* Status Section */}
              {activeMission && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-6 border-neutral-100 shadow-sm rounded-2xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Loader2 className="animate-spin" size={18} />
                      </div>
                      <span className="font-semibold">Autonomous Status</span>
                    </div>
                    <div className="space-y-4">
                      {getThinkingSteps(activeMission).map((step: any, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          {typeof step === 'string' ? (
                            <div className="flex items-center gap-3 w-full">
                              <CheckCircle2 size={16} className="text-green-500" />
                              <span className="text-neutral-900 font-medium">{step}</span>
                            </div>
                          ) : (
                            <>
                              {step.done ? <CheckCircle2 size={16} className="text-green-500" /> : <Circle size={16} className="text-neutral-200" />}
                              <span className={cn(step.done ? "text-neutral-900 font-medium" : "text-neutral-400")}>{step.label}</span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>

                  {activeMission.result && (
                    <Card className="p-6 border-neutral-100 shadow-sm rounded-2xl bg-neutral-50/30">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                          <CheckCircle2 size={18} />
                        </div>
                        <span className="font-semibold">Mission Results</span>
                      </div>
                      <div className="prose prose-sm font-mono text-xs text-neutral-700 whitespace-pre-wrap leading-relaxed">
                        {activeMission.result}
                      </div>
                    </Card>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Command Input */}
        <div className="p-6 bg-white border-t border-neutral-100">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative group">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Deploy a campaign for T3kniQ..."
              className="pr-12 py-7 rounded-2xl border-neutral-200 bg-neutral-50 focus:bg-white focus:ring-black transition-all text-base shadow-sm group-hover:shadow-md"
              disabled={submitting}
            />
            <Button
              type="submit"
              size="icon"
              className={cn(
                "absolute right-2 top-2 h-10 w-10 rounded-xl transition-all shadow-lg",
                input.trim() ? "bg-black text-white hover:bg-neutral-800 scale-100" : "bg-neutral-100 text-neutral-400 scale-95 opacity-50"
              )}
              disabled={!input.trim() || submitting}
            >
              <Send size={18} />
            </Button>
          </form>
          <div className="max-w-3xl mx-auto mt-3 px-4 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-neutral-400">
            <div className="flex items-center gap-3">
              <span>Encrypted Terminal</span>
              <span className="w-1 h-1 bg-neutral-300 rounded-full" />
              <span>Session: Live</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span>AI Core Connected</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
