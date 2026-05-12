"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, limit } from "firebase/firestore";
import { Search, MessageSquare, X, Clock, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface SearchResult {
  id: string;
  title: string;
  preview: string;
  createdAt: any;
  matchType: "title" | "message";
}

interface SearchModalProps {
  userId: string;
  onClose: () => void;
  onSelect: (conversationId: string) => void;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-amber-400/20 text-amber-300 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export function ConversationSearchModal({ userId, onClose, onSelect }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Search Firestore
  const doSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const term = q.toLowerCase().trim();
        const snap = await getDocs(
          query(
            collection(db, "conversations"),
            where("userId", "==", userId),
            orderBy("createdAt", "desc"),
            limit(40)
          )
        );
        const all: SearchResult[] = [];
        snap.forEach((doc) => {
          const d = doc.data();
          const titleMatch = (d.title || "").toLowerCase().includes(term);
          const messages: any[] = d.messages || [];
          const msgMatch = messages.find((m) =>
            (m.content || "").toLowerCase().includes(term)
          );

          if (titleMatch) {
            all.push({
              id: doc.id,
              title: d.title || "Untitled",
              preview: messages[messages.length - 1]?.content?.slice(0, 120) || "",
              createdAt: d.createdAt,
              matchType: "title",
            });
          } else if (msgMatch) {
            all.push({
              id: doc.id,
              title: d.title || "Untitled",
              preview: msgMatch.content.slice(0, 120),
              createdAt: d.createdAt,
              matchType: "message",
            });
          }
        });
        setResults(all.slice(0, 12));
        setSelectedIndex(0);
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => doSearch(searchQuery), 250);
    return () => clearTimeout(t);
  }, [searchQuery, doSearch]);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        onSelect(results[selectedIndex].id);
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [results, selectedIndex, onClose, onSelect]);

  function formatDate(ts: any) {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diff < 604800000) return date.toLocaleDateString([], { weekday: "short" });
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -8 }}
        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-[#111111] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10">
          {loading ? (
            <Loader2 size={16} className="animate-spin text-neutral-500 flex-shrink-0" />
          ) : (
            <Search size={16} className="text-neutral-500 flex-shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="flex-1 bg-transparent text-white placeholder:text-neutral-600 text-sm focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-neutral-600 hover:text-neutral-400 transition-colors"
            >
              <X size={14} />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-1 text-[10px] text-neutral-600 font-mono border border-white/10 rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {results.length > 0 ? (
            <div className="p-2">
              {results.map((result, i) => (
                <button
                  key={result.id}
                  onClick={() => { onSelect(result.id); onClose(); }}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`w-full text-left flex items-start gap-3 px-3 py-3 rounded-xl transition-all ${
                    i === selectedIndex
                      ? "bg-white/[0.07]"
                      : "hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MessageSquare size={12} className="text-neutral-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-white truncate">
                        {highlightMatch(result.title, searchQuery)}
                      </p>
                      <div className="flex items-center gap-1.5 flex-shrink-0 text-[10px] text-neutral-600">
                        <Clock size={10} />
                        {formatDate(result.createdAt)}
                      </div>
                    </div>
                    {result.preview && (
                      <p className="text-xs text-neutral-500 mt-0.5 truncate">
                        {result.matchType === "message"
                          ? highlightMatch(result.preview, searchQuery)
                          : result.preview}
                      </p>
                    )}
                    {result.matchType === "message" && (
                      <span className="inline-block mt-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
                        Found in message
                      </span>
                    )}
                  </div>
                  {i === selectedIndex && (
                    <kbd className="flex-shrink-0 mt-1 text-[9px] text-neutral-600 font-mono border border-white/10 rounded px-1 py-0.5">
                      ↵
                    </kbd>
                  )}
                </button>
              ))}
            </div>
          ) : searchQuery.trim() ? (
            <div className="py-10 text-center text-neutral-600 text-sm">
              No conversations found for <strong className="text-neutral-500">"{searchQuery}"</strong>
            </div>
          ) : (
            <div className="py-8 text-center text-neutral-600 text-xs">
              Start typing to search your conversation history
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2.5 border-t border-white/5 flex items-center gap-4 text-[10px] text-neutral-700">
          <span><kbd className="font-mono">↑↓</kbd> Navigate</span>
          <span><kbd className="font-mono">↵</kbd> Open</span>
          <span><kbd className="font-mono">ESC</kbd> Close</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
