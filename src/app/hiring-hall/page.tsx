'use client';

import React from 'react';
import { getFoundingCheckoutUrl } from '@/lib/stripe';

export default function HiringHall() {
  const handleEnrollment = () => {
    const url = getFoundingCheckoutUrl();
    window.location.href = url;
  };

  return (
    <div className="bg-black text-green-500 font-mono min-h-screen p-4 md:p-8 flex flex-col items-center justify-center">
      <div className="max-w-4xl w-full border-2 border-green-500 p-6 md:p-10 shadow-[0_0_30px_rgba(34,197,94,0.3)] bg-black/80 backdrop-blur-sm">
        <div className="mb-8 border-b border-green-900 pb-4">
          <p className="text-xs opacity-70 mb-1 font-mono uppercase tracking-tighter text-green-700">UNAUTHORIZED ACCESS DETECTED - GRAVITY CLAW PROTOCOL</p>
          <h1 className="text-xl md:text-3xl font-bold tracking-tighter">EMPLOYEE_ZERO // HIRING_HALL</h1>
          <p className="text-[10px] opacity-40 mt-1 uppercase">EST. 2026.03.23.11.34 // SITE_ID: ELITE-001</p>
        </div>
        
        <div className="space-y-8">
          <div className="font-mono space-y-2">
            <div className="flex gap-2 text-sm">
              <span className="text-blue-400">root@terminal:</span>
              <span className="text-white">~</span>$ list --active-recruitment
            </div>
            <div className="mt-4 border border-green-500/30 p-5 bg-green-500/5 relative overflow-hidden group text-green-400">
              <div className="absolute top-0 right-0 p-1 bg-green-500 text-black text-[8px] font-bold px-2">LIVE</div>
              <p className="font-bold mb-2 tracking-wide text-green-300">&gt; FOUNDING 100 [COHORT_ALPHA]</p>
              <p className="text-sm leading-relaxed mb-6 opacity-80">
                Strategic operational layer. Access to restricted Gravity Claw automation pipelines, 
                viral arbitrage discovery, and low-latency execution nodes. 
              </p>
              <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-t border-green-500/20 pt-4">
                <div>
                  <p className="text-3xl font-bold text-white tracking-tight">$29.00 <span className="text-xs font-normal opacity-50">/ month</span></p>
                  <p className="text-[9px] uppercase tracking-[0.3em] text-green-600 font-bold mt-1">LIFETIME_FIXED_RATE_LOCKED</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-yellow-500 font-bold uppercase tracking-widest">SLOTS REMAINING: 100/100</p>
                  <div className="flex justify-end gap-1 mt-1">
                    <div className="w-1.5 h-1.5 bg-green-500 animate-pulse"></div>
                    <div className="w-1.5 h-1.5 bg-green-500 animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1.5 h-1.5 bg-green-500 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex gap-2 font-mono text-sm">
              <span className="text-blue-400">root@terminal:</span>
              <span className="text-white">~</span>$ exec join --plan alpha-founding
            </div>
            
            <button 
              onClick={handleEnrollment}
              className="w-full bg-green-500 hover:bg-green-400 text-black py-4 font-bold transition-all transform hover:translate-y-[-2px] active:translate-y-[1px] shadow-[0_0_20px_rgba(34,197,94,0.4)] uppercase tracking-[0.25em] text-sm"
            >
              INITIALIZE ENROLLMENT
            </button>
            <p className="text-center text-[9px] opacity-40 uppercase tracking-widest">
              Secured via Stripe Protocol // 256-bit AES Encryption
            </p>
          </div>
        </div>
        
        <div className="mt-12 flex justify-between items-center text-[8px] opacity-30 font-mono border-t border-green-900 pt-4">
          <span>HOST: GRAVITY-CLAW-MAIN</span>
          <span className="animate-pulse">CONNECTED</span>
          <span>V.3.0.0-PROD</span>
        </div>
      </div>
    </div>
  );
}
