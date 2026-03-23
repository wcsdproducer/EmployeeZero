"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { LayoutDashboard, Users, Settings, LogOut } from "lucide-react";
import { signOut } from "@/lib/firebase";

export function Navbar() {
  const { user } = useAuth();

  return (
    <nav className="h-16 border-b border-neutral-100 bg-white/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-6">
      <div className="flex items-center gap-8">
        <Link href="/" className="font-bold text-lg tracking-tighter">Zero</Link>
        <div className="hidden md:flex items-center gap-6">
          <Link href="/chat" className="text-sm text-neutral-500 hover:text-black transition-colors">Chat</Link>
          <Link href="/specialists" className="text-sm text-neutral-500 hover:text-black transition-colors">Specialists</Link>
          <Link href="/settings" className="text-sm text-neutral-500 hover:text-black transition-colors">Settings</Link>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3">
             <span className="text-xs text-neutral-400 font-mono hidden sm:inline">{user.email}</span>
             <button onClick={() => signOut()} className="p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-400 hover:text-red-500">
               <LogOut size={16} />
             </button>
          </div>
        ) : (
          <Link href="/login" className="text-sm font-medium">Sign In</Link>
        )}
      </div>
    </nav>
  );
}
