"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Shield, Key, Bell, Check, ExternalLink, ChevronRight, User, X, Zap, Gift, ArrowRight, Brain, Sparkles, ArrowLeft, Settings as SettingsIcon } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

// ─── Retention Modal ───────────────────────────────────────────────────────────
function RetentionModal({
  onAccept,
  onDecline,
  onClose,
  loading,
  accepted,
}: {
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
  loading: boolean;
  accepted: boolean;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!loading ? onClose : undefined}
      />

      {/* Modal */}
      <motion.div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
        initial={{ scale: 0.92, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 24 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
      >
        {/* Close button */}
        {!loading && !accepted && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors z-10"
          >
            <X size={14} className="text-gray-500" />
          </button>
        )}

        {/* Header gradient */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 pb-10 text-white relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-emerald-400/10 blur-2xl" />

          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-emerald-400/20 border border-emerald-400/30 flex items-center justify-center mb-5">
              <Gift size={26} className="text-emerald-400" />
            </div>
            <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-2">
              Before you go
            </p>
            <h2 className="text-2xl font-bold leading-tight">
              Stay for half price.<br />On us.
            </h2>
          </div>
        </div>

        {/* Body */}
        <div className="p-8">
          {accepted ? (
            // ─── Success state ───
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-4"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Check size={28} className="text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Offer applied!</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                Your next bill is{" "}
                <span className="font-bold text-gray-900">$14.95</span>. After one month,
                you&apos;ll automatically return to the regular rate — no action needed.
              </p>
              <button
                onClick={onClose}
                className="w-full bg-slate-900 text-white py-3 rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all"
              >
                Got it — thanks!
              </button>
            </motion.div>
          ) : (
            // ─── Offer state ───
            <>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                We&apos;d hate to lose you. As a Full Arsenal member, we&apos;re offering{" "}
                <span className="font-bold text-gray-900">1 month at $14.95</span> — that&apos;s
                50% off — then it automatically goes back to your regular rate.
              </p>

              {/* Price comparison */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-6 flex items-center justify-between">
                <div className="text-center">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Regular</p>
                  <p className="text-xl font-bold text-gray-400 line-through">$29.00</p>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight size={16} className="text-gray-300" />
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mb-1">Your offer</p>
                  <p className="text-xl font-bold text-emerald-600">$14.95</p>
                </div>
                <div className="bg-emerald-100 text-emerald-600 text-[10px] font-bold px-3 py-1.5 rounded-full border border-emerald-200">
                  50% OFF
                </div>
              </div>

              {/* Offer perks */}
              <ul className="space-y-2 mb-7">
                {[
                  "Keep all Full Arsenal features",
                  "No commitment — cancel anytime after",
                  "Auto-returns to regular price after 1 month",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <Check size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              {/* CTA buttons */}
              <div className="space-y-3">
                <button
                  onClick={onAccept}
                  disabled={loading}
                  className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <motion.div
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      />
                      Applying offer...
                    </>
                  ) : (
                    <>
                      <Zap size={14} className="text-emerald-400" />
                      Yes, keep me at $14.95
                    </>
                  )}
                </button>

                <button
                  onClick={onDecline}
                  disabled={loading}
                  className="w-full text-gray-400 hover:text-gray-600 py-2 text-xs font-medium transition-colors disabled:opacity-40"
                >
                  No thanks, continue to cancel
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Settings Page ────────────────────────────────────────────────────────
export default function Settings() {
  const { user } = useAuth();
  const [showRetentionModal, setShowRetentionModal] = useState(false);
  const [retentionLoading, setRetentionLoading] = useState(false);
  const [retentionAccepted, setRetentionAccepted] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const currentPlan = "Founder Tier";
  const monthlyCost = "$0/mo";
  const specialistCost = "$0/mo";
  const nextBillingDate = "April 23, 2026";

  // Open retention modal first when user clicks "Manage Subscription"
  const handleManageSubscription = () => {
    setShowRetentionModal(true);
  };

  // User accepts the retention offer
  const handleAcceptOffer = async () => {
    if (!user?.uid) return;
    setRetentionLoading(true);
    try {
      const res = await fetch("/api/billing/retention-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      });
      const data = await res.json();
      if (data.success) {
        setRetentionAccepted(true);
      } else {
        // If offer fails, fall through to portal gracefully
        console.error("Retention offer failed:", data.error);
        alert("Could not apply offer. Please try again or contact support.");
      }
    } catch (err) {
      console.error("Retention offer error:", err);
    } finally {
      setRetentionLoading(false);
    }
  };

  // User declines — open Stripe portal to actually cancel/downgrade
  const handleDeclineAndContinue = async () => {
    setRetentionLoading(true);
    setShowRetentionModal(false);
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid || "",
          email: user?.email || "",
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Portal error:", err);
    } finally {
      setRetentionLoading(false);
      setPortalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowRetentionModal(false);
    setRetentionAccepted(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#0d0d0d]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            href="/chat"
            className="p-2 -ml-2 rounded-xl hover:bg-white/5 transition-colors text-neutral-500 hover:text-white"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 rounded-xl bg-white/5 border border-white/10">
              <SettingsIcon size={18} className="text-zinc-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Settings</h1>
              <p className="text-xs text-neutral-500">Manage your office workspace and billing preferences</p>
            </div>
          </div>
          <div className="bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-blue-500/20">
            Admin Access
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto space-y-8 p-6 lg:p-10 w-full flex-1">

        <div className="space-y-8">
            {/* Profile Section */}
            <section className="bg-white/5 rounded-3xl p-6 md:p-8 border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between group gap-6">
            <div className="flex items-center gap-6">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-black flex items-center justify-center text-white relative shadow-lg shadow-black/50 border border-white/10">
                <User size={32} className="text-neutral-400" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 md:w-6 md:h-6 bg-emerald-500 border-4 border-black rounded-full"></div>
                </div>
                <div>
                <h3 className="text-lg md:text-xl font-bold text-white">Founder Account</h3>
                <p className="text-neutral-400 text-sm">{user?.email || "founder@employeezero.ai"}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase bg-white/10 px-2 py-0.5 rounded text-neutral-300 tracking-wider">Early Access</span>
                    <span className="text-[10px] font-bold uppercase bg-blue-500/20 px-2 py-0.5 rounded text-blue-400 border border-blue-500/20 tracking-wider">Verified</span>
                </div>
                </div>
            </div>
            <button className="text-sm font-bold text-neutral-400 hover:text-white transition-colors flex items-center gap-1 group-hover:translate-x-1">
                Edit Profile
                <ChevronRight size={16} />
            </button>
            </section>

            {/* AI Configuration */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                <Brain size={18} className="text-blue-400" />
                <h2 className="text-lg font-bold text-white">AI Configuration</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                  href="/settings/brain"
                  className="bg-white/5 rounded-3xl border border-white/10 p-5 flex items-center gap-4 hover:bg-white/10 hover:border-blue-500/30 transition-all group"
                >
                  <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Brain size={20} className="text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white">Your AI Brain</p>
                    <p className="text-xs text-neutral-400 mt-0.5">Connect your OpenRouter account</p>
                  </div>
                  <ChevronRight size={16} className="text-neutral-500 group-hover:text-blue-400 transition-colors" />
                </Link>
                <Link
                  href="/settings/soul"
                  className="bg-white/5 rounded-3xl border border-white/10 p-5 flex items-center gap-4 hover:bg-white/10 hover:border-purple-500/30 transition-all group"
                >
                  <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Sparkles size={20} className="text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white">Agent SOUL</p>
                    <p className="text-xs text-neutral-400 mt-0.5">Personality, tone & focus areas</p>
                  </div>
                  <ChevronRight size={16} className="text-neutral-500 group-hover:text-purple-400 transition-colors" />
                </Link>
              </div>
            </section>

            {/* Billing & Subscription */}
            <section className="space-y-4">
            <div className="flex items-center gap-2 px-2">
                <CreditCard size={18} className="text-blue-400" />
                <h2 className="text-lg font-bold text-white">Billing &amp; Subscription</h2>
            </div>
            
            <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden">
                <div className="p-6 md:p-8 border-b border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xl md:text-2xl font-bold text-white">{currentPlan}</span>
                    <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border border-emerald-500/20">Active</span>
                    </div>
                    <p className="text-neutral-400 text-sm italic leading-relaxed max-w-sm">Special early access plan. No base monthly fee for founding members.</p>
                </div>
                <button
                  id="manage-subscription-btn"
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  className="w-full md:w-auto bg-white text-black px-6 py-3 rounded-2xl font-bold text-sm hover:bg-neutral-200 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {portalLoading ? "Loading..." : "Manage Subscription"}
                  <ExternalLink size={14} />
                </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/5 bg-black/20">
                <div className="p-6">
                    <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">Monthly Base</p>
                    <p className="text-xl font-extrabold text-white">{monthlyCost}</p>
                </div>
                <div className="p-6">
                    <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">Specialists</p>
                    <p className="text-xl font-extrabold text-white">{specialistCost}</p>
                </div>
                <div className="p-6">
                    <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">Next Bill</p>
                    <p className="text-xl font-extrabold text-white">{nextBillingDate}</p>
                </div>
                </div>
            </div>
            </section>
        </div>
      </div>

      {/* Retention Modal */}
      <AnimatePresence>
        {showRetentionModal && (
          <RetentionModal
            onAccept={handleAcceptOffer}
            onDecline={handleDeclineAndContinue}
            onClose={handleCloseModal}
            loading={retentionLoading}
            accepted={retentionAccepted}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
