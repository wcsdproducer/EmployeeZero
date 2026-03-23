"use client";

import { Shield, Eye, Settings, Zap, ArrowRight, Star, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const specialists = [
  {
    id: "argos",
    name: "Argos",
    description: "Deep Trend Analysis & Scouting. Monitors the internet 24/7 for shifts in your niche.",
    price: "$10/mo",
    features: ["Real-time trend alerts", "Viral content prediction", "Competitor monitoring"],
    icon: <Eye className="text-purple-600" />,
    color: "bg-purple-50 text-purple-600",
    buttonColor: "bg-purple-600 hover:bg-purple-700",
    popular: true,
  },
  {
    id: "spectre",
    name: "SPECTRE",
    description: "Stealth Competitive Intelligence. Analyzes competitor funnels, ads, and pricing changes.",
    price: "$10/mo",
    features: ["Funnel teardowns", "Ad library tracking", "Pricing change alerts"],
    icon: <Shield className="text-emerald-600" />,
    color: "bg-emerald-50 text-emerald-600",
    buttonColor: "bg-emerald-600 hover:bg-emerald-700",
    popular: false,
  },
  {
    id: "fixer",
    name: "FIXER",
    description: "Operational Excellence & Debugging. Finds and fixes bottlenecks in your automation pipelines.",
    price: "$10/mo",
    features: ["Error resolution", "Workflow optimization", "Custom API connectors"],
    icon: <Settings className="text-blue-600" />,
    color: "bg-blue-50 text-blue-600",
    buttonColor: "bg-blue-600 hover:bg-blue-700",
    popular: false,
  },
];

export default function SpecialistStore() {
  const { user } = useAuth();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleUpgrade = async (specialistId: string) => {
    if (!user) {
      window.location.href = "/login";
      return;
    }

    setLoadingId(specialistId);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          email: user.email,
          plan: "specialist",
          metadata: { specialistId },
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to initiate checkout");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">The Specialist Store</h1>
        <p className="text-lg text-gray-500">Hire specialized AI agents to scale your operations. Every specialist is trained for a single high-impact mission.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {specialists.map((specialist) => (
          <div 
            key={specialist.id} 
            className={`relative flex flex-col bg-white rounded-3xl p-8 border ${
              specialist.popular ? 'border-purple-200 shadow-xl shadow-purple-100 ring-2 ring-purple-600/5' : 'border-gray-100 shadow-sm'
            } transition-all hover:shadow-lg`}
          >
            {specialist.popular && (
              <div className="absolute top-0 right-8 -translate-y-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg shadow-purple-200">
                <Star size={10} fill="currentColor" />
                <span>Most Popular</span>
              </div>
            )}

            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${specialist.color}`}>
              {specialist.icon}
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-2">{specialist.name}</h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">{specialist.description}</p>
            
            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-4xl font-extrabold text-gray-900">{specialist.price}</span>
              <span className="text-gray-400 text-sm">/ specialist</span>
            </div>

            <div className="flex-1 space-y-4 mb-8">
              {specialist.features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
                    <Check size={12} className="text-gray-400" />
                  </div>
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <button 
              disabled={loadingId === specialist.id}
              onClick={() => handleUpgrade(specialist.id)}
              className={`w-full py-4 rounded-2xl text-white font-bold transition-all flex items-center justify-center gap-2 ${
                loadingId === specialist.id ? 'bg-gray-400 cursor-not-allowed' : specialist.buttonColor
              } shadow-lg shadow-slate-200 hover:scale-[1.02] active:scale-[0.98]`}
            >
              {loadingId === specialist.id ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>UPGRADE NOW</span>
                  <Zap size={16} fill="currentColor" />
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 rounded-[40px] p-12 text-white relative overflow-hidden">
        <div className="relative z-10 space-y-6 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold uppercase tracking-widest text-blue-400 border border-white/10">
            <Zap size={12} />
            <span>Custom Builds</span>
          </div>
          <h2 className="text-3xl font-bold">Custom AI Workforce</h2>
          <p className="text-slate-400 text-lg">Need a custom specialist trained on your company's data and workflows? We build bespoke AI employees for high-growth teams.</p>
          <button className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-bold hover:bg-slate-100 transition-colors">
            Contact Sales
          </button>
        </div>
        
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/20 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2"></div>
      </div>
    </div>
  );
}
