"use client";

import { Shield, Eye, Settings, Zap, ArrowRight, Star, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/navbar";

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
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Navbar />
      <div className="max-w-6xl mx-auto space-y-12 p-12 flex-1">
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
                <div className="text-lg font-bold text-gray-400 mb-4">{specialist.price}</div>
                
                <p className="text-gray-500 text-sm leading-relaxed mb-6 flex-1">
                {specialist.description}
                </p>

                <ul className="space-y-3 mb-8">
                {specialist.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0 border border-green-100">
                        <Check size={12} className="text-green-600" />
                    </div>
                    {feature}
                    </li>
                ))}
                </ul>

                <button 
                onClick={() => handleUpgrade(specialist.id)}
                disabled={loadingId === specialist.id}
                className={`w-full py-4 rounded-2xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2 ${specialist.buttonColor} shadow-lg shadow-gray-100 hover:scale-[1.02] active:scale-95 disabled:opacity-50`}
                >
                {loadingId === specialist.id ? (
                    <Loader2 size={18} className="animate-spin" />
                ) : (
                    <>
                    Hire {specialist.name}
                    <ArrowRight size={16} />
                    </>
                )}
                </button>
            </div>
            ))}
        </div>
      </div>
    </div>
  );
}
