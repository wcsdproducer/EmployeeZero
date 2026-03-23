"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Clock, Play, CheckCircle, AlertCircle, RefreshCw, Layers } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Mission {
  id: string;
  task: string;
  status: string;
  result?: string;
  createdAt: string;
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [input, setInput] = useState("");
  const [missions, setMissions] = useState<Mission[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Poll missions (same logic but cleaner UI)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/mission?userId=${user.uid}`);
        if (res.ok) {
          const data = await res.json();
          setMissions(data);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [missions]);

  const submitMission = async (e?: React.FormEvent) => {
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
        // Optimistic update or just wait for poll
        const data = await res.json();
        setMissions(prev => [data, ...prev]);
      }
    } catch (err) {
      console.error("Failed to submit mission", err);
    } finally {
      setSubmitting(false);
    }
  };

  const activeMissions = missions.filter(m => ["queued", "running", "processing"].includes(m.status));
  const completedMissions = missions.filter(m => m.status === "completed");

  if (loading) return <div className="animate-pulse">Loading Office...</div>;

  return (
    <div className="grid grid-cols-12 gap-8 h-[calc(100vh-12rem)]">
      {/* The Briefing Room (Left/Center) */}
      <div className="col-span-8 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">The Briefing Room</h2>
            <p className="text-sm text-gray-500">Assign missions to your AI workforce</p>
          </div>
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                AI
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
          {missions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Send className="text-gray-400" />
              </div>
              <p className="font-medium">No missions active</p>
              <p className="text-sm">Start by typing a command below</p>
            </div>
          ) : (
            missions.slice().reverse().map((m) => (
              <div key={m.id} className="flex gap-4">
                <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${
                  m.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {m.status === 'completed' ? <CheckCircle size={16} /> : <Clock size={16} />}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">Task #{m.id.slice(-4)}</span>
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      {m.status}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 border border-gray-100">
                    {m.task}
                  </div>
                  {m.result && (
                    <div className="bg-blue-50/50 rounded-xl p-4 text-sm text-blue-900 border border-blue-100/50 italic">
                      {m.result}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-gray-50 bg-gray-50/30">
          <form onSubmit={submitMission} className="relative">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Assign a new mission (e.g. 'Analyze tech trends for Q2')..." 
              className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-6 pr-16 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
              disabled={submitting}
            />
            <button 
              type="submit"
              disabled={submitting || !input.trim()}
              className="absolute right-3 top-2.5 p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-200"
            >
              <Send size={20} />
            </button>
          </form>
          <div className="mt-3 flex gap-4">
            <button className="text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-blue-600 transition-colors">/scout</button>
            <button className="text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-blue-600 transition-colors">/analyze</button>
            <button className="text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-blue-600 transition-colors">/generate</button>
          </div>
        </div>
      </div>

      {/* Active Pipeline (Right Sidebar) */}
      <div className="col-span-4 space-y-6 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Layers size={18} className="text-blue-600" />
              Active Pipeline
            </h3>
            <span className="text-xs font-bold bg-blue-100 text-blue-600 px-2 py-1 rounded-full">{activeMissions.length}</span>
          </div>

          <div className="space-y-4">
            {activeMissions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Pipeline empty</p>
            ) : (
              activeMissions.map(m => (
                <div key={m.id} className="group p-4 rounded-xl border border-gray-100 hover:border-blue-100 hover:bg-blue-50/20 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter">
                      {m.status === 'running' ? 'Executing' : 'Queued'}
                    </span>
                    {m.status === 'running' && <RefreshCw size={12} className="text-blue-600 animate-spin" />}
                  </div>
                  <p className="text-sm font-medium text-gray-900 line-clamp-2">{m.task}</p>
                  <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className={`h-full bg-blue-600 rounded-full transition-all duration-1000 ${m.status === 'running' ? 'w-2/3' : 'w-1/12'}`}></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl shadow-sm p-6 text-white relative overflow-hidden group">
          <div className="relative z-10">
            <h3 className="font-bold text-lg mb-2">Specialists Store</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">Unlock advanced agents like Argos and SPECTRE to automate deep research and competitive intel.</p>
            <button className="w-full bg-white text-slate-900 text-xs font-bold uppercase tracking-wider py-3 rounded-xl hover:bg-slate-100 transition-colors">
              Browse Agents
            </button>
          </div>
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-blue-600/20 blur-3xl group-hover:bg-blue-600/40 transition-all duration-500 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
