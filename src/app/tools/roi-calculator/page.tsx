"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Zap, ArrowRight, Calculator, Check, TrendingUp, Clock, DollarSign, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const TASKS = [
  { id: "email", label: "Email management", hoursPerWeek: 5, icon: "envelope" },
  { id: "scheduling", label: "Scheduling & calendar", hoursPerWeek: 3, icon: "calendar" },
  { id: "research", label: "Research & reports", hoursPerWeek: 4, icon: "search" },
  { id: "social", label: "Social media posting", hoursPerWeek: 3, icon: "share" },
  { id: "data", label: "Data entry & spreadsheets", hoursPerWeek: 3, icon: "table" },
  { id: "followups", label: "Follow-ups & reminders", hoursPerWeek: 2, icon: "bell" },
  { id: "meetings", label: "Meeting prep & notes", hoursPerWeek: 2, icon: "file" },
  { id: "invoicing", label: "Invoicing & billing", hoursPerWeek: 1.5, icon: "dollar" },
];

export default function ROICalculatorPage() {
  const [selectedTasks, setSelectedTasks] = useState<string[]>(["email", "scheduling", "research"]);
  const [hourlyRate, setHourlyRate] = useState(50);
  const [email, setEmail] = useState("");
  const [showCapture, setShowCapture] = useState(false);
  const [captured, setCaptured] = useState(false);

  const toggleTask = (id: string) => {
    setSelectedTasks((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const results = useMemo(() => {
    const weeklyHours = selectedTasks.reduce((sum, id) => {
      const task = TASKS.find((t) => t.id === id);
      return sum + (task?.hoursPerWeek || 0);
    }, 0);

    const monthlyHours = weeklyHours * 4.3;
    const yearlyHours = weeklyHours * 52;
    const monthlyValue = monthlyHours * hourlyRate;
    const yearlyValue = yearlyHours * hourlyRate;
    const ezMonthlyCost = 29;
    const ezYearlyCost = 199;
    const monthlyROI = monthlyValue - ezMonthlyCost;
    const yearlyROI = yearlyValue - ezYearlyCost;
    const multiplier = monthlyValue > 0 ? Math.round(monthlyValue / ezMonthlyCost) : 0;

    return {
      weeklyHours,
      monthlyHours: Math.round(monthlyHours),
      yearlyHours: Math.round(yearlyHours),
      monthlyValue: Math.round(monthlyValue),
      yearlyValue: Math.round(yearlyValue),
      monthlyROI: Math.round(monthlyROI),
      yearlyROI: Math.round(yearlyROI),
      multiplier,
    };
  }, [selectedTasks, hourlyRate]);

  const handleCapture = async () => {
    if (!email.trim()) return;
    try {
      await fetch("/api/tools/email-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "roi-calculator" }),
      });
      setCaptured(true);
    } catch {}
  };

  const shareText = `I just calculated my AI ROI: Employee Zero could save me ${results.monthlyHours} hours/month (worth $${results.monthlyValue.toLocaleString()}) for just $29/mo. That's a ${results.multiplier}x return. 🤯 Try it: employeezero.app/tools/roi-calculator`;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ text: shareText, url: "https://employeezero.app/tools/roi-calculator" });
    } else {
      navigator.clipboard.writeText(shareText);
      alert("Copied to clipboard!");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0e1a] text-white selection:bg-amber-400/30 overflow-hidden font-sans">
      <div className="fixed top-[-200px] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-amber-500/[0.04] blur-[150px] rounded-full -z-10 pointer-events-none" />

      <nav className="p-6 md:px-12 flex justify-between items-center z-50 border-b border-white/[0.05]">
        <Link href="/" className="text-sm font-bold tracking-tight flex items-center gap-2">
          <Zap size={16} className="text-emerald-400" />
          Employee Zero
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/tools" className="text-xs text-neutral-400 hover:text-white transition-colors font-medium">
            &larr; All Tools
          </Link>
          <Button className="h-8 px-4 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black rounded-full" asChild>
            <Link href="/login">Get Started</Link>
          </Button>
        </div>
      </nav>

      <section className="px-6 md:px-12 pt-12 pb-8 max-w-3xl mx-auto w-full text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-xs text-neutral-400 font-medium mb-6">
            <Calculator size={12} className="text-amber-400" />
            Free Tool
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-4">
            AI ROI Calculator
          </h1>
          <p className="text-base text-neutral-400 max-w-lg mx-auto leading-relaxed">
            Select the tasks you do manually. See how many hours and dollars an AI employee saves you — <span className="text-white font-medium">instant results, no signup.</span>
          </p>
        </motion.div>
      </section>

      <section className="px-6 md:px-12 pb-20 max-w-3xl mx-auto w-full">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="space-y-8">

          {/* Task Selection */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-3">
              Which tasks do you handle manually? <span className="text-neutral-500">(select all that apply)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TASKS.map((task) => {
                const selected = selectedTasks.includes(task.id);
                return (
                  <button
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all border ${
                      selected
                        ? "bg-amber-500/10 border-amber-500/30 text-white"
                        : "bg-white/[0.02] border-white/[0.06] text-neutral-400 hover:border-white/[0.12] hover:text-neutral-300"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${
                      selected ? "bg-amber-500 border-amber-500" : "border-white/[0.15]"
                    }`}>
                      {selected && <Check size={12} className="text-black" />}
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium">{task.label}</span>
                      <span className="text-[10px] text-neutral-500 ml-2">~{task.hoursPerWeek}h/week</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hourly Rate Slider */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-3">
              What&apos;s your time worth? <span className="text-amber-400 font-bold">${hourlyRate}/hr</span>
            </label>
            <input
              type="range"
              min={15}
              max={200}
              step={5}
              value={hourlyRate}
              onChange={(e) => setHourlyRate(Number(e.target.value))}
              className="w-full h-2 bg-white/[0.06] rounded-full appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-neutral-600 mt-1">
              <span>$15/hr</span>
              <span>$200/hr</span>
            </div>
          </div>

          {/* Results */}
          {selectedTasks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={`${selectedTasks.join("-")}-${hourlyRate}`}
            >
              {/* Hero stat */}
              <div className="bg-gradient-to-br from-amber-500/[0.1] via-amber-400/[0.05] to-transparent border border-amber-500/20 rounded-2xl p-6 md:p-8 text-center mb-4">
                <div className="text-6xl md:text-7xl font-bold text-amber-400 mb-2">
                  {results.multiplier}x
                </div>
                <p className="text-sm text-neutral-300">
                  return on your $29/mo investment
                </p>
              </div>

              {/* Stat grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-center">
                  <Clock size={16} className="text-amber-400 mx-auto mb-2" />
                  <div className="text-xl font-bold text-white">{results.weeklyHours}h</div>
                  <div className="text-[10px] text-neutral-500">saved / week</div>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-center">
                  <Clock size={16} className="text-amber-400 mx-auto mb-2" />
                  <div className="text-xl font-bold text-white">{results.monthlyHours}h</div>
                  <div className="text-[10px] text-neutral-500">saved / month</div>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-center">
                  <DollarSign size={16} className="text-emerald-400 mx-auto mb-2" />
                  <div className="text-xl font-bold text-emerald-400">${results.monthlyValue.toLocaleString()}</div>
                  <div className="text-[10px] text-neutral-500">value / month</div>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-center">
                  <TrendingUp size={16} className="text-emerald-400 mx-auto mb-2" />
                  <div className="text-xl font-bold text-emerald-400">${results.yearlyROI.toLocaleString()}</div>
                  <div className="text-[10px] text-neutral-500">yearly ROI</div>
                </div>
              </div>

              {/* Comparison bar */}
              <div className="mt-4 bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-neutral-400">Your cost without AI</span>
                  <span className="text-sm font-bold text-red-400">${results.monthlyValue.toLocaleString()}/mo</span>
                </div>
                <div className="w-full bg-red-500/20 rounded-full h-3 mb-4">
                  <div className="bg-red-500/60 h-3 rounded-full" style={{ width: "100%" }} />
                </div>

                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-neutral-400">Employee Zero</span>
                  <span className="text-sm font-bold text-emerald-400">$29/mo</span>
                </div>
                <div className="w-full bg-emerald-500/20 rounded-full h-3">
                  <div
                    className="bg-emerald-500/60 h-3 rounded-full transition-all"
                    style={{ width: `${Math.max(2, Math.round((29 / results.monthlyValue) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Share button */}
              <button
                onClick={handleShare}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-amber-500/30 text-sm text-neutral-400 hover:text-white transition-all"
              >
                <Share2 size={14} />
                Share your ROI result
              </button>
            </motion.div>
          )}

          {/* CTA */}
          <div className="bg-gradient-to-r from-emerald-500/[0.08] to-transparent border border-emerald-500/20 rounded-xl p-6 text-center">
            <h3 className="text-lg font-bold text-white mb-2">
              {results.multiplier}x return. $29/mo. No brainer.
            </h3>
            <p className="text-xs text-neutral-400 mb-5">
              Stop doing ${results.monthlyValue.toLocaleString()}/mo of manual work. Let Employee Zero handle it.
            </p>

            {!captured ? (
              <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setShowCapture(true); }}
                  placeholder="you@company.com"
                  className="flex-1 h-11 bg-white/[0.03] border border-white/[0.08] rounded-lg px-4 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/50"
                />
                <Button
                  onClick={handleCapture}
                  className="h-11 px-6 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg"
                >
                  Start saving <ArrowRight size={14} className="ml-1" />
                </Button>
              </div>
            ) : (
              <div>
                <Check size={24} className="text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-white mb-1">You&apos;re in!</p>
                <Button className="h-10 px-6 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-black rounded-full mt-2" asChild>
                  <Link href="/login">Hire Employee Zero &mdash; $29/mo <ArrowRight size={12} className="ml-1" /></Link>
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </section>

      <footer className="mt-auto border-t border-white/[0.05] px-6 py-6 text-center">
        <p className="text-xs text-neutral-600">&copy; 2026 Employee Zero. Free tool &mdash; no account required.</p>
      </footer>
    </div>
  );
}
