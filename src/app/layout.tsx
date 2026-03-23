import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { LayoutDashboard, Users, Settings, Briefcase, Bell, Search, User } from "lucide-react";

export const metadata: Metadata = {
  title: "Employee Zero | Digital Office",
  description: "Your AI-powered digital office.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-gray-50">
      <body className="h-full">
        <div className="min-h-full flex">
          {/* Sidebar */}
          <aside className="w-64 bg-slate-900 text-white flex flex-col fixed inset-y-0">
            <div className="p-6 border-b border-slate-800 flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl">
                0
              </div>
              <span className="font-bold tracking-tight text-lg">Employee Zero</span>
            </div>
            
            <nav className="flex-1 p-4 space-y-2 mt-4">
              <Link 
                href="/dashboard" 
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <LayoutDashboard size={20} className="text-slate-400" />
                <span className="font-medium">Dashboard</span>
              </Link>
              <Link 
                href="/specialists" 
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Users size={20} className="text-slate-400" />
                <span className="font-medium">Specialists</span>
              </Link>
              <Link 
                href="/settings" 
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Settings size={20} className="text-slate-400" />
                <span className="font-medium">Settings</span>
              </Link>
            </nav>

            <div className="p-4 border-t border-slate-800">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                  <User size={16} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium truncate">Founder</p>
                  <p className="text-xs text-slate-400 truncate">Early Access</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 ml-64 flex flex-col">
            {/* Top Header */}
            <header className="h-16 bg-white border-b flex items-center justify-between px-8 sticky top-0 z-10">
              <div className="flex items-center gap-4 bg-gray-100 px-3 py-1.5 rounded-md w-96">
                <Search size={16} className="text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search tasks, missions, or files..." 
                  className="bg-transparent border-none text-sm focus:outline-none w-full"
                />
              </div>
              
              <div className="flex items-center gap-4">
                <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors relative">
                  <Bell size={20} />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>
                <div className="h-8 w-px bg-gray-200 mx-2"></div>
                <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  <Briefcase size={16} />
                  <span>New Mission</span>
                </button>
              </div>
            </header>

            {/* Page Content */}
            <div className="flex-1 p-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
