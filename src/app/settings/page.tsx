"use client";

import { CreditCard, Shield, Key, Bell, Check, ExternalLink, ChevronRight, User } from "lucide-react";
import { Navbar } from "@/components/navbar";

export default function Settings() {
  const currentPlan = "Founder Tier";
  const monthlyCost = "$0/mo";
  const specialistCost = "$0/mo";
  const nextBillingDate = "April 23, 2026";

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Navbar />
      <div className="max-w-4xl mx-auto space-y-12 p-12 flex-1">
        <div className="flex items-center justify-between border-b border-gray-100 pb-8">
            <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Settings</h1>
            <p className="text-gray-500 mt-2">Manage your office workspace and billing preferences.</p>
            </div>
            <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border border-blue-100">
            Admin Access
            </div>
        </div>

        <div className="space-y-10">
            {/* Profile Section */}
            <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex items-center justify-between group">
            <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-slate-900 flex items-center justify-center text-white relative shadow-lg shadow-slate-200">
                <User size={32} />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-4 border-white rounded-full"></div>
                </div>
                <div>
                <h3 className="text-xl font-bold text-gray-900">Founder Account</h3>
                <p className="text-gray-400 text-sm">founder@employeezero.ai</p>
                <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase bg-gray-100 px-2 py-0.5 rounded text-gray-500 tracking-wider">Early Access</span>
                    <span className="text-[10px] font-bold uppercase bg-blue-100 px-2 py-0.5 rounded text-blue-600 tracking-wider">Verified</span>
                </div>
                </div>
            </div>
            <button className="text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Edit Profile
                <ChevronRight size={16} />
            </button>
            </section>

            {/* Billing & Subscription */}
            <section className="space-y-4">
            <div className="flex items-center gap-2 px-2">
                <CreditCard size={18} className="text-blue-600" />
                <h2 className="text-lg font-bold text-gray-900">Billing & Subscription</h2>
            </div>
            
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-gray-900">{currentPlan}</span>
                    <span className="bg-green-100 text-green-600 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border border-green-200">Active</span>
                    </div>
                    <p className="text-gray-400 text-sm italic leading-relaxed max-w-sm">Special early access plan. No base monthly fee for founding members.</p>
                </div>
                <button className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all flex items-center gap-2">
                    Manage Subscription
                    <ExternalLink size={14} />
                </button>
                </div>

                <div className="grid grid-cols-3 divide-x divide-gray-50 bg-gray-50/20">
                <div className="p-6">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Monthly Base</p>
                    <p className="text-xl font-extrabold text-gray-900">{monthlyCost}</p>
                </div>
                <div className="p-6">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Specialists</p>
                    <p className="text-xl font-extrabold text-gray-900">{specialistCost}</p>
                </div>
                <div className="p-6">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Next Bill</p>
                    <p className="text-xl font-extrabold text-gray-900">{nextBillingDate}</p>
                </div>
                </div>
            </div>
            </section>
        </div>
      </div>
    </div>
  );
}
