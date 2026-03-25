"use client";

import { motion } from "framer-motion";

export function RobotVisual() {
  return (
    <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center animate-float">
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-white/5 blur-3xl rounded-full" />
      
      {/* Robot Head */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="relative z-10 w-48 h-48 md:w-56 md:h-56 bg-[#050505] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center"
      >
        {/* Minimalist Face */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-10">
            <motion.div 
              animate={{ height: [4, 12, 4] }}
              transition={{ repeat: Infinity, duration: 4, times: [0, 0.5, 1] }}
              className="w-1 bg-white/60 rounded-full" 
            />
            <motion.div 
              animate={{ height: [4, 12, 4] }}
              transition={{ repeat: Infinity, duration: 4, times: [0, 0.5, 1], delay: 0.2 }}
              className="w-1 bg-white/60 rounded-full" 
            />
          </div>
          <div className="w-16 h-px bg-white/10" />
        </div>

        {/* Scan Line */}
        <motion.div 
          animate={{ top: ["-100%", "200%"] }}
          transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
          className="absolute left-0 right-0 h-20 bg-gradient-to-b from-transparent via-white/5 to-transparent z-0 pointer-events-none"
        />
      </motion.div>

      {/* Decorative Orbits */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
        className="absolute inset-0 border border-white/5 rounded-full"
      />
      <motion.div 
        animate={{ rotate: -360 }}
        transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
        className="absolute inset-8 border border-white/5 rounded-full"
      />
    </div>
  );
}
